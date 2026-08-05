import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ok, err, unauthorized, parseBody } from "@/lib/api-helpers";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

// POST /api/profile/photo — upload own profile photo (any authenticated user)
// Body: { photo: dataURL } (base64 data URL, max ~2MB)
export async function POST(request: Request) {
  const current = await getCurrentUser();
  if (!current) return unauthorized();
  const { user } = current;

  const body = await parseBody<{ photo?: string }>(request);
  if (!body?.photo) return err("Photo data is required", 422, "VALIDATION");

  // Validate it's a data URL and reasonable size
  if (!body.photo.startsWith("data:image/")) {
    return err("Photo must be an image data URL", 422, "VALIDATION");
  }
  // ~2MB cap (base64 is ~33% larger than binary, so 2.5MB data URL ≈ 1.9MB image)
  if (body.photo.length > 2_500_000) {
    return err("Photo too large. Please use an image under 2MB.", 422, "TOO_LARGE");
  }

  await db.user.update({ where: { id: user.id }, data: { photoUrl: body.photo } });
  await audit({ userId: user.id, action: "PHOTO_UPDATED", entity: "User", entityId: user.id });
  return ok({ photoUrl: body.photo });
}

// DELETE /api/profile/photo — remove own photo
export async function DELETE() {
  const current = await getCurrentUser();
  if (!current) return unauthorized();
  const { user } = current;
  await db.user.update({ where: { id: user.id }, data: { photoUrl: null } });
  await audit({ userId: user.id, action: "PHOTO_REMOVED", entity: "User", entityId: user.id });
  return ok({ success: true });
}
