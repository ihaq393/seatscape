import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { db } from "./db";
import {
  AUDIT_ACTIONS,
  MAX_LOGIN_ATTEMPTS,
  LOCK_DURATION_MINUTES,
  SESSION_COOKIE,
  SESSION_DAYS,
  ROLE_RANK,
  type Role,
} from "./constants";

const SECRET = process.env.SESSION_SECRET || "edunet-dev-secret-change-in-production-9f2k";

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const test = scryptSync(password, salt, 64);
  const target = Buffer.from(hash, "hex");
  return test.length === target.length && timingSafeEqual(test, target);
}

export interface SessionPayload {
  uid: string;
  eid: string;
  role: Role;
  iat: number;
  exp: number;
}

export function signToken(payload: Omit<SessionPayload, "iat" | "exp">): string {
  const iat = Date.now();
  const exp = iat + SESSION_DAYS * 24 * 60 * 60 * 1000;
  const body: SessionPayload = { ...payload, iat, exp };
  const data = Buffer.from(JSON.stringify(body)).toString("base64url");
  const sig = createHmac("sha256", SECRET).update(data).digest("base64url");
  return `${data}.${sig}`;
}

export function verifyToken(token: string): SessionPayload | null {
  try {
    const [data, sig] = token.split(".");
    if (!data || !sig) return null;
    const expected = createHmac("sha256", SECRET).update(data).digest("base64url");
    if (sig !== expected) return null;
    const payload = JSON.parse(Buffer.from(data, "base64url").toString("utf8")) as SessionPayload;
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function setSessionCookie(uid: string, eid: string, role: Role, remember = true) {
  const token = signToken({ uid, eid, role });
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: remember ? SESSION_DAYS * 24 * 60 * 60 : 24 * 60 * 60,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function getCurrentUser() {
  const session = await getSession();
  if (!session) return null;
  const user = await db.user.findUnique({ where: { id: session.uid } });
  if (!user || !user.isActive) return null;
  return { user, session };
}

export type AuthUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

export function hasRole(userRole: Role, required: Role): boolean {
  return ROLE_RANK[userRole] >= ROLE_RANK[required];
}

export async function recordFailedLogin(employeeId: string, ip?: string) {
  const user = await db.user.findUnique({ where: { employeeId } });
  if (!user) return;
  const attempts = user.failedAttempts + 1;
  const lockedUntil =
    attempts >= MAX_LOGIN_ATTEMPTS
      ? new Date(Date.now() + LOCK_DURATION_MINUTES * 60 * 1000)
      : null;
  await db.user.update({
    where: { id: user.id },
    data: { failedAttempts: attempts, lockedUntil },
  });
  await db.auditLog.create({
    data: {
      userId: user.id,
      action: AUDIT_ACTIONS.USER_LOGIN_FAILED,
      entity: "User",
      entityId: user.id,
      details: JSON.stringify({ attempts, ip }),
      ipAddress: ip,
    },
  });
}

export async function resetFailedLogin(userId: string) {
  await db.user.update({
    where: { id: userId },
    data: { failedAttempts: 0, lockedUntil: null, lastLoginAt: new Date() },
  });
}

export function isAccountLocked(lockedUntil: Date | null): boolean {
  return !!lockedUntil && lockedUntil.getTime() > Date.now();
}

export function getClientIP(request: Request): string | undefined {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    undefined
  );
}

export function generateReference(prefix = "EDU-BK"): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 5; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return `${prefix}-${code}`;
}
