import { Router } from 'express';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { HubValidation } from './hub.validation';
import { HubController } from './hub.controller';

const router = Router();

router.post(
  '/',
  auth('ADMIN'),
  validateRequest(HubValidation.createHubSchema),
  HubController.createHub,
);
router.get('/', HubController.listHubs); // public: customers need to browse hubs/coverage
router.get('/:id', HubController.getHub);
router.patch(
  '/:id',
  auth('ADMIN'),
  validateRequest(HubValidation.updateHubSchema),
  HubController.updateHub,
);
router.delete('/:id', auth('ADMIN'), HubController.deleteHub); // soft delete

export const HubRoutes = router;
