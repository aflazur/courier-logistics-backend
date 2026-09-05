import { z } from 'zod';

const updateMeSchema = z.object({
  body: z.object({
    name: z.string().min(2).optional(),
    phone: z.string().min(6).optional(),
  }),
});

export const UserValidation = { updateMeSchema };
