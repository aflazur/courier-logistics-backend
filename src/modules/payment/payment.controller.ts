import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { PaymentService } from './payment.service';

const initiatePayment = catchAsync(async (req, res) => {
  const result = await PaymentService.initiatePayment(
    req.body.shipmentId,
    req.user!.email,
    req.body.phone ?? '01700000000',
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Payment session created successfully',
    data: result,
  });
});

// SSLCommerz IPN listener - the source of truth for payment status.
const handleWebhook = catchAsync(async (req, res) => {
  const { val_id, tran_id } = req.body;
  const payment = await PaymentService.verifyAndUpdatePayment(val_id, tran_id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Payment IPN processed',
    data: payment,
  });
});

// Browser redirect after a successful checkout. We still re-verify server-side here too,
// since a user can be redirected without the IPN having landed yet.
const handleSuccess = catchAsync(async (req, res) => {
  const { val_id, tran_id } = req.body;
  const payment = await PaymentService.verifyAndUpdatePayment(val_id, tran_id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Payment successful',
    data: payment,
  });
});

const handleFail = catchAsync(async (req, res) => {
  const payment = await PaymentService.markCancelledOrFailed(req.body.tran_id, 'FAILED');
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: false,
    message: 'Payment failed',
    data: payment,
  });
});

const handleCancel = catchAsync(async (req, res) => {
  const payment = await PaymentService.markCancelledOrFailed(req.body.tran_id, 'CANCELLED');
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: false,
    message: 'Payment cancelled',
    data: payment,
  });
});

const getPaymentByShipment = catchAsync(async (req, res) => {
  const payment = await PaymentService.getPaymentByShipment(req.params.shipmentId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Payment retrieved successfully',
    data: payment,
  });
});

export const PaymentController = {
  initiatePayment,
  handleWebhook,
  handleSuccess,
  handleFail,
  handleCancel,
  getPaymentByShipment,
};
