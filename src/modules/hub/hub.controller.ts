import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { HubService } from './hub.service';

const createHub = catchAsync(async (req, res) => {
  const hub = await HubService.createHub(req.body);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Hub created successfully',
    data: hub,
  });
});

const listHubs = catchAsync(async (req, res) => {
  const hubs = await HubService.listHubs(req.query.city as string | undefined);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Hubs retrieved successfully',
    data: hubs,
  });
});

const getHub = catchAsync(async (req, res) => {
  const hub = await HubService.getHub(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Hub retrieved successfully',
    data: hub,
  });
});

const updateHub = catchAsync(async (req, res) => {
  const hub = await HubService.updateHub(req.params.id, req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Hub updated successfully',
    data: hub,
  });
});

const deleteHub = catchAsync(async (req, res) => {
  await HubService.deleteHub(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Hub deleted successfully',
    data: null,
  });
});

export const HubController = { createHub, listHubs, getHub, updateHub, deleteHub };
