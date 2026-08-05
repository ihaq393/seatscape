import { db } from "@/lib/db";
import { getCurrentUser, hashPassword } from "@/lib/auth";
import { ok, err, unauthorized, forbidden, parseBody } from "@/lib/api-helpers";
import { audit } from "@/lib/audit";
import { AVATAR_COLORS, ROLES, AUDIT_ACTIONS } from "@/lib/constants";

export const dynamic = "force-dynamic";

function colorFor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

function requireAdmin(role: string) {
  return role === "ADMIN" || role === "DEVELOPER";
}

// GET /api/admin/employees — list all users (admin only)
export async function GET() {
  const current = await getCurrentUser();
  if (!current) return unauthorized();
  if (!requireAdmin(current.user.role)) return forbidden();

  const users = await db.user.findMany({ orderBy: { employeeId: "asc" } });
  return ok(users.map((u) => ({
    id: u.id,
    employeeId: u.employeeId,
    name: u.name,
    email: u.email,
    phone: u.phone,
    role: u.role,
    jobTitle: u.jobTitle ?? null,
    designation: u.designation ?? null,
    department: u.department ?? null,
    photoUrl: u.photoUrl ?? null,
    avatarColor: u.avatarColor ?? "#10b981",
    isActive: u.isActive,
    lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
    createdAt: u.createdAt.toISOString(),
  })));
}

// POST /api/admin/employees — create a single employee
export async function POST(request: Request) {
  const current = await getCurrentUser();
  if (!current) return unauthorized();
  if (!requireAdmin(current.user.role)) return forbidden();
  const { user } = current;

  const body = await parseBody<{
    employeeId?: string; name?: string; email?: string; phone?: string; password?: string;
    role?: string; jobTitle?: string; designation?: string; department?: string;
  }>(request);

  if (!body?.employeeId || !body?.name || !body?.email || !body?.password) {
    return err("Employee ID, name, email and password are required", 422, "VALIDATION");
  }
  const exists = await db.user.findFirst({ where: { OR: [{ employeeId: body.employeeId.toUpperCase() }, { email: body.email.toLowerCase() }] } });
  if (exists) return err("Employee ID or email already exists", 409, "DUPLICATE");

  const rec = await db.user.create({
    data: {
      employeeId: body.employeeId.toUpperCase(),
      name: body.name,
      email: body.email.toLowerCase(),
      phone: body.phone,
      passwordHash: hashPassword(body.password),
      role: (body.role as keyof typeof ROLES) ?? "EMPLOYEE",
      jobTitle: body.jobTitle,
      designation: body.designation,
      department: body.department,
      avatarColor: colorFor(body.employeeId),
    },
  });
  await audit({ userId: user.id, action: AUDIT_ACTIONS.EMPLOYEE_CREATED, entity: "User", entityId: rec.id, details: { employeeId: rec.employeeId, role: rec.role } });
  return ok({ id: rec.id, employeeId: rec.employeeId });
}
