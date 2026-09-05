import httpStatus from 'http-status';
import { Role } from '@prisma/client';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { AdminService } from './admin.service';

const listUsers = catchAsync(async (req, res) => {
  const { page, limit, role, search } = req.query;
  const result = await AdminService.listUsers({
    page: page ? Number(page) : undefined,
    limit: limit ? Number(limit) : undefined,
    role: role as Role | undefined,
    search: search as string | undefined,
  });
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Users retrieved successfully',
    meta: result.meta,
    data: result.data,
  });
});

const changeUserRole = catchAsync(async (req, res) => {
  const updated = await AdminService.changeUserRole(req.params.id, req.body.role, req.user!.userId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'User role updated successfully',
    data: updated,
  });
});

const changeUserStatus = catchAsync(async (req, res) => {
  const updated = await AdminService.changeUserStatus(
    req.params.id,
    req.body.isActive,
    req.user!.userId,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'User status updated successfully',
    data: updated,
  });
});

const getDashboardStats = catchAsync(async (_req, res) => {
  const stats = await AdminService.getDashboardStats();
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Dashboard stats retrieved successfully',
    data: stats,
  });
});

const listAuditLogs = catchAsync(async (req, res) => {
  const page = req.query.page ? Number(req.query.page) : undefined;
  const limit = req.query.limit ? Number(req.query.limit) : undefined;
  const result = await AdminService.listAuditLogs(page, limit);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Audit logs retrieved successfully',
    meta: result.meta,
    data: result.data,
  });
});

export const AdminController = {
  listUsers,
  changeUserRole,
  changeUserStatus,
  getDashboardStats,
  listAuditLogs,
};
