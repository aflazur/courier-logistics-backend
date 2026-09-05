import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { UserService } from './user.service';

const getMe = catchAsync(async (req, res) => {
  const user = await UserService.getMe(req.user!.userId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Profile retrieved successfully',
    data: user,
  });
});

const updateMe = catchAsync(async (req, res) => {
  const user = await UserService.updateMe(req.user!.userId, req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Profile updated successfully',
    data: user,
  });
});

export const UserController = { getMe, updateMe };
