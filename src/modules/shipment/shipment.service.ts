import { Prisma, ShipmentStatus } from '@prisma/client';
import httpStatus from 'http-status';
import prisma from '../../config/prisma';
import ApiError from '../../utils/ApiError';
import { isTransitionAllowed } from './shipment.stateMachine';
import { cacheGet, cacheSet, cacheInvalidate } from '../../config/redis';
import { NotificationService } from '../notification/notification.service';

const BASE_FEE = 60; // BDT flat base fee
const PER_KG_RATE = 25; // BDT per kg
const COURIER_EARNING_SHARE = 0.7; // courier keeps 70% of the delivery fee per completed delivery

const calculateDeliveryFee = (weightKg: number) => BASE_FEE + weightKg * PER_KG_RATE;

const generateTrackingCode = () => {
  const year = new Date().getFullYear();
  const random = Math.floor(100000 + Math.random() * 900000);
  return `CRX-${year}-${random}`;
};

const shipmentCacheKey = (id: string) => `shipment:${id}`;

type CreateShipmentInput = {
  senderId: string;
  recipientName: string;
  recipientPhone: string;
  pickupAddress: string;
  deliveryAddress: string;
  weightKg: number;
  parcelType?: string;
  declaredValue?: number;
  originHubId?: string;
  destinationHubId?: string;
};

const createShipment = async (input: CreateShipmentInput) => {
  const deliveryFee = calculateDeliveryFee(input.weightKg);

  // Transaction: create shipment + its first status-history row atomically
  const shipment = await prisma.$transaction(async (tx) => {
    const created = await tx.shipment.create({
      data: {
        trackingCode: generateTrackingCode(),
        senderId: input.senderId,
        recipientName: input.recipientName,
        recipientPhone: input.recipientPhone,
        pickupAddress: input.pickupAddress,
        deliveryAddress: input.deliveryAddress,
        weightKg: input.weightKg,
        parcelType: input.parcelType ?? 'PACKAGE',
        declaredValue: input.declaredValue ?? 0,
        deliveryFee,
        originHubId: input.originHubId,
        destinationHubId: input.destinationHubId,
        status: 'PENDING',
      },
    });

    await tx.shipmentStatusHistory.create({
      data: {
        shipmentId: created.id,
        toStatus: 'PENDING',
        changedBy: input.senderId,
        note: 'Shipment created',
      },
    });

    return created;
  });

  return shipment;
};

type ListFilters = {
  page?: number;
  limit?: number;
  status?: ShipmentStatus;
  search?: string; // matches tracking code or recipient name
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  dateFrom?: string; // created on/after this date (YYYY-MM-DD)
  dateTo?: string; // created on/before this date, inclusive
  senderId?: string; // restrict to a customer's own shipments
  courierProfileId?: string; // restrict to a courier's assigned shipments
};

