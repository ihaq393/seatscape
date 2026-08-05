import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ok, err, unauthorized, forbidden, notFound, parseBody } from "@/lib/api-helpers";
import { audit } from "@/lib/audit";
import { AUDIT_ACTIONS } from "@/lib/constants";

export const dynamic = "force-dynamic";

// POST /api/bookings/[id]/checkin
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const current = await getCurrentUser();
  if (!current) return unauthorized();
  const { user } = current;
  const { id } = await params;

  const booking = await db.booking.findUnique({ where: { id }, include: { seat: true } });
  if (!booking) return notFound("Booking not found");

  const isAdmin = user.role === "ADMIN";
  if (!isAdmin && booking.userId !== user.id) return forbidden("You can only check in to your own booking");
  if (booking.status === "CANCELLED") return err("This booking was cancelled", 400, "CANCELLED");
  if (booking.status === "CHECKED_IN") return err("Already checked in", 400, "ALREADY_CHECKED_IN");
  if (booking.status === "PENDING") return err("This booking is pending approval", 400, "PENDING");

  const updated = await db.booking.update({
    where: { id },
    data: { status: "CHECKED_IN", checkedInAt: new Date() },
    include: { seat: true },
  });

  await audit({ userId: user.id, action: AUDIT_ACTIONS.BOOKING_CHECKED_IN, entity: "Booking", entityId: booking.id, details: { reference: booking.reference, seat: booking.seat.number } });
  return ok({ id: updated.id, status: updated.status, checkedInAt: updated.checkedInAt?.toISOString(), seatNumber: updated.seat.number });
}
