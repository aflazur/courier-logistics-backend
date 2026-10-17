import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { ShipmentService } from './shipment.service';
import { ShipmentStatus } from '@prisma/client';

const createShipment = catchAsync(async (req, res) => {
  const shipment = await ShipmentService.createShipment({
    senderId: req.user!.userId,
    ...req.body,
  });
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Shipment created successfully',
    data: shipment,
  });
});

// GET /shipments -> admin/hub view (all shipments, filterable)
// GET /shipments/my-shipments -> customer's own
// GET /shipments/my-assigned -> courier's assigned shipments
const listShipments = catchAsync(async (req, res) => {
  const { page, limit, status, search, sortBy, sortOrder, dateFrom, dateTo } = req.query;

  const result = await ShipmentService.listShipments({
    page: page ? Number(page) : undefined,
    limit: limit ? Number(limit) : undefined,
    status: status as ShipmentStatus | undefined,
    search: search as string | undefined,
    sortBy: sortBy as string | undefined,
    sortOrder: sortOrder as 'asc' | 'desc' | undefined,
    dateFrom: dateFrom as string | undefined,
    dateTo: dateTo as string | undefined,
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Shipments retrieved successfully',
    meta: result.meta,
    data: result.data,
  });
});

const myShipments = catchAsync(async (req, res) => {
  const { page, limit, status, search, sortBy, sortOrder, dateFrom, dateTo } = req.query;
  const result = await ShipmentService.listShipments({
    page: page ? Number(page) : undefined,
    limit: limit ? Number(limit) : undefined,
    status: status as ShipmentStatus | undefined,
    search: search as string | undefined,
    sortBy: sortBy as string | undefined,
    sortOrder: sortOrder as 'asc' | 'desc' | undefined,
    dateFrom: dateFrom as string | undefined,
    dateTo: dateTo as string | undefined,
    senderId: req.user!.userId,
  });
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Your shipments retrieved successfully',
    meta: result.meta,
    data: result.data,
  });
});

// Distinct from myShipments: a courier's User id is not their CourierProfile id, so this
// resolves userId -> courierProfile.id first, then filters shipments by that.
const myAssignedShipments = catchAsync(async (req, res) => {
  const { page, limit, status, search, sortBy, sortOrder, dateFrom, dateTo } = req.query;
  const result = await ShipmentService.listMyAssignedShipments(req.user!.userId, {
    page: page ? Number(page) : undefined,
    limit: limit ? Number(limit) : undefined,
    status: status as ShipmentStatus | undefined,
    search: search as string | undefined,
    sortBy: sortBy as string | undefined,
    sortOrder: sortOrder as 'asc' | 'desc' | undefined,
    dateFrom: dateFrom as string | undefined,
    dateTo: dateTo as string | undefined,
  });
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Your assigned shipments retrieved successfully',
    meta: result.meta,
    data: result.data,
  });
});

const getShipment = catchAsync(async (req, res) => {
  const shipment = await ShipmentService.getShipmentById(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Shipment retrieved successfully',
    data: shipment,
  });
});

const assignCourier = catchAsync(async (req, res) => {
  const updated = await ShipmentService.assignCourier(req.params.id, req.body.courierProfileId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Courier assigned successfully',
    data: updated,
  });
});

const updateStatus = catchAsync(async (req, res) => {
  const updated = await ShipmentService.updateStatus(
    req.params.id,
    req.body.status,
    req.user!.userId,
    req.body.note,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Shipment status updated',
    data: updated,
  });
});

const cancelShipment = catchAsync(async (req, res) => {
  const updated = await ShipmentService.cancelShipment(req.params.id, req.user!.userId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Shipment cancelled',
    data: updated,
  });
});

const deleteShipment = catchAsync(async (req, res) => {
  await ShipmentService.softDeleteShipment(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Shipment deleted successfully',
    data: null,
  });
});

export const ShipmentController = {
  createShipment,
  listShipments,
  myShipments,
  myAssignedShipments,
  getShipment,
  assignCourier,
  updateStatus,
  cancelShipment,
  deleteShipment,
};
