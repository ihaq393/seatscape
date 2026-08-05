import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ok, unauthorized, forbidden, notFound } from "@/lib/api-helpers";
import QRCode from "qrcode";

export const dynamic = "force-dynamic";

// GET /api/bookings/[id]/qr — returns QR data URL for the booking
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const current = await getCurrentUser();
  if (!current) return unauthorized();
  const { user } = current;
  const { id } = await params;

  const booking = await db.booking.findUnique({ where: { id }, include: { seat: true } });
  if (!booking) return notFound("Booking not found");

  const isAdmin = user.role === "ADMIN";
  if (!isAdmin && booking.userId !== user.id) return forbidden();

  const payload = JSON.stringify({ bookingId: booking.id, reference: booking.reference, seat: booking.seat.number });
  const dataUrl = await QRCode.toDataURL(payload, {
    errorCorrectionLevel: "M", margin: 2, width: 320,
    color: { dark: "#0f1f1c", light: "#ffffff" },
  });
  return ok({
    dataUrl,
    bookingId: booking.id,
    reference: booking.reference,
    seatNumber: booking.seat.number,
    date: booking.date.toISOString(),
  });
}
