import { db } from "@/lib/db";
import { ok } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

// GET /api/availability?date= — public seat counts + reservations for a date
export async function GET(request: Request) {
  const url = new URL(request.url);
  const dateParam = url.searchParams.get("date");
  const targetDate = dateParam ? new Date(dateParam) : new Date();
  const dayStart = new Date(targetDate); dayStart.setUTCHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart); dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

  const seats = await db.seat.findMany();
  const bookings = await db.booking.findMany({
    where: { date: { gte: dayStart, lt: dayEnd }, status: { notIn: ["CANCELLED", "REJECTED"] } },
    include: { user: true },
  });

  const total = seats.length;
  const bookable = seats.filter((s) => !s.isEmergency).length;
  const reservedSeats = new Set(bookings.map((b) => b.seatId));
  const available = seats.filter((s) => !s.isEmergency && !s.isBlocked && !reservedSeats.has(s.id)).length;
  const blocked = seats.filter((s) => s.isBlocked).length;
  const emergency = seats.filter((s) => s.isEmergency).length;
  const pending = bookings.filter((b) => b.status === "PENDING").length;
  const occupied = bookings.filter((b) => b.status === "CHECKED_IN").length;

  return ok({
    date: targetDate.toISOString(),
    total, bookable, available, reserved: reservedSeats.size, occupied, pending, blocked, emergency,
    reservations: bookings.map((b) => ({
      reference: b.reference,
      employeeName: b.user.name,
      employeeId: b.user.employeeId,
      seatNumber: seats.find((s) => s.id === b.seatId)?.number ?? "?",
      status: b.status,
      type: b.type,
      expectedCheckIn: b.expectedCheckIn,
      expectedCheckOut: b.expectedCheckOut,
      purpose: b.purpose,
      checkedInAt: b.checkedInAt?.toISOString() ?? null,
    })),
  });
}
