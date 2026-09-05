import { Router } from 'express';
import passport from 'passport';
import validateRequest from '../../middlewares/validateRequest';
import { AuthValidation } from './auth.validation';
import { AuthController } from './auth.controller';
import auth from '../../middlewares/auth';

const router = Router();

router.post('/register', validateRequest(AuthValidation.registerSchema), AuthController.register);
router.post('/login', validateRequest(AuthValidation.loginSchema), AuthController.login);
router.post(
  '/refresh-token',
  validateRequest(AuthValidation.refreshTokenSchema),
  AuthController.refreshToken,
);
router.post('/logout', auth(), AuthController.logout);

// GCP Social Login (see src/config/passport.ts for the strategy/find-or-create logic).
// GET /auth/google           -> redirects the browser to Google's consent screen
// GET /auth/google/callback  -> Google redirects back here; passport attaches the
//                               found-or-created user to req.user, then we issue the
//                               same access/refresh token pair as email/password login.
router.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'], session: false }),
);
router.get('/google/callback', AuthController.googleCallback);

export const AuthRoutes = router;
