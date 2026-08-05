import { db } from "@/lib/db";
import { hashPassword, setSessionCookie } from "@/lib/auth";
import { ok, err, parseBody } from "@/lib/api-helpers";
import { ROLES } from "@/lib/constants";

export const dynamic = "force-dynamic";

// POST /api/auth/reset-password — accepts employeeId OR email + token + new password
export async function POST(request: Request) {
  const body = await parseBody<{ token?: string; password?: string; employeeId?: string; email?: string }>(request);
  if (!body?.token || !body?.password) {
    return err("Token and new password are required", 422, "VALIDATION");
  }
  if (!body?.employeeId && !body?.email) {
    return err("Employee ID or email is required", 422, "VALIDATION");
  }
  if (body.password.length < 8) {
    return err("Password must be at least 8 characters", 422, "VALIDATION");
  }
  const value = (body.email || body.employeeId!).trim();
  const isEmail = value.includes("@");
  const user = isEmail
    ? await db.user.findUnique({ where: { email: value.toLowerCase() } })
    : await db.user.findUnique({ where: { employeeId: value.toUpperCase() } });
  if (!user) return err("Invalid request", 400, "INVALID");

  // Find the most recent password-reset audit entry
  const resetEntry = await db.auditLog.findFirst({
    where: { userId: user.id, action: "PASSWORD_RESET_REQUESTED" },
    orderBy: { createdAt: "desc" },
  });
  if (!resetEntry) return err("No reset request found. Request a new link.", 400, "INVALID");

  let meta: { token?: string; expiresAt?: number } = {};
  try { meta = JSON.parse(resetEntry.details || "{}"); } catch {}
  if (!meta.token || meta.token !== body.token) return err("Invalid or expired token", 400, "INVALID");
  if (!meta.expiresAt || meta.expiresAt < Date.now()) return err("Token expired. Request a new link.", 400, "EXPIRED");

  // Delete the consumed reset entry + reset password
  await db.auditLog.delete({ where: { id: resetEntry.id } });
  await db.user.update({ where: { id: user.id }, data: { passwordHash: hashPassword(body.password), failedAttempts: 0, lockedUntil: null } });
  await setSessionCookie(user.id, user.employeeId, user.role as (typeof ROLES)[keyof typeof ROLES], true);
  return ok({ success: true });
}
