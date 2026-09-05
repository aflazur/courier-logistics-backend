import { z } from 'zod';

const createHubSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Hub name must be at least 2 characters'),
    city: z.string().min(2, 'City is required'),
    zone: z.string().min(1, 'Zone is required'),
    address: z.string().min(5, 'Address must be at least 5 characters'),
  }),
});

const updateHubSchema = z.object({
  body: z.object({
    name: z.string().min(2).optional(),
    city: z.string().min(2).optional(),
    zone: z.string().min(1).optional(),
    address: z.string().min(5).optional(),
  }),
  params: z.object({ id: z.string().uuid() }),
});

export const HubValidation = { createHubSchema, updateHubSchema };
