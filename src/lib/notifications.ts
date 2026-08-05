import { db } from "./db";
import { NOTIF_TYPES } from "./constants";

interface CreateNotificationInput {
  userId: string;
  type: string;
  title: string;
  message: string;
  channel?: string;
  meta?: Record<string, unknown>;
}

// Creates an in-app notification record. Email/SMS/WhatsApp channels are
// simulated: we persist them so the notifications center + audit trail can
// display the multi-channel delivery. A real deployment would dispatch to
// providers here (SES/Twilio/WhatsApp Cloud API/Firebase).
export async function notify(input: CreateNotificationInput) {
  const channels = input.channel ? [input.channel] : ["IN_APP", "EMAIL"];
  const created = [];
  for (const channel of channels) {
    created.push(
      db.notification.create({
        data: {
          userId: input.userId,
          channel,
          type: input.type,
          title: input.title,
          message: input.message,
          meta: input.meta ? JSON.stringify(input.meta) : null,
        },
      }),
    );
  }
  return Promise.all(created);
}

// Convenience helpers for common flows ────────────────────────────────────────
export async function notifyBookingConfirmation(
  userId: string,
  reference: string,
  seat: string,
  date: string,
) {
  return notify({
    userId,
    type: NOTIF_TYPES.BOOKING_CONFIRMATION,
    title: "Booking Confirmed",
    message: `Your seat ${seat} has been reserved for ${date}. Reference: ${reference}. A calendar invite has been generated.`,
    channel: "IN_APP",
    meta: { reference, seat, date },
  });
}

export async function notifyApprovalRequest(
  managerId: string,
  employeeName: string,
  date: string,
  seat: string,
) {
  return notify({
    userId: managerId,
    type: NOTIF_TYPES.APPROVAL_REQUEST,
    title: "Approval Required",
    message: `${employeeName} requested a late booking for ${seat} on ${date}. Review and approve.`,
    channel: "IN_APP",
    meta: { employeeName, date, seat },
  });
}

export async function notifyWaitlistPromotion(
  userId: string,
  seat: string,
  date: string,
) {
  return notify({
    userId,
    type: NOTIF_TYPES.WAITLIST_PROMOTION,
    title: "Seat Available — You're Promoted!",
    message: `A seat opened up. You've been promoted from the waitlist to ${seat} on ${date}. Confirm within 2 hours.`,
    channel: "IN_APP",
    meta: { seat, date },
  });
}

export async function notifyCancellation(
  userId: string,
  reference: string,
  reason?: string,
) {
  return notify({
    userId,
    type: NOTIF_TYPES.CANCELLATION,
    title: "Booking Cancelled",
    message: `Booking ${reference} has been cancelled${reason ? ` — ${reason}` : ""}. The seat is now available.`,
    channel: "IN_APP",
    meta: { reference, reason },
  });
}

export async function notifyCheckinReminder(
  userId: string,
  seat: string,
  date: string,
) {
  return notify({
    userId,
    type: NOTIF_TYPES.CHECKIN_REMINDER,
    title: "Check-in Reminder",
    message: `Don't forget to scan the QR code at seat ${seat} when you arrive on ${date}. Auto-release applies if not checked in by 10:30 AM.`,
    channel: "IN_APP",
    meta: { seat, date },
  });
}
