import { getCurrentUser } from "@/lib/auth";
import { ok, unauthorized } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

export async function GET() {
  const current = await getCurrentUser();
  if (!current) return unauthorized();
  const { user } = current;
  return ok({
    id: user.id,
    employeeId: user.employeeId,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone ?? null,
    jobTitle: user.jobTitle ?? null,
    designation: user.designation ?? null,
    department: user.department ?? null,
    photoUrl: user.photoUrl ?? null,
    avatarColor: user.avatarColor ?? "#10b981",
  });
}
