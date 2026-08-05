import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ok } from "@/lib/api-helpers";
import { SEAT_STATE } from "@/lib/constants";
import { getSettingBool } from "@/lib/settings";

export const dynamic = "force-dynamic";

function computeState(
  seat: { isEmergency: boolean; isBlocked: boolean },
  booking: { status: string } | undefined,
): string {
  if (seat.isEmergency) return SEAT_STATE.EMERGENCY;
  if (seat.isBlocked) return SEAT_STATE.BLOCKED;
  if (!booking) return SEAT_STATE.AVAILABLE;
  if (booking.status === "PENDING") return SEAT_STATE.PENDING;
  if (booking.status === "CHECKED_IN") return SEAT_STATE.OCCUPIED;
  if (["APPROVED", "COMPLETED"].includes(booking.status)) return SEAT_STATE.RESERVED;
  return SEAT_STATE.AVAILABLE;
}

// GET /api/seats?date= — seat map for a date
// PUBLIC: returns seat status + timing (if enabled), but NO employee details (privacy).
// AUTHENTICATED: returns full bookedBy details (name, designation, photo, timing).
export async function GET(request: Request) {
  const url = new URL(request.url);
  const dateParam = url.searchParams.get("date");
  const date = dateParam ? new Date(dateParam) : new Date();
  const dayStart = new Date(date); dayStart.setUTCHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart); dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

  // Try to authenticate (optional — public access allowed)
  const current = await getCurrentUser();
  const isAuthenticated = !!current;
  const isAdminOrDev = current && (current.user.role === "ADMIN" || current.user.role === "DEVELOPER");

  // Check if booking times should be shown publicly
  const showTimesPublic = await getSettingBool("SHOW_BOOKING_TIMES_PUBLIC");
  const showTimes = isAuthenticated || showTimesPublic;

  const seats = await db.seat.findMany({ orderBy: [{ posY: "asc" }, { posX: "asc" }] });
  const bookings = await db.booking.findMany({
    where: { date: { gte: dayStart, lt: dayEnd }, status: { notIn: ["CANCELLED", "REJECTED"] } },
    include: { user: true },
  });
  const bookingBySeat = new Map(bookings.map((b) => [b.seatId, b]));

  const dtos = seats.map((seat) => {
    const booking = bookingBySeat.get(seat.id);
    const state = computeState(seat, booking);
    const u = booking?.user;

    // Public (not logged in): booked-at time only, NO employee details
    if (!isAuthenticated) {
      return {
        id: seat.id,
        number: seat.number,
        label: seat.label,
        isEmergency: seat.isEmergency,
        isBlocked: seat.isBlocked,
        posX: seat.posX,
        posY: seat.posY,
        zone: seat.zone,
        state,
        // Show when the seat was booked (timestamp), not duration
        bookedAt: booking && showTimes ? booking.createdAt.toISOString() : null,
        bookedBy: null,
      };
    }

    // Authenticated: full details including name, designation, photo, booked-at time
    return {
      id: seat.id,
      number: seat.number,
      label: seat.label,
      isEmergency: seat.isEmergency,
      isBlocked: seat.isBlocked,
      posX: seat.posX,
      posY: seat.posY,
      zone: seat.zone,
      state,
      bookedAt: booking ? booking.createdAt.toISOString() : null,
      bookedBy: booking && u
        ? {
            employeeId: u.employeeId,
            name: u.name,
            designation: u.designation ?? u.jobTitle ?? null,
            department: u.department ?? null,
            photoUrl: u.photoUrl ?? null,
            avatarColor: u.avatarColor ?? "#10b981",
            bookingReference: booking.reference,
            status: booking.status,
            bookedAt: booking.createdAt.toISOString(),
            purpose: booking.purpose,
          }
        : null,
      // autoApprove override only visible to admin/dev
      autoApprove: isAdminOrDev ? seat.autoApprove : undefined,
    };
  });
  return ok({ seats: dtos });
}
