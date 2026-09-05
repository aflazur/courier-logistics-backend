import { z } from 'zod';

const updateProfileSchema = z.object({
  body: z.object({
    isAvailable: z.boolean().optional(),
    vehicleType: z.string().optional(),
    licenseNumber: z.string().optional(),
    currentHubId: z.string().uuid().optional(),
  }),
});

export const CourierValidation = { updateProfileSchema };
