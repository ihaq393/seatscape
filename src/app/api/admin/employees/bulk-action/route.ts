import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ok, err, unauthorized, forbidden, parseBody } from "@/lib/api-helpers";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

function requireAdmin(role: string) {
  return role === "ADMIN" || role === "DEVELOPER";
}

// POST /api/admin/employees/bulk-action
// Body: { ids: string[], action: "activate" | "deactivate" | "delete" }
export async function POST(request: Request) {
  const current = await getCurrentUser();
  if (!current) return unauthorized();
  if (!requireAdmin(current.user.role)) return forbidden();
  const { user } = current;

  const body = await parseBody<{ ids?: string[]; action?: "activate" | "deactivate" | "delete" }>(request);
  if (!body?.ids || !Array.isArray(body.ids) || body.ids.length === 0) {
    return err("At least one employee must be selected", 422, "VALIDATION");
  }
  if (!body.action || !["activate", "deactivate", "delete"].includes(body.action)) {
    return err("Invalid action", 422, "VALIDATION");
  }

  // Prevent acting on own account
  if (body.ids.includes(user.id)) {
    return err("You cannot perform this action on your own account", 400, "SELF_ACTION");
  }

  const ids = body.ids;
  let affected = 0;

  if (body.action === "delete") {
    const result = await db.user.deleteMany({ where: { id: { in: ids } } });
    affected = result.count;
  } else {
    const isActive = body.action === "activate";
    const result = await db.user.updateMany({ where: { id: { in: ids } }, data: { isActive } });
    affected = result.count;
  }

  await audit({ userId: user.id, action: `EMPLOYEES_BULK_${body.action.toUpperCase()}`, entity: "User", details: { count: affected, ids } });
  return ok({ action: body.action, affected });
}
