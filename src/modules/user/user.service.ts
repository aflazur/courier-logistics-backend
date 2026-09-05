import httpStatus from 'http-status';
import prisma from '../../config/prisma';
import ApiError from '../../utils/ApiError';

const getMe = async (userId: string) => {
  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      isVerified: true,
      createdAt: true,
      courierProfile: true,
    },
  });
  if (!user) throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  return user;
};

const updateMe = async (userId: string, data: { name?: string; phone?: string }) => {
  return prisma.user.update({
    where: { id: userId },
    data,
    select: { id: true, name: true, email: true, phone: true, role: true },
  });
};

export const UserService = { getMe, updateMe };
