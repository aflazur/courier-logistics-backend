import { z } from 'zod';

const changeRoleSchema = z.object({
  body: z.object({ role: z.enum(['CUSTOMER', 'COURIER', 'ADMIN']) }),
  params: z.object({ id: z.string().uuid() }),
});

const changeStatusSchema = z.object({
  body: z.object({ isActive: z.boolean() }),
  params: z.object({ id: z.string().uuid() }),
});

export const AdminValidation = { changeRoleSchema, changeStatusSchema };
