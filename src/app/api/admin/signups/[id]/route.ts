import { db } from "@/lib/db";
import { getCurrentUser, hashPassword } from "@/lib/auth";
import { ok, err, unauthorized, forbidden, parseBody } from "@/lib/api-helpers";
import { audit } from "@/lib/audit";
import { AVATAR_COLORS } from "@/lib/constants";

export const dynamic = "force-dynamic";

function colorFor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

function requireAdmin(role: string) {
  return role === "ADMIN" || role === "DEVELOPER";
}

// POST /api/admin/signups/[id] — approve or reject a signup request
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const current = await getCurrentUser();
  if (!current) return unauthorized();
  if (!requireAdmin(current.user.role)) return forbidden();
  const { user } = current;
  const { id } = await params;

  const body = await parseBody<{ action?: "approve" | "reject"; note?: string }>(request);
  if (!body?.action) return err("Action (approve/reject) is required", 422, "VALIDATION");

  const req = await db.signupRequest.findUnique({ where: { id } });
  if (!req) return err("Signup request not found", 404, "NOT_FOUND");
  if (req.status !== "PENDING") return err("This request has already been reviewed", 400, "ALREADY_REVIEWED");

  if (body.action === "approve") {
    const existing = await db.user.findFirst({
      where: { OR: [{ employeeId: req.employeeId }, { email: req.email }] },
    });
    if (existing) {
      await db.signupRequest.update({
        where: { id },
        data: { status: "REJECTED", reviewedById: user.id, reviewedAt: new Date(), reviewNote: "Duplicate — employee ID or email already exists" },
      });
      return err("Employee ID or email already exists. Request auto-rejected.", 409, "DUPLICATE");
    }
    await db.user.create({
      data: {
        employeeId: req.employeeId,
        name: req.name,
        email: req.email,
        phone: req.phone,
        passwordHash: req.passwordHash,
        role: "EMPLOYEE",
        jobTitle: req.jobTitle,
        designation: req.designation,
        department: req.department,
        avatarColor: colorFor(req.employeeId),
      },
    });
    await db.signupRequest.update({
      where: { id },
      data: { status: "APPROVED", reviewedById: user.id, reviewedAt: new Date(), reviewNote: body.note ?? null },
    });
    await audit({ userId: user.id, action: "SIGNUP_APPROVED", entity: "SignupRequest", entityId: id, details: { employeeId: req.employeeId, name: req.name } });
    return ok({ status: "APPROVED" });
  } else {
    await db.signupRequest.update({
      where: { id },
      data: { status: "REJECTED", reviewedById: user.id, reviewedAt: new Date(), reviewNote: body.note ?? null },
    });
    await audit({ userId: user.id, action: "SIGNUP_REJECTED", entity: "SignupRequest", entityId: id, details: { employeeId: req.employeeId, note: body.note } });
    return ok({ status: "REJECTED" });
  }
}

// DELETE /api/admin/signups/[id] — delete a signup request record
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const current = await getCurrentUser();
  if (!current) return unauthorized();
  if (!requireAdmin(current.user.role)) return forbidden();
  const { id } = await params;
  await db.signupRequest.delete({ where: { id } });
  return ok({ deleted: true });
}
