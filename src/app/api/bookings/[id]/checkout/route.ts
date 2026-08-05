import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ok, err, unauthorized, forbidden, notFound } from "@/lib/api-helpers";
import { audit } from "@/lib/audit";
import { AUDIT_ACTIONS } from "@/lib/constants";

export const dynamic = "force-dynamic";

// POST /api/bookings/[id]/checkout
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const current = await getCurrentUser();
  if (!current) return unauthorized();
  const { user } = current;
  const { id } = await params;

  const booking = await db.booking.findUnique({ where: { id }, include: { seat: true } });
  if (!booking) return notFound("Booking not found");

  const isAdmin = user.role === "ADMIN";
  if (!isAdmin && booking.userId !== user.id) return forbidden("You can only check out of your own booking");
  if (booking.status !== "CHECKED_IN") return err("Booking is not checked in", 400, "NOT_CHECKED_IN");

  const updated = await db.booking.update({
    where: { id },
    data: { status: "COMPLETED", checkedOutAt: new Date() },
    include: { seat: true },
  });

  await audit({ userId: user.id, action: AUDIT_ACTIONS.BOOKING_CHECKED_OUT, entity: "Booking", entityId: booking.id, details: { reference: booking.reference } });
  return ok({ id: updated.id, status: updated.status, checkedOutAt: updated.checkedOutAt?.toISOString(), seatNumber: updated.seat.number });
}
