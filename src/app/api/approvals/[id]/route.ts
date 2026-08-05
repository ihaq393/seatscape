import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ok, err, unauthorized, forbidden, notFound, parseBody } from "@/lib/api-helpers";
import { audit } from "@/lib/audit";
import { AUDIT_ACTIONS } from "@/lib/constants";

export const dynamic = "force-dynamic";

// POST /api/approvals/[id] — approve or reject (ADMIN only)
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const current = await getCurrentUser();
  if (!current) return unauthorized();
  if (current.user.role !== "ADMIN") return forbidden();
  const { user } = current;
  const { id } = await params;
  const body = await parseBody<{ action?: "approve" | "reject"; note?: string }>(request);
  if (!body?.action) return err("Action (approve/reject) is required", 422, "VALIDATION");

  const booking = await db.booking.findUnique({ where: { id }, include: { seat: true, user: true } });
  if (!booking) return notFound("Booking not found");
  if (booking.status !== "PENDING") return err("Booking is no longer pending", 400, "NOT_PENDING");

  const newStatus = body.action === "approve" ? "APPROVED" : "REJECTED";
  const updated = await db.booking.update({
    where: { id },
    data: {
      status: newStatus,
      approvedById: user.id,
      approvedAt: new Date(),
      approvalNote: body.note ?? null,
    },
  });

  await audit({
    userId: user.id,
    action: body.action === "approve" ? AUDIT_ACTIONS.BOOKING_APPROVED : AUDIT_ACTIONS.BOOKING_REJECTED,
    entity: "Booking", entityId: booking.id,
    details: { reference: booking.reference, note: body.note },
  });

  return ok({ id: updated.id, status: updated.status });
}
