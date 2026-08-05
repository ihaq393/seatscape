import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { ok, err, conflict, parseBody } from "@/lib/api-helpers";
import { getSettingBool } from "@/lib/settings";
import { AVATAR_COLORS } from "@/lib/constants";

export const dynamic = "force-dynamic";

function colorFor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

// POST /api/signup — public signup request (goes to admin for approval)
export async function POST(request: Request) {
  // Check if signup is enabled
  const enabled = await getSettingBool("SIGNUP_ENABLED");
  if (!enabled) return err("Signup is currently disabled. Please contact the administrator.", 403, "SIGNUP_DISABLED");

  const body = await parseBody<{
    name?: string; email?: string; employeeId?: string; phone?: string;
    jobTitle?: string; designation?: string; department?: string; password?: string;
  }>(request);

  if (!body?.name || !body?.email || !body?.employeeId || !body?.password) {
    return err("Name, email, employee ID and password are required", 422, "VALIDATION");
  }
  if (body.password.length < 8) {
    return err("Password must be at least 8 characters", 422, "VALIDATION");
  }

  const employeeId = body.employeeId.toUpperCase();
  const email = body.email.toLowerCase();

  // Check for existing user
  const existingUser = await db.user.findFirst({ where: { OR: [{ employeeId }, { email }] } });
  if (existingUser) return conflict("An account with this Employee ID or email already exists.");

  // Check for existing pending request
  const existingReq = await db.signupRequest.findFirst({
    where: { OR: [{ employeeId }, { email }], status: "PENDING" },
  });
  if (existingReq) return conflict("A signup request with this Employee ID or email is already pending approval.");

  // Create the signup request (password stored hashed — used to create the account on approval)
  const req = await db.signupRequest.create({
    data: {
      name: body.name,
      email,
      employeeId,
      phone: body.phone || null,
      jobTitle: body.jobTitle || null,
      designation: body.designation || null,
      department: body.department || null,
      passwordHash: hashPassword(body.password),
    },
  });
  void colorFor; // keep helper referenced
  return ok({ id: req.id, status: "PENDING", message: "Your signup request has been submitted. The admin will review it shortly." });
}
