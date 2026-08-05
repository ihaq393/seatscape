import { NextResponse } from "next/server";
import type { ApiResponse } from "./types";

export function ok<T>(data: T, status = 200) {
  return NextResponse.json<ApiResponse<T>>({ ok: true, data }, { status });
}

export function err(message: string, status = 400, code?: string) {
  return NextResponse.json<ApiResponse>(
    { ok: false, error: message, code },
    { status },
  );
}

export function unauthorized(message = "Unauthorized") {
  return err(message, 401, "UNAUTHORIZED");
}

export function forbidden(message = "Forbidden") {
  return err(message, 403, "FORBIDDEN");
}

export function notFound(message = "Not found") {
  return err(message, 404, "NOT_FOUND");
}

export function conflict(message = "Conflict") {
  return err(message, 409, "CONFLICT");
}

export function tooMany(message = "Too many attempts. Account temporarily locked.") {
  return err(message, 429, "LOCKED");
}

export async function parseBody<T = Record<string, unknown>>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}

// Start of day (UTC) for a given date input
export function startOfDay(d: Date | string): Date {
  const date = typeof d === "string" ? new Date(d) : new Date(d);
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

export function endOfDay(d: Date | string): Date {
  const date = startOfDay(d);
  date.setUTCDate(date.getUTCDate() + 1);
  return date;
}

// Format a date as "Mon, 12 Jan"
export function fmtDate(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  });
}
