import { db } from "@/lib/db";
import { getCurrentUser, hashPassword } from "@/lib/auth";
import { ok, err, unauthorized, forbidden, notFound, parseBody } from "@/lib/api-helpers";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

// POST /api/admin/employees/[id]/password — admin/dev resets a user's password
// Body: { newPassword }
// Admin can reset anyone EXCEPT developers. Developer can reset anyone.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const current = await getCurrentUser();
  if (!current) return unauthorized();
  const { user } = current;
  const isDev = user.role === "DEVELOPER";
  const isAdmin = user.role === "ADMIN";
  if (!isDev && !isAdmin) return forbidden();

  const { id } = await params;
  const body = await parseBody<{ newPassword?: string }>(request);
  if (!body?.newPassword || body.newPassword.length < 8) {
    return err("New password must be at least 8 characters", 422, "VALIDATION");
  }

  const target = await db.user.findUnique({ where: { id } });
  if (!target) return notFound("Employee not found");

  // Admin cannot reset a developer's password
  if (isAdmin && target.role === "DEVELOPER") {
    return forbidden("Admins cannot reset a developer's password");
  }

  await db.user.update({ where: { id }, data: { passwordHash: hashPassword(body.newPassword) } });
  await audit({ userId: user.id, action: "PASSWORD_RESET", entity: "User", entityId: id, details: { targetEmployeeId: target.employeeId, byRole: user.role } });
  return ok({ success: true });
}
