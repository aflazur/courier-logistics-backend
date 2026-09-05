import httpStatus from 'http-status';
// @ts-expect-error - sslcommerz-lts ships no type declarations
import SSLCommerzPayment from 'sslcommerz-lts';
import prisma from '../../config/prisma';
import config from '../../config';
import ApiError from '../../utils/ApiError';
import { isTransitionAllowed } from '../shipment/shipment.stateMachine';

const sslcz = new SSLCommerzPayment(
  config.sslcz.store_id,
  config.sslcz.store_passwd,
  config.sslcz.is_live,
);

// Step 1: create a Payment row (PENDING) + ask SSLCommerz for a checkout session URL
const initiatePayment = async (
  shipmentId: string,
  customerEmail: string,
  customerPhone: string,
) => {
  const shipment = await prisma.shipment.findFirst({
    where: { id: shipmentId, deletedAt: null },
    include: { payment: true },
  });
  if (!shipment) throw new ApiError(httpStatus.NOT_FOUND, 'Shipment not found');
  if (shipment.payment && shipment.payment.status === 'PAID') {
    throw new ApiError(httpStatus.CONFLICT, 'This shipment has already been paid for');
  }

  const tran_id = `CRX-PAY-${shipment.trackingCode}-${Date.now()}`;

  const payment = await prisma.payment.upsert({
    where: { shipmentId },
    update: { transactionId: tran_id, amount: shipment.deliveryFee, status: 'PENDING' },
    create: {
      shipmentId,
      amount: shipment.deliveryFee,
      transactionId: tran_id,
      method: 'SSLCOMMERZ',
      status: 'PENDING',
    },
  });

  const sessionData = {
    total_amount: Number(shipment.deliveryFee),
    currency: 'BDT',
    tran_id,
    success_url: config.sslcz.success_url,
    fail_url: config.sslcz.fail_url,
    cancel_url: config.sslcz.cancel_url,
    ipn_url: config.sslcz.ipn_url,
    shipping_method: 'Courier',
    num_of_item: 1,
    product_name: `Delivery fee for shipment ${shipment.trackingCode}`,
    product_category: 'Logistics',
    product_profile: 'general',
    // Customer info - SSLCommerz's API rejects the session (without a clear error) if any of
    // these are missing, even though they seem like "shipping" details rather than payment ones.
    cus_name: customerEmail,
    cus_email: customerEmail,
    cus_add1: shipment.pickupAddress,
    cus_city: 'Dhaka',
    cus_state: 'Dhaka',
    cus_postcode: '1000',
    cus_country: 'Bangladesh',
    cus_phone: customerPhone,
    // Shipping info - same requirement as above.
    ship_name: shipment.recipientName,
    ship_add1: shipment.deliveryAddress,
    ship_city: 'Dhaka',
    ship_state: 'Dhaka',
    ship_postcode: '1000',
    ship_country: 'Bangladesh',
  };

  const apiResponse = await sslcz.init(sessionData);

  if (!apiResponse?.GatewayPageURL) {
    // Log SSLCommerz's actual rejection reason - without this, every failure looks identical
    // and impossible to debug.
    console.error('SSLCommerz session init failed:', JSON.stringify(apiResponse));
    throw new ApiError(
      httpStatus.BAD_GATEWAY,
      `Failed to initiate payment session with SSLCommerz: ${apiResponse?.failedreason || 'unknown reason - check server logs'}`,
    );
  }

  return { gatewayUrl: apiResponse.GatewayPageURL, paymentId: payment.id, tran_id };
};

// Step 2: SSLCommerz calls this (IPN / success callback) with the transaction result.
// We re-validate the transaction server-side via sslcz.validate() before trusting it -
// never trust the client-side redirect alone.
const verifyAndUpdatePayment = async (val_id: string, tran_id: string) => {
  const validation = await sslcz.validate({ val_id });

  if (validation.status !== 'VALID' && validation.status !== 'VALIDATED') {
    return prisma.$transaction(async (tx) => {
      const payment = await tx.payment.update({
        where: { transactionId: tran_id },
        data: { status: 'FAILED', rawResponse: validation },
      });
      return payment;
    });
  }

  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.update({
      where: { transactionId: tran_id },
      data: {
        status: 'PAID',
        gatewayValId: val_id,
        paidAt: new Date(),
        rawResponse: validation,
      },
    });

    // Only advance the shipment if it's still exactly where we'd expect a just-paid shipment
    // to be (PENDING, about to be scheduled for pickup). Without this check, confirming
    // payment on a shipment that has since moved on its own timeline (already picked up,
    // delivered, cancelled...) would force it backward - which is exactly the kind of
    // state-machine violation shipment.stateMachine.ts exists to prevent everywhere else.
    const shipment = await tx.shipment.findUnique({ where: { id: payment.shipmentId } });
    if (shipment && isTransitionAllowed(shipment.status, 'PICKUP_SCHEDULED')) {
      await tx.shipment.update({
        where: { id: payment.shipmentId },
        data: { status: 'PICKUP_SCHEDULED' },
      });

      await tx.shipmentStatusHistory.create({
        data: {
          shipmentId: payment.shipmentId,
          fromStatus: shipment.status,
          toStatus: 'PICKUP_SCHEDULED',
          changedBy: 'SYSTEM_PAYMENT_GATEWAY',
          note: `Payment confirmed via SSLCommerz (tran_id=${tran_id})`,
        },
      });
    }

    return payment;
  });
};

const markCancelledOrFailed = async (tran_id: string, status: 'CANCELLED' | 'FAILED') => {
  return prisma.payment.update({ where: { transactionId: tran_id }, data: { status } });
};

const getPaymentByShipment = async (shipmentId: string) => {
  const payment = await prisma.payment.findUnique({ where: { shipmentId } });
  if (!payment) throw new ApiError(httpStatus.NOT_FOUND, 'No payment found for this shipment');
  return payment;
};

export const PaymentService = {
  initiatePayment,
  verifyAndUpdatePayment,
  markCancelledOrFailed,
  getPaymentByShipment,
};
