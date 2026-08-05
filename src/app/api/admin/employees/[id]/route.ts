import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ok, err, unauthorized, forbidden, notFound, parseBody } from "@/lib/api-helpers";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

function requireAdmin(role: string) {
  return role === "ADMIN" || role === "DEVELOPER";
}

// PATCH /api/admin/employees/[id] — update / activate / deactivate
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const current = await getCurrentUser();
  if (!current) return unauthorized();
  if (!requireAdmin(current.user.role)) return forbidden();
  const { id } = await params;
  const body = await parseBody<Record<string, unknown>>(request);

  const existing = await db.user.findUnique({ where: { id } });
  if (!existing) return notFound("Employee not found");

  // Prevent self-deactivation / self-demotion for the current user
  if (existing.id === current.user.id && body.isActive === false) {
    return err("You cannot deactivate your own account", 400, "SELF_ACTION");
  }

  const allowed: Record<string, unknown> = {};
  for (const k of ["name", "email", "phone", "role", "jobTitle", "designation", "department", "isActive"]) {
    if (body[k] !== undefined) allowed[k] = body[k];
  }
  const updated = await db.user.update({ where: { id }, data: allowed });
  return ok({ id: updated.id, updated: true });
}

// DELETE /api/admin/employees/[id] — permanently delete an employee
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const current = await getCurrentUser();
  if (!current) return unauthorized();
  if (!requireAdmin(current.user.role)) return forbidden();
  const { id } = await params;

  const existing = await db.user.findUnique({ where: { id } });
  if (!existing) return notFound("Employee not found");

  // Prevent self-deletion
  if (existing.id === current.user.id) {
    return err("You cannot delete your own account", 400, "SELF_ACTION");
  }

  // Delete the user (cascade deletes their bookings)
  await db.user.delete({ where: { id } });
  await audit({ userId: current.user.id, action: "EMPLOYEE_DELETED", entity: "User", entityId: id, details: { employeeId: existing.employeeId, name: existing.name } });
  return ok({ deleted: true });
}
