import { ShipmentStatus } from '@prisma/client';

// Defines which transitions are legal. Prevents e.g. jumping PENDING -> DELIVERED,
// or moving a CANCELLED shipment anywhere.
export const ALLOWED_TRANSITIONS: Record<ShipmentStatus, ShipmentStatus[]> = {
  PENDING: ['PICKUP_SCHEDULED', 'CANCELLED'],
  PICKUP_SCHEDULED: ['PICKED_UP', 'CANCELLED'],
  PICKED_UP: ['AT_ORIGIN_HUB', 'CANCELLED'],
  AT_ORIGIN_HUB: ['IN_TRANSIT'],
  IN_TRANSIT: ['AT_DESTINATION_HUB'],
  AT_DESTINATION_HUB: ['OUT_FOR_DELIVERY'],
  OUT_FOR_DELIVERY: ['DELIVERED', 'FAILED_DELIVERY'],
  FAILED_DELIVERY: ['OUT_FOR_DELIVERY', 'RETURNED'],
  DELIVERED: [],
  RETURNED: [],
  CANCELLED: [],
};

export const isTransitionAllowed = (from: ShipmentStatus, to: ShipmentStatus): boolean => {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
};
