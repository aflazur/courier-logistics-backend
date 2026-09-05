import httpStatus from 'http-status';
import prisma from '../../config/prisma';
import ApiError from '../../utils/ApiError';

const getMyProfile = async (userId: string) => {
  const profile = await prisma.courierProfile.findFirst({
    where: { userId, deletedAt: null },
    include: { currentHub: true },
  });
  if (!profile) throw new ApiError(httpStatus.NOT_FOUND, 'Courier profile not found');
  return profile;
};

type UpdateProfileInput = Partial<{
  isAvailable: boolean;
  vehicleType: string;
  licenseNumber: string;
  currentHubId: string;
}>;

const updateMyProfile = async (userId: string, data: UpdateProfileInput) => {
  const profile = await prisma.courierProfile.findFirst({ where: { userId, deletedAt: null } });
  if (!profile) throw new ApiError(httpStatus.NOT_FOUND, 'Courier profile not found');

  return prisma.courierProfile.update({ where: { id: profile.id }, data });
};

type ListFilters = { page?: number; limit?: number; isAvailable?: boolean };

const listCouriers = async (filters: ListFilters) => {
  const page = filters.page && filters.page > 0 ? filters.page : 1;
  const limit = filters.limit && filters.limit > 0 ? filters.limit : 10;

  const where = {
    deletedAt: null,
    ...(filters.isAvailable !== undefined ? { isAvailable: filters.isAvailable } : {}),
  };

  const [data, total] = await prisma.$transaction([
    prisma.courierProfile.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        currentHub: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.courierProfile.count({ where }),
  ]);

  return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
};

export const CourierService = { getMyProfile, updateMyProfile, listCouriers };
