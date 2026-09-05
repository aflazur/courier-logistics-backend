import { Router } from 'express';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { ShipmentValidation } from './shipment.validation';
import { ShipmentController } from './shipment.controller';

const router = Router();

// Customer creates a shipment
router.post(
  '/',
  auth('CUSTOMER'),
  validateRequest(ShipmentValidation.createShipmentSchema),
  ShipmentController.createShipment,
);

// Admin/hub-level view of everything, with pagination + filter + search
router.get('/', auth('ADMIN'), ShipmentController.listShipments);

// Customer's own shipments
router.get('/my-shipments', auth('CUSTOMER'), ShipmentController.myShipments);

// Courier's own assigned shipments - resolves userId -> courierProfile.id internally
router.get('/my-assigned', auth('COURIER'), ShipmentController.myAssignedShipments);

router.get('/:id', auth('CUSTOMER', 'COURIER', 'ADMIN'), ShipmentController.getShipment);

router.patch(
  '/:id/assign',
  auth('ADMIN'),
  validateRequest(ShipmentValidation.assignCourierSchema),
  ShipmentController.assignCourier,
);

router.patch(
  '/:id/status',
  auth('COURIER', 'ADMIN'),
  validateRequest(ShipmentValidation.updateStatusSchema),
  ShipmentController.updateStatus,
);

router.post('/:id/cancel', auth('CUSTOMER', 'ADMIN'), ShipmentController.cancelShipment);

router.delete('/:id', auth('ADMIN'), ShipmentController.deleteShipment); // soft delete

export const ShipmentRoutes = router;
