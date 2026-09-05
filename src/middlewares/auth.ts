import { NextFunction, Request, Response } from 'express';
import httpStatus from 'http-status';
import ApiError from '../utils/ApiError';
import catchAsync from '../utils/catchAsync';
import { verifyAccessToken } from '../utils/jwt';
import prisma from '../config/prisma';

// auth(): just requires a valid token
// auth('ADMIN', 'COURIER'): requires valid token AND one of the given roles
const auth = (...allowedRoles: string[]) => {
  return catchAsync(async (req: Request, _res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new ApiError(httpStatus.UNAUTHORIZED, 'Authentication token missing');
    }

    const token = authHeader.split(' ')[1];

    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch {
      throw new ApiError(httpStatus.UNAUTHORIZED, 'Invalid or expired token');
    }

    // Confirm the user still exists, is active, and not soft-deleted
    const user = await prisma.user.findFirst({
      where: { id: decoded.userId, deletedAt: null },
    });

    if (!user) {
      throw new ApiError(httpStatus.UNAUTHORIZED, 'User no longer exists');
    }
    if (!user.isActive) {
      throw new ApiError(httpStatus.FORBIDDEN, 'This account has been deactivated');
    }

    if (allowedRoles.length && !allowedRoles.includes(user.role)) {
      throw new ApiError(
        httpStatus.FORBIDDEN,
        'You do not have permission to access this resource',
      );
    }

    req.user = { userId: user.id, email: user.email, role: user.role };
    next();
  });
};

export default auth;
