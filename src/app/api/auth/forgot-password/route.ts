import { db } from "@/lib/db";
import { ok, err, parseBody } from "@/lib/api-helpers";
import { randomBytes } from "crypto";

export const dynamic = "force-dynamic";

// POST /api/auth/forgot-password — accepts employeeId OR email
export async function POST(request: Request) {
  const body = await parseBody<{ employeeId?: string; email?: string }>(request);
  if (!body?.employeeId && !body?.email) {
    return err("Employee ID or email is required", 422, "VALIDATION");
  }
  const value = (body.email || body.employeeId!).trim();
  const isEmail = value.includes("@");
  const user = isEmail
    ? await db.user.findUnique({ where: { email: value.toLowerCase() } })
    : await db.user.findUnique({ where: { employeeId: value.toUpperCase() } });

  if (!user) {
    return ok({ sent: true, preview: "If an account matches, a reset link has been sent to the registered email." });
  }
  const token = randomBytes(32).toString("hex");
  // Store token in audit log (simple approach for demo)
  await db.auditLog.create({
    data: {
      userId: user.id,
      action: "PASSWORD_RESET_REQUESTED",
      entity: "User",
      entityId: user.id,
      details: JSON.stringify({ token, expiresAt: Date.now() + 15 * 60 * 1000 }),
    },
  });
  return ok({
    sent: true,
    preview: `Reset link sent to ${user.email.replace(/(.{2}).*(@.*)/, "$1•••••$2")}. Demo token: ${token.slice(0, 12)}…`,
    devToken: token,
  });
}
