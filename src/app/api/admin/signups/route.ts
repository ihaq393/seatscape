import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ok, unauthorized, forbidden } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

function requireAdmin(role: string) {
  return role === "ADMIN" || role === "DEVELOPER";
}

// GET /api/admin/signups?status=PENDING|APPROVED|REJECTED|all — list signup requests
export async function GET(request: Request) {
  const current = await getCurrentUser();
  if (!current) return unauthorized();
  if (!requireAdmin(current.user.role)) return forbidden();

  const url = new URL(request.url);
  const status = url.searchParams.get("status");

  const where = status && status !== "all" ? { status } : {};
  const requests = await db.signupRequest.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });
  return ok(requests.map((r) => ({
    id: r.id,
    name: r.name,
    email: r.email,
    employeeId: r.employeeId,
    phone: r.phone,
    jobTitle: r.jobTitle,
    designation: r.designation,
    department: r.department,
    status: r.status,
    reviewedAt: r.reviewedAt?.toISOString() ?? null,
    reviewNote: r.reviewNote,
    createdAt: r.createdAt.toISOString(),
  })));
}
