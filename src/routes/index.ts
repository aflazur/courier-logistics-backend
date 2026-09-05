import { Router } from 'express';
import { AuthRoutes } from '../modules/auth/auth.routes';
import { UserRoutes } from '../modules/user/user.routes';
import { ShipmentRoutes } from '../modules/shipment/shipment.routes';
import { HubRoutes } from '../modules/hub/hub.routes';
import { CourierRoutes } from '../modules/courier/courier.routes';
import { PaymentRoutes } from '../modules/payment/payment.routes';
import { AdminRoutes } from '../modules/admin/admin.routes';

const router = Router();

const moduleRoutes = [
  { path: '/auth', route: AuthRoutes },
  { path: '/users', route: UserRoutes },
  { path: '/shipments', route: ShipmentRoutes },
  { path: '/hubs', route: HubRoutes },
  { path: '/couriers', route: CourierRoutes },
  { path: '/payments', route: PaymentRoutes },
  { path: '/admin', route: AdminRoutes },
];

moduleRoutes.forEach(({ path, route }) => router.use(path, route));

export default router;
