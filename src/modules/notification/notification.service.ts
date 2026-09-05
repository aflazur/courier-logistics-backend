import sendMail from '../../utils/mailer';

const shipmentStatusEmail = (
  recipientName: string,
  trackingCode: string,
  status: string,
  note?: string,
) => `
  <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto;">
    <h2>Shipment Update</h2>
    <p>Hi ${recipientName},</p>
    <p>Your shipment <strong>${trackingCode}</strong> status changed to:</p>
    <p style="font-size: 18px; font-weight: bold; color: #2563eb;">${status.replace(/_/g, ' ')}</p>
    ${note ? `<p style="color:#555;">${note}</p>` : ''}
    <p>Thank you for choosing our courier service.</p>
  </div>
`;

const courierAssignedEmail = (courierName: string, trackingCode: string, pickupAddress: string) => `
  <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto;">
    <h2>New Pickup Assigned</h2>
    <p>Hi ${courierName},</p>
    <p>You've been assigned shipment <strong>${trackingCode}</strong>.</p>
    <p>Pickup address: ${pickupAddress}</p>
  </div>
`;

const notifyShipmentStatusChange = async (
  email: string,
  recipientName: string,
  trackingCode: string,
  status: string,
  note?: string,
) => {
  await sendMail(
    email,
    `Shipment ${trackingCode} — ${status.replace(/_/g, ' ')}`,
    shipmentStatusEmail(recipientName, trackingCode, status, note),
  );
};

const notifyCourierAssigned = async (
  email: string,
  courierName: string,
  trackingCode: string,
  pickupAddress: string,
) => {
  await sendMail(
    email,
    `New pickup assigned — ${trackingCode}`,
    courierAssignedEmail(courierName, trackingCode, pickupAddress),
  );
};

export const NotificationService = { notifyShipmentStatusChange, notifyCourierAssigned };