const listShipments = async (filters: ListFilters) => {
  const page = filters.page && filters.page > 0 ? filters.page : 1;
  const limit = filters.limit && filters.limit > 0 ? filters.limit : 10;
  const skip = (page - 1) * limit;

  const where: Prisma.ShipmentWhereInput = { deletedAt: null };

  if (filters.status) where.status = filters.status;
  if (filters.senderId) where.senderId = filters.senderId;
  if (filters.courierProfileId) where.courierId = filters.courierProfileId;
  if (filters.search) {
    where.OR = [
      { trackingCode: { contains: filters.search, mode: 'insensitive' } },
      { recipientName: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  const createdAt: Prisma.DateTimeFilter = {};
  if (filters.dateFrom) {
    const from = new Date(`${filters.dateFrom}T00:00:00.000Z`);
    if (!Number.isNaN(from.getTime())) createdAt.gte = from;
  }
  if (filters.dateTo) {
    const to = new Date(`${filters.dateTo}T23:59:59.999Z`);
    if (!Number.isNaN(to.getTime())) createdAt.lte = to;
  }
  if (createdAt.gte || createdAt.lte) where.createdAt = createdAt;

  const orderBy = { [filters.sortBy || 'createdAt']: filters.sortOrder || 'desc' };

  const [data, total] = await prisma.$transaction([
    prisma.shipment.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      include: {
        sender: { select: { id: true, name: true, email: true } },
        courier: { select: { id: true, userId: true } },
        originHub: true,
        destinationHub: true,
        payment: true,
      },
    }),
    prisma.shipment.count({ where }),
  ]);

  return {
    data,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

// Cached read - shipment detail pages are read far more often than they're written,
// so this is the highest-value place to cache. Invalidated on every write below.
const getShipmentById = async (id: string) => {
  const cached = await cacheGet<Awaited<ReturnType<typeof fetchShipmentById>>>(
    shipmentCacheKey(id),
  );
  if (cached) return cached;

  const shipment = await fetchShipmentById(id);
  await cacheSet(shipmentCacheKey(id), shipment, 30); // short TTL - status changes frequently
  return shipment;
};

const fetchShipmentById = async (id: string) => {
  const shipment = await prisma.shipment.findFirst({
    where: { id, deletedAt: null },
    include: {
      sender: { select: { id: true, name: true, email: true, phone: true } },
      courier: {
        include: { user: { select: { id: true, name: true, phone: true, email: true } } },
      },
      originHub: true,
      destinationHub: true,
      statusHistory: { orderBy: { createdAt: 'asc' } },
      payment: true,
    },
  });
  if (!shipment) throw new ApiError(httpStatus.NOT_FOUND, 'Shipment not found');
  return shipment;
};

// Assign a courier - transaction-safe to avoid double-assignment race conditions
const assignCourier = async (shipmentId: string, courierProfileId: string) => {
  const updated = await prisma.$transaction(async (tx) => {
    const shipment = await tx.shipment.findFirst({ where: { id: shipmentId, deletedAt: null } });
    if (!shipment) throw new ApiError(httpStatus.NOT_FOUND, 'Shipment not found');
    if (shipment.courierId) {
      throw new ApiError(httpStatus.CONFLICT, 'Shipment already has a courier assigned');
    }

    const courier = await tx.courierProfile.findFirst({
      where: { id: courierProfileId, deletedAt: null },
      include: { user: true },
    });
    if (!courier) throw new ApiError(httpStatus.NOT_FOUND, 'Courier not found');
    if (!courier.isAvailable) {
      throw new ApiError(httpStatus.CONFLICT, 'Courier is not currently available');
    }

    const result = await tx.shipment.update({
      where: { id: shipmentId },
      data: { courierId: courierProfileId, status: 'PICKUP_SCHEDULED' },
    });

    await tx.shipmentStatusHistory.create({
      data: {
        shipmentId,
        fromStatus: shipment.status,
        toStatus: 'PICKUP_SCHEDULED',
        changedBy: courierProfileId,
        note: 'Courier assigned',
      },
    });

    // Mark courier as busy once they have an active shipment
    await tx.courierProfile.update({
      where: { id: courierProfileId },
      data: { isAvailable: false },
    });

    return { result, courierEmail: courier.user.email, courierName: courier.user.name };
  });

  await cacheInvalidate(shipmentCacheKey(shipmentId));

  // Best-effort notification - never blocks or fails the assignment itself
  NotificationService.notifyCourierAssigned(
    updated.courierEmail,
    updated.courierName,
    updated.result.trackingCode,
    updated.result.pickupAddress,
  );

  return updated.result;
};

const updateStatus = async (
  shipmentId: string,
  toStatus: ShipmentStatus,
  actorId: string,
  note?: string,
) => {
  const { updated, sender } = await prisma.$transaction(async (tx) => {
    const shipment = await tx.shipment.findFirst({
      where: { id: shipmentId, deletedAt: null },
      include: { sender: true },
    });
    if (!shipment) throw new ApiError(httpStatus.NOT_FOUND, 'Shipment not found');

    if (!isTransitionAllowed(shipment.status, toStatus)) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        `Cannot transition shipment from ${shipment.status} to ${toStatus}`,
      );
    }

    const result = await tx.shipment.update({
      where: { id: shipmentId },
      data: { status: toStatus },
    });

    await tx.shipmentStatusHistory.create({
      data: { shipmentId, fromStatus: shipment.status, toStatus, changedBy: actorId, note },
    });

    // Free up the courier once a shipment reaches a terminal state, and pay out
    // their earnings share if the delivery actually succeeded.
    if (['DELIVERED', 'RETURNED', 'CANCELLED'].includes(toStatus) && shipment.courierId) {
      await tx.courierProfile.update({
        where: { id: shipment.courierId },
        data: {
          isAvailable: true,
          ...(toStatus === 'DELIVERED'
            ? { totalEarnings: { increment: Number(shipment.deliveryFee) * COURIER_EARNING_SHARE } }
            : {}),
        },
      });
    }

    await tx.auditLog.create({
      data: {
        actorId,
        action: 'SHIPMENT_STATUS_UPDATED',
        entityType: 'Shipment',
        entityId: shipmentId,
        details: { from: shipment.status, to: toStatus, note },
      },
    });

    return { updated: result, sender: shipment.sender, deliveryFee: shipment.deliveryFee };
  });

  await cacheInvalidate(shipmentCacheKey(shipmentId));

  NotificationService.notifyShipmentStatusChange(
    sender.email,
    sender.name,
    updated.trackingCode,
    toStatus,
    note,
  );

  return updated;
};

const cancelShipment = async (shipmentId: string, actorId: string) => {
  return updateStatus(shipmentId, 'CANCELLED', actorId, 'Cancelled by user');
};

// Soft delete
const softDeleteShipment = async (shipmentId: string) => {
  const shipment = await prisma.shipment.findFirst({ where: { id: shipmentId, deletedAt: null } });
  if (!shipment) throw new ApiError(httpStatus.NOT_FOUND, 'Shipment not found');

  const result = await prisma.shipment.update({
    where: { id: shipmentId },
    data: { deletedAt: new Date() },
  });
  await cacheInvalidate(shipmentCacheKey(shipmentId));
  return result;
};

// Resolves the calling courier's User id -> their CourierProfile id, then reuses listShipments
// scoped to that profile. Kept separate from listShipments' senderId path since a courier's
// User id and CourierProfile id are different records entirely.
const listMyAssignedShipments = async (
  userId: string,
  filters: Omit<ListFilters, 'senderId' | 'courierProfileId'>,
) => {
  const courierProfile = await prisma.courierProfile.findFirst({
    where: { userId, deletedAt: null },
  });
  if (!courierProfile) throw new ApiError(httpStatus.NOT_FOUND, 'Courier profile not found');

  return listShipments({ ...filters, courierProfileId: courierProfile.id });
};

export const ShipmentService = {
  createShipment,
  listShipments,
  listMyAssignedShipments,
  getShipmentById,
  assignCourier,
  updateStatus,
  cancelShipment,
  softDeleteShipment,
  calculateDeliveryFee,
};
