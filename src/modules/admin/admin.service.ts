import { Role } from '@prisma/client';
import httpStatus from 'http-status';
import prisma from '../../config/prisma';
import ApiError from '../../utils/ApiError';

type ListUsersFilters = { page?: number; limit?: number; role?: Role; search?: string };

const listUsers = async (filters: ListUsersFilters) => {
  const page = filters.page && filters.page > 0 ? filters.page : 1;
  const limit = filters.limit && filters.limit > 0 ? filters.limit : 10;

  const where = {
    deletedAt: null,
    ...(filters.role ? { role: filters.role } : {}),
    ...(filters.search
      ? {
          OR: [
            { name: { contains: filters.search, mode: 'insensitive' as const } },
            { email: { contains: filters.search, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  };

  const [data, total] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.count({ where }),
  ]);

  return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
};

const changeUserRole = async (targetUserId: string, newRole: Role, actorId: string) => {
  const target = await prisma.user.findFirst({ where: { id: targetUserId, deletedAt: null } });
  if (!target) throw new ApiError(httpStatus.NOT_FOUND, 'User not found');

  return prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({ where: { id: targetUserId }, data: { role: newRole } });

    await tx.auditLog.create({
      data: {
        actorId,
        action: 'USER_ROLE_CHANGED',
        entityType: 'User',
        entityId: target.id,
        details: { from: target.role, to: newRole },
      },
    });

    return updated;
  });
};

const changeUserStatus = async (targetUserId: string, isActive: boolean, actorId: string) => {
  const target = await prisma.user.findFirst({ where: { id: targetUserId, deletedAt: null } });
  if (!target) throw new ApiError(httpStatus.NOT_FOUND, 'User not found');

  return prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({ where: { id: targetUserId }, data: { isActive } });

    await tx.auditLog.create({
      data: {
        actorId,
        action: isActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
        entityType: 'User',
        entityId: target.id,
        details: { from: target.isActive, to: isActive },
      },
    });

    return updated;
  });
};

const getDashboardStats = async () => {
  const [totalUsers, totalCouriers, totalShipments, deliveredCount, pendingCount, totalRevenue] =
    await prisma.$transaction([
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.user.count({ where: { role: 'COURIER', deletedAt: null } }),
      prisma.shipment.count({ where: { deletedAt: null } }),
      prisma.shipment.count({ where: { status: 'DELIVERED', deletedAt: null } }),
      prisma.shipment.count({ where: { status: 'PENDING', deletedAt: null } }),
      prisma.payment.aggregate({ where: { status: 'PAID' }, _sum: { amount: true } }),
    ]);

  return {
    totalUsers,
    totalCouriers,
    totalShipments,
    deliveredCount,
    pendingCount,
    totalRevenue: totalRevenue._sum.amount ?? 0,
  };
};

const listAuditLogs = async (page = 1, limit = 20) => {
  const [data, total] = await prisma.$transaction([
    prisma.auditLog.findMany({
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { actor: { select: { id: true, name: true, email: true } } },
    }),
    prisma.auditLog.count(),
  ]);

  return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
};

export const AdminService = {
  listUsers,
  changeUserRole,
  changeUserStatus,
  getDashboardStats,
  listAuditLogs,
};
