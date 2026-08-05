import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ok, unauthorized, forbidden, parseBody } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

function requireDeveloper(role: string) {
  return role === "DEVELOPER";
}

// GET /api/admin/customization — current customization (admin + developer)
export async function GET() {
  const current = await getCurrentUser();
  if (!current) return unauthorized();
  if (current.user.role !== "DEVELOPER" && current.user.role !== "ADMIN") return forbidden();

  let c = await db.customization.findFirst();
  if (!c) c = await db.customization.create({ data: {} });
  return ok({
    id: c.id,
    heroTitle: c.heroTitle,
    heroSubtitle: c.heroSubtitle,
    heroBadge: c.heroBadge,
    loginLabel: c.loginLabel,
    accentColor: c.accentColor,
    officeOpenTime: c.officeOpenTime,
    officeCloseTime: c.officeCloseTime,
    brandName: c.brandName,
  });
}

// PATCH /api/admin/customization — update homepage content (developer only)
export async function PATCH(request: Request) {
  const current = await getCurrentUser();
  if (!current) return unauthorized();
  if (!requireDeveloper(current.user.role)) return forbidden("Only developers can customize the website");

  const body = await parseBody<Record<string, string>>(request);

  let c = await db.customization.findFirst();
  if (!c) c = await db.customization.create({ data: {} });

  const allowed = ["heroTitle", "heroSubtitle", "heroBadge", "loginLabel", "accentColor", "officeOpenTime", "officeCloseTime", "brandName"];
  const data: Record<string, string> = {};
  for (const k of allowed) {
    if (body?.[k] !== undefined) data[k] = body[k];
  }

  const updated = await db.customization.update({ where: { id: c.id }, data });
  return ok({
    heroTitle: updated.heroTitle,
    heroSubtitle: updated.heroSubtitle,
    heroBadge: updated.heroBadge,
    loginLabel: updated.loginLabel,
    accentColor: updated.accentColor,
    officeOpenTime: updated.officeOpenTime,
    officeCloseTime: updated.officeCloseTime,
    brandName: updated.brandName,
  });
}
