import { db } from "@/lib/db";
import { getCurrentUser, generateReference } from "@/lib/auth";
import { ok, err, unauthorized, forbidden, conflict, parseBody, startOfDay } from "@/lib/api-helpers";
import { audit } from "@/lib/audit";
import { evaluateBookingRule, shouldAutoApprove, getSettings, getSettingBool } from "@/lib/settings";
import { AUDIT_ACTIONS, BOOKING_STATUS, BOOKING_TYPE } from "@/lib/constants";
import type { BookingDTO } from "@/lib/types";

export const dynamic = "force-dynamic";

function toDTO(b: any): BookingDTO {
  return {
    id: b.id,
    reference: b.reference,
    userId: b.userId,
    seatId: b.seatId,
    seatNumber: b.seat?.number ?? "",
    date: b.date.toISOString(),
    purpose: b.purpose,
    justification: b.justification ?? null,
    type: b.type,
    status: b.status,
    expectedCheckIn: b.expectedCheckIn,
    expectedCheckOut: b.expectedCheckOut,
    checkedInAt: b.checkedInAt?.toISOString() ?? null,
    checkedOutAt: b.checkedOutAt?.toISOString() ?? null,
    approvedById: b.approvedById ?? null,
    approvedAt: b.approvedAt?.toISOString() ?? null,
    approvalNote: b.approvalNote ?? null,
    cancelledReason: b.cancelledReason ?? null,
    createdAt: b.createdAt.toISOString(),
    employee: b.user ? { id: b.user.id, employeeId: b.user.employeeId, name: b.user.name, jobTitle: b.user.jobTitle ?? null } : null,
  };
}

// Roles that can manage (view all + cancel) any booking
function canManage(role: string) {
  return role === "ADMIN" || role === "DEVELOPER";
}

// GET /api/bookings?mine=true | ?all=true
export async function GET(request: Request) {
  const current = await getCurrentUser();
  if (!current) return unauthorized();
  const { user } = current;
  const url = new URL(request.url);
  const mine = url.searchParams.get("mine") === "true";
  const all = url.searchParams.get("all") === "true";

  const where: any = {};
  if (mine || (!all && !canManage(user.role))) where.userId = user.id;

  const bookings = await db.booking.findMany({
    where,
    include: { seat: true, user: true },
    orderBy: { date: "desc" },
    take: 200,
  });
  return ok(bookings.map(toDTO));
}

// POST /api/bookings — create a booking
export async function POST(request: Request) {
  const current = await getCurrentUser();
  if (!current) return unauthorized();
  const { user } = current;

  const body = await parseBody<{
    seatId?: string;
    date?: string;
    purpose?: string;
    justification?: string;
    expectedCheckIn?: string;
    expectedCheckOut?: string;
  }>(request);

  if (!body?.seatId || !body?.date) {
    return err("Seat and date are required", 422, "VALIDATION");
  }

  const reservationDate = startOfDay(body.date);
  const now = new Date();

  if (reservationDate.getTime() < startOfDay(now).getTime()) {
    return err("Cannot book a date in the past", 422, "PAST_DATE");
  }

  const seat = await db.seat.findUnique({ where: { id: body.seatId } });
  if (!seat) return err("Seat not found", 404, "NOT_FOUND");
  if (seat.isBlocked) return conflict("This seat is currently blocked.");

  const rule = await evaluateBookingRule(reservationDate, now);
  if (rule.isLate && !body.justification) {
    return err("Late bookings require a justification", 422, "JUSTIFICATION_REQUIRED");
  }

  // One seat per employee per date — cancelled/rejected bookings don't count
  const existing = await db.booking.findFirst({
    where: { userId: user.id, date: reservationDate, status: { notIn: ["CANCELLED", "REJECTED"] } },
  });
  if (existing) return conflict("You can only book one seat per day. Cancel your existing booking first to rebook.");

  const seatTaken = await db.booking.findFirst({
    where: { seatId: body.seatId, date: reservationDate, status: { notIn: ["CANCELLED", "REJECTED"] } },
  });
  if (seatTaken) return conflict("This seat has just been taken. Please pick another seat.");

  // Determine auto-approval: late bookings always need approval unless policy is AUTO_APPROVE.
  // For normal bookings, check the seat's auto-approval setting (override → emergency → global).
  const settings = await getSettings();
  const autoSelectTime = await getSettingBool("AUTO_SELECT_BOOKING_TIME");
  const expectedCheckIn = autoSelectTime ? settings.DEFAULT_CHECK_IN : (body.expectedCheckIn || settings.DEFAULT_CHECK_IN);
  const expectedCheckOut = autoSelectTime ? settings.DEFAULT_CHECK_OUT : (body.expectedCheckOut || settings.DEFAULT_CHECK_OUT);

  let status = BOOKING_STATUS.APPROVED;
  let type = BOOKING_TYPE.NORMAL;
  if (rule.isLate) {
    type = BOOKING_TYPE.LATE;
    status = rule.approvalPolicy === "AUTO_APPROVE" ? BOOKING_STATUS.APPROVED : BOOKING_STATUS.PENDING;
  } else {
    // Normal booking: check per-seat auto-approval
    const auto = await shouldAutoApprove(seat);
    status = auto ? BOOKING_STATUS.APPROVED : BOOKING_STATUS.PENDING;
  }

  const reference = generateReference();

  const booking = await db.booking.create({
    data: {
      reference, userId: user.id, seatId: body.seatId, date: reservationDate,
      purpose: body.purpose || "Office visit", justification: body.justification ?? null,
      type, status, expectedCheckIn, expectedCheckOut,
    },
    include: { seat: true, user: true },
  });

  await audit({ userId: user.id, action: AUDIT_ACTIONS.BOOKING_CREATED, entity: "Booking", entityId: booking.id, details: { reference, seat: seat.number, type, status } });
  return ok(toDTO(booking));
}
