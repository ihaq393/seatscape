import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ok, unauthorized, forbidden } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

// GET /api/admin/audit-logs — recent audit log entries (DEVELOPER only)
export async function GET(request: Request) {
  const current = await getCurrentUser();
  if (!current) return unauthorized();
  if (current.user.role !== "DEVELOPER") return forbidden();

  const url = new URL(request.url);
  const limit = Math.min(Number(url.searchParams.get("limit") || "50"), 200);

  const logs = await db.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  // Manually resolve user names for any referenced userIds
  const userIds = [...new Set(logs.map((l) => l.userId).filter(Boolean))] as string[];
  const users = userIds.length ? await db.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, employeeId: true } }) : [];
  const userMap = new Map(users.map((u) => [u.id, u]));

  return ok(logs.map((l) => ({
    id: l.id,
    action: l.action,
    entity: l.entity,
    entityId: l.entityId,
    details: l.details,
    ipAddress: l.ipAddress,
    userName: l.userId ? userMap.get(l.userId)?.name ?? null : null,
    userEmployeeId: l.userId ? userMap.get(l.userId)?.employeeId ?? null : null,
    createdAt: l.createdAt.toISOString(),
  })));
}
