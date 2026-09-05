import { Router } from 'express';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { CourierValidation } from './courier.validation';
import { CourierController } from './courier.controller';

const router = Router();

router.get('/me', auth('COURIER'), CourierController.getMyProfile);
router.patch(
  '/me',
  auth('COURIER'),
  validateRequest(CourierValidation.updateProfileSchema),
  CourierController.updateMyProfile,
);
router.get('/', auth('ADMIN'), CourierController.listCouriers);

export const CourierRoutes = router;
