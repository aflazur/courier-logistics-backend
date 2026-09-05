import { Router } from 'express';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { PaymentValidation } from './payment.validation';
import { PaymentController } from './payment.controller';

const router = Router();

router.post(
  '/initiate',
  auth('CUSTOMER'),
  validateRequest(PaymentValidation.initiatePaymentSchema),
  PaymentController.initiatePayment,
);

// Gateway callbacks are hit by SSLCommerz's server / the customer's browser, not by a
// logged-in API client - no auth() here, but every one of them re-validates with SSLCommerz
// server-side before trusting the result (see payment.service.ts).
router.post(
  '/webhook',
  validateRequest(PaymentValidation.gatewayCallbackSchema),
  PaymentController.handleWebhook,
);
router.post(
  '/success',
  validateRequest(PaymentValidation.gatewayCallbackSchema),
  PaymentController.handleSuccess,
);
router.post(
  '/fail',
  validateRequest(PaymentValidation.gatewayCallbackSchema),
  PaymentController.handleFail,
);
router.post(
  '/cancel',
  validateRequest(PaymentValidation.gatewayCallbackSchema),
  PaymentController.handleCancel,
);

router.get('/:shipmentId', auth('CUSTOMER', 'ADMIN'), PaymentController.getPaymentByShipment);

export const PaymentRoutes = router;
