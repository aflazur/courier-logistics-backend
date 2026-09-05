import { z } from 'zod';

const createShipmentSchema = z.object({
  body: z.object({
    recipientName: z.string().min(2),
    recipientPhone: z.string().min(6),
    pickupAddress: z.string().min(5),
    deliveryAddress: z.string().min(5),
    weightKg: z.number().positive(),
    parcelType: z.string().optional(),
    declaredValue: z.number().nonnegative().optional(),
    originHubId: z.string().uuid().optional(),
    destinationHubId: z.string().uuid().optional(),
  }),
});

const updateStatusSchema = z.object({
  body: z.object({
    status: z.enum([
      'PENDING',
      'PICKUP_SCHEDULED',
      'PICKED_UP',
      'AT_ORIGIN_HUB',
      'IN_TRANSIT',
      'AT_DESTINATION_HUB',
      'OUT_FOR_DELIVERY',
      'DELIVERED',
      'FAILED_DELIVERY',
      'RETURNED',
      'CANCELLED',
    ]),
    note: z.string().optional(),
  }),
  params: z.object({ id: z.string().uuid() }),
});

const assignCourierSchema = z.object({
  body: z.object({
    courierProfileId: z.string().uuid(),
  }),
  params: z.object({ id: z.string().uuid() }),
});

export const ShipmentValidation = {
  createShipmentSchema,
  updateStatusSchema,
  assignCourierSchema,
};
