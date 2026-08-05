import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ok, err, unauthorized, forbidden, parseBody } from "@/lib/api-helpers";
import { DEFAULT_SETTINGS, AUDIT_ACTIONS } from "@/lib/constants";
import { setSetting } from "@/lib/settings";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

// GET /api/admin/settings — current system settings (admin + developer)
export async function GET() {
  const current = await getCurrentUser();
  if (!current) return unauthorized();
  if (current.user.role !== "DEVELOPER" && current.user.role !== "ADMIN") return forbidden();

  const rows = await db.setting.findMany();
  const settings: Record<string, string> = { ...DEFAULT_SETTINGS };
  for (const r of rows) settings[r.key] = r.value;
  return ok(settings);
}

// PATCH /api/admin/settings — update booking rules (developer only)
export async function PATCH(request: Request) {
  const current = await getCurrentUser();
  if (!current) return unauthorized();
  if (current.user.role !== "DEVELOPER") return forbidden("Only developers can change system settings");

  const body = await parseBody<Record<string, string>>(request);
  if (!body) return err("No settings provided", 422, "VALIDATION");

  const updated: string[] = [];
  for (const [k, v] of Object.entries(body)) {
    if (k in DEFAULT_SETTINGS) {
      await setSetting(k, v);
      updated.push(k);
    }
  }
  await audit({ userId: current.user.id, action: "SETTINGS_UPDATED", entity: "Setting", details: { keys: updated } });
  return ok({ updated });
}
