import { z } from 'zod';

const initiatePaymentSchema = z.object({
  body: z.object({
    shipmentId: z.string().uuid(),
    phone: z.string().min(6).optional(),
  }),
});

const gatewayCallbackSchema = z.object({
  body: z.object({
    tran_id: z.string().min(1, 'tran_id is required'),
    val_id: z.string().optional(), // present on success/IPN, absent on fail/cancel
  }),
});

export const PaymentValidation = { initiatePaymentSchema, gatewayCallbackSchema };
