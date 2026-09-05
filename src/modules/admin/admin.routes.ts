import { Router } from 'express';
import auth from '../../middlewares/auth';
import validateRequest from '../../middlewares/validateRequest';
import { AdminValidation } from './admin.validation';
import { AdminController } from './admin.controller';

const router = Router();

router.get('/users', auth('ADMIN'), AdminController.listUsers);
router.patch(
  '/users/:id/role',
  auth('ADMIN'),
  validateRequest(AdminValidation.changeRoleSchema),
  AdminController.changeUserRole,
);
router.patch(
  '/users/:id/status',
  auth('ADMIN'),
  validateRequest(AdminValidation.changeStatusSchema),
  AdminController.changeUserStatus,
);
router.get('/dashboard-stats', auth('ADMIN'), AdminController.getDashboardStats);
router.get('/audit-logs', auth('ADMIN'), AdminController.listAuditLogs);

export const AdminRoutes = router;
