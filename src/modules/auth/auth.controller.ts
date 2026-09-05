import passport from 'passport';
import httpStatus from 'http-status';
import { Request, Response, NextFunction } from 'express';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { AuthService } from './auth.service';

const register = catchAsync(async (req, res) => {
  const result = await AuthService.register(req.body);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Registration successful',
    data: result,
  });
});

const login = catchAsync(async (req, res) => {
  const { email, password } = req.body;
  const result = await AuthService.login(email, password);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Login successful',
    data: result,
  });
});

const refreshToken = catchAsync(async (req, res) => {
  const result = await AuthService.refreshAccessToken(req.body.refreshToken);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Access token refreshed',
    data: result,
  });
});

const logout = catchAsync(async (req, res) => {
  await AuthService.logout(req.user!.userId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Logged out successfully',
    data: null,
  });
});

// Deliberately NOT built as `passport.authenticate(...) -> next middleware reading req.user`.
// Our JWT middleware (middlewares/auth.ts) already types `req.user` as { userId, email, role }
// for authenticated API requests; Passport's own type declarations type `req.user` differently.
// Using passport's custom-callback form sidesteps that clash entirely - the found-or-created
// User comes in as a plain callback argument, never touching `req.user`'s type.
const googleCallback = (req: Request, res: Response, next: NextFunction) => {
  passport.authenticate(
    'google',
    { session: false },
    async (_err: unknown, user: { id: string; email: string; role: string } | false) => {
      try {
        if (!user) {
          return res.status(httpStatus.UNAUTHORIZED).json({
            success: false,
            message: 'Google authentication failed',
            errors: [],
          });
        }

        const tokens = await AuthService.issueTokensForUser(user);

        // A real frontend would redirect here instead, e.g.
        // res.redirect(`${FRONTEND_URL}/oauth/callback?accessToken=...&refreshToken=...`)
        sendResponse(res, {
          statusCode: httpStatus.OK,
          success: true,
          message: 'Google login successful',
          data: tokens,
        });
      } catch (err) {
        next(err);
      }
    },
  )(req, res, next);
};

export const AuthController = { register, login, refreshToken, logout, googleCallback };
