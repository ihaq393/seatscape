import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ok, err, unauthorized, forbidden, notFound, parseBody } from "@/lib/api-helpers";
import { audit } from "@/lib/audit";
import { AUDIT_ACTIONS } from "@/lib/constants";

export const dynamic = "force-dynamic";

// GET /api/approvals — pending bookings (ADMIN only — developers don't handle approvals)
export async function GET() {
  const current = await getCurrentUser();
  if (!current) return unauthorized();
  if (current.user.role !== "ADMIN") return forbidden();

  const pending = await db.booking.findMany({
    where: { status: "PENDING" },
    include: { seat: true, user: true },
    orderBy: { createdAt: "asc" },
  });
  return ok(pending.map((b) => ({
    id: b.id,
    reference: b.reference,
    employeeName: b.user.name,
    employeeId: b.user.employeeId,
    seatNumber: b.seat.number,
    date: b.date.toISOString(),
    purpose: b.purpose,
    justification: b.justification ?? null,
    type: b.type,
    expectedCheckIn: b.expectedCheckIn,
    expectedCheckOut: b.expectedCheckOut,
    createdAt: b.createdAt.toISOString(),
  })));
}
