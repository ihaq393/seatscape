import { db } from "@/lib/db";
import { getCurrentUser, hashPassword } from "@/lib/auth";
import { ok, err, unauthorized, forbidden, parseBody } from "@/lib/api-helpers";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

// POST /api/admin/employees/bulk-password — admin/dev resets passwords for many users at once
// Body: { ids: string[], newPassword?, generate?: boolean }
// If generate=true, each user gets a unique random password; otherwise all get newPassword.
export async function POST(request: Request) {
  const current = await getCurrentUser();
  if (!current) return unauthorized();
  const { user } = current;
  const isDev = user.role === "DEVELOPER";
  const isAdmin = user.role === "ADMIN";
  if (!isDev && !isAdmin) return forbidden();

  const body = await parseBody<{ ids?: string[]; newPassword?: string; generate?: boolean }>(request);
  if (!body?.ids?.length) return err("ids array is required", 422, "VALIDATION");
  if (!body.generate && (!body.newPassword || body.newPassword.length < 8)) {
    return err("New password must be at least 8 characters (or use generate=true)", 422, "VALIDATION");
  }

  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789@#$";
  const genPwd = () => {
    let p = "";
    for (let i = 0; i < 12; i++) p += chars[Math.floor(Math.random() * chars.length)];
    return p;
  };

  const results: { id: string; employeeId: string; name: string; newPassword: string }[] = [];
  const blocked: { id: string; employeeId: string; reason: string }[] = [];

  for (const id of body.ids) {
    const target = await db.user.findUnique({ where: { id } });
    if (!target) { blocked.push({ id, employeeId: "?", reason: "not found" }); continue; }
    // Admin cannot reset a developer's password
    if (isAdmin && target.role === "DEVELOPER") {
      blocked.push({ id, employeeId: target.employeeId, reason: "admins cannot reset developer passwords" });
      continue;
    }
    // Prevent self-reset via bulk (use the dedicated own-password endpoint instead)
    if (target.id === user.id) {
      blocked.push({ id, employeeId: target.employeeId, reason: "use the profile page to change your own password" });
      continue;
    }
    const pwd = body.generate ? genPwd() : body.newPassword!;
    await db.user.update({ where: { id }, data: { passwordHash: hashPassword(pwd) } });
    results.push({ id, employeeId: target.employeeId, name: target.name, newPassword: pwd });
  }

  await audit({ userId: user.id, action: "BULK_PASSWORD_RESET", entity: "User", details: { count: results.length, blocked: blocked.length, generate: !!body.generate } });
  return ok({ reset: results.length, blocked: blocked.length, results, blockedList: blocked });
}
