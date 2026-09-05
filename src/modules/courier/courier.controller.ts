import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { CourierService } from './courier.service';

const getMyProfile = catchAsync(async (req, res) => {
  const profile = await CourierService.getMyProfile(req.user!.userId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Courier profile retrieved successfully',
    data: profile,
  });
});

const updateMyProfile = catchAsync(async (req, res) => {
  const profile = await CourierService.updateMyProfile(req.user!.userId, req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Courier profile updated successfully',
    data: profile,
  });
});

const listCouriers = catchAsync(async (req, res) => {
  const { page, limit, isAvailable } = req.query;
  const result = await CourierService.listCouriers({
    page: page ? Number(page) : undefined,
    limit: limit ? Number(limit) : undefined,
    isAvailable: isAvailable !== undefined ? isAvailable === 'true' : undefined,
  });
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Couriers retrieved successfully',
    meta: result.meta,
    data: result.data,
  });
});

export const CourierController = { getMyProfile, updateMyProfile, listCouriers };
