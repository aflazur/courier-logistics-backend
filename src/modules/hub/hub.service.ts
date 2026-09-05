import httpStatus from 'http-status';
import prisma from '../../config/prisma';
import ApiError from '../../utils/ApiError';
import { cacheGet, cacheSet, cacheInvalidate } from '../../config/redis';

const hubListCacheKey = (city?: string) => `hubs:list:${city ?? 'all'}`;

const createHub = async (data: { name: string; city: string; zone: string; address: string }) => {
  const hub = await prisma.hub.create({ data });
  await cacheInvalidate('hubs:list:*');
  return hub;
};

// Hub lists change rarely and are read constantly (every shipment-creation form loads them) -
// a good, low-risk caching target.
const listHubs = async (city?: string) => {
  const cacheKey = hubListCacheKey(city);
  const cached = await cacheGet<Awaited<ReturnType<typeof fetchHubs>>>(cacheKey);
  if (cached) return cached;

  const hubs = await fetchHubs(city);
  await cacheSet(cacheKey, hubs, 300); // 5 min TTL - hubs rarely change
  return hubs;
};

const fetchHubs = async (city?: string) => {
  return prisma.hub.findMany({
    where: { deletedAt: null, ...(city ? { city: { equals: city, mode: 'insensitive' } } : {}) },
    orderBy: { name: 'asc' },
  });
};

const getHub = async (id: string) => {
  const hub = await prisma.hub.findFirst({ where: { id, deletedAt: null } });
  if (!hub) throw new ApiError(httpStatus.NOT_FOUND, 'Hub not found');
  return hub;
};

const updateHub = async (
  id: string,
  data: Partial<{ name: string; city: string; zone: string; address: string }>,
) => {
  await getHub(id);
  const hub = await prisma.hub.update({ where: { id }, data });
  await cacheInvalidate('hubs:list:*');
  return hub;
};

const deleteHub = async (id: string) => {
  await getHub(id);
  const hub = await prisma.hub.update({ where: { id }, data: { deletedAt: new Date() } });
  await cacheInvalidate('hubs:list:*');
  return hub;
};

export const HubService = { createHub, listHubs, getHub, updateHub, deleteHub };
