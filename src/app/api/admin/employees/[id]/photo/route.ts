import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ok, err, unauthorized, forbidden, notFound, parseBody } from "@/lib/api-helpers";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

// POST /api/admin/employees/[id]/photo — admin/dev sets a user's photo
// Body: { photo: dataURL } or {} to remove
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const current = await getCurrentUser();
  if (!current) return unauthorized();
  const { user } = current;
  const isDev = user.role === "DEVELOPER";
  const isAdmin = user.role === "ADMIN";
  if (!isDev && !isAdmin) return forbidden();

  const { id } = await params;
  const target = await db.user.findUnique({ where: { id } });
  if (!target) return notFound("Employee not found");

  // Admin cannot modify a developer's photo
  if (isAdmin && target.role === "DEVELOPER") {
    return forbidden("Admins cannot modify a developer's photo");
  }

  const body = await parseBody<{ photo?: string | null }>(request);
  if (body?.photo === null) {
    await db.user.update({ where: { id }, data: { photoUrl: null } });
    await audit({ userId: user.id, action: "PHOTO_REMOVED", entity: "User", entityId: id });
    return ok({ photoUrl: null });
  }
  if (!body?.photo) return err("Photo data is required", 422, "VALIDATION");
  if (!body.photo.startsWith("data:image/")) return err("Photo must be an image data URL", 422, "VALIDATION");
  if (body.photo.length > 2_500_000) return err("Photo too large (max 2MB)", 422, "TOO_LARGE");

  await db.user.update({ where: { id }, data: { photoUrl: body.photo } });
  await audit({ userId: user.id, action: "PHOTO_UPDATED", entity: "User", entityId: id });
  return ok({ photoUrl: body.photo });
}
