import { db } from "@/lib/db";
import { getCurrentUser, hashPassword, verifyPassword } from "@/lib/auth";
import { ok, err, unauthorized, parseBody } from "@/lib/api-helpers";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

// POST /api/auth/password — change own password (any authenticated user)
// Body: { currentPassword, newPassword }
export async function POST(request: Request) {
  const current = await getCurrentUser();
  if (!current) return unauthorized();
  const { user } = current;

  const body = await parseBody<{ currentPassword?: string; newPassword?: string }>(request);
  if (!body?.currentPassword || !body?.newPassword) {
    return err("Current password and new password are required", 422, "VALIDATION");
  }
  if (body.newPassword.length < 8) {
    return err("New password must be at least 8 characters", 422, "VALIDATION");
  }
  if (body.newPassword === body.currentPassword) {
    return err("New password must be different from the current password", 422, "VALIDATION");
  }

  // Verify current password
  const valid = verifyPassword(body.currentPassword, user.passwordHash);
  if (!valid) return err("Current password is incorrect", 400, "INVALID_PASSWORD");

  await db.user.update({ where: { id: user.id }, data: { passwordHash: hashPassword(body.newPassword) } });
  await audit({ userId: user.id, action: "PASSWORD_CHANGED", entity: "User", entityId: user.id });
  return ok({ success: true });
}
