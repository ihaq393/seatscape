import { db } from "@/lib/db";
import { verifyPassword, setSessionCookie, recordFailedLogin, resetFailedLogin, isAccountLocked, getClientIP } from "@/lib/auth";
import { ok, err, unauthorized, forbidden, tooMany, parseBody } from "@/lib/api-helpers";
import { audit } from "@/lib/audit";
import { AUDIT_ACTIONS, ROLES } from "@/lib/constants";

export const dynamic = "force-dynamic";

// POST /api/auth/login — accepts { employeeId } OR { email } + password
export async function POST(request: Request) {
  const body = await parseBody<{ employeeId?: string; email?: string; password?: string; remember?: boolean }>(request);
  const identifier = body?.employeeId || body?.email;
  if (!identifier || !body?.password) {
    return err("Employee ID or email and password are required", 422, "VALIDATION");
  }
  const ip = getClientIP(request);
  const value = identifier.trim();
  const isEmail = value.includes("@");
  const user = isEmail
    ? await db.user.findUnique({ where: { email: value.toLowerCase() } })
    : await db.user.findUnique({ where: { employeeId: value.toUpperCase() } });

  if (!user) return unauthorized(`Invalid ${isEmail ? "email" : "employee ID"} or password`);
  if (!user.isActive) return forbidden("Your account has been deactivated. Contact the admin.");
  if (isAccountLocked(user.lockedUntil)) return tooMany();

  const valid = verifyPassword(body.password, user.passwordHash);
  if (!valid) {
    await recordFailedLogin(user.employeeId, ip);
    return unauthorized(`Invalid ${isEmail ? "email" : "employee ID"} or password`);
  }

  await resetFailedLogin(user.id);
  await setSessionCookie(user.id, user.employeeId, user.role as (typeof ROLES)[keyof typeof ROLES], body.remember);
  await audit({ userId: user.id, action: AUDIT_ACTIONS.USER_LOGIN, entity: "User", entityId: user.id, ipAddress: ip, details: { method: isEmail ? "email" : "employeeId" } });

  return ok({
    id: user.id,
    employeeId: user.employeeId,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone ?? null,
    jobTitle: user.jobTitle ?? null,
    avatarColor: user.avatarColor ?? "#10b981",
  });
}
