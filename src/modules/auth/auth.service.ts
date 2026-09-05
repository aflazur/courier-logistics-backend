import bcrypt from 'bcryptjs';
import httpStatus from 'http-status';
import prisma from '../../config/prisma';
import ApiError from '../../utils/ApiError';
import config from '../../config';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../utils/jwt';

type RegisterInput = {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role?: 'CUSTOMER' | 'COURIER';
};

const register = async (input: RegisterInput) => {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw new ApiError(httpStatus.CONFLICT, 'An account with this email already exists');
  }

  const hashedPassword = await bcrypt.hash(input.password, config.bcrypt_salt_rounds);

  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      password: hashedPassword,
      phone: input.phone,
      role: input.role ?? 'CUSTOMER',
    },
  });

  // If registering as a courier, auto-create the courier profile
  if (user.role === 'COURIER') {
    await prisma.courierProfile.create({ data: { userId: user.id } });
  }

  const tokenPayload = { userId: user.id, email: user.email, role: user.role };
  const accessToken = signAccessToken(tokenPayload);
  const refreshToken = signRefreshToken(tokenPayload);

  await prisma.user.update({ where: { id: user.id }, data: { refreshToken } });

  const { password: _password, refreshToken: _refreshToken, ...safeUser } = user;
  return { user: safeUser, accessToken, refreshToken };
};

const login = async (email: string, password: string) => {
  const user = await prisma.user.findFirst({ where: { email, deletedAt: null } });
  if (!user || !user.password) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Invalid email or password');
  }
  if (!user.isActive) {
    throw new ApiError(httpStatus.FORBIDDEN, 'This account has been deactivated');
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Invalid email or password');
  }

  const tokenPayload = { userId: user.id, email: user.email, role: user.role };
  const accessToken = signAccessToken(tokenPayload);
  const refreshToken = signRefreshToken(tokenPayload);

  await prisma.user.update({ where: { id: user.id }, data: { refreshToken } });

  const { password: _pw, refreshToken: _refreshToken, ...safeUser } = user;
  return { user: safeUser, accessToken, refreshToken };
};

const refreshAccessToken = async (token: string) => {
  let decoded;
  try {
    decoded = verifyRefreshToken(token);
  } catch {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Invalid or expired refresh token');
  }

  const user = await prisma.user.findFirst({ where: { id: decoded.userId, deletedAt: null } });
  if (!user || user.refreshToken !== token) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Refresh token has been invalidated');
  }

  const accessToken = signAccessToken({ userId: user.id, email: user.email, role: user.role });
  return { accessToken };
};

const logout = async (userId: string) => {
  await prisma.user.update({ where: { id: userId }, data: { refreshToken: null } });
};

// Shared by password login and the Google OAuth callback - issues a fresh token pair
// for an already-authenticated User record.
const issueTokensForUser = async (user: { id: string; email: string; role: string }) => {
  const tokenPayload = { userId: user.id, email: user.email, role: user.role };
  const accessToken = signAccessToken(tokenPayload);
  const refreshToken = signRefreshToken(tokenPayload);

  await prisma.user.update({ where: { id: user.id }, data: { refreshToken } });

  return { accessToken, refreshToken };
};

export const AuthService = { register, login, refreshAccessToken, logout, issueTokensForUser };
