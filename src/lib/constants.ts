// Central domain constants — simplified 3-role system.

export const ROLES = {
  DEVELOPER: "DEVELOPER",
  ADMIN: "ADMIN",
  EMPLOYEE: "EMPLOYEE",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const ROLE_LABELS: Record<Role, string> = {
  DEVELOPER: "Developer",
  ADMIN: "Admin",
  EMPLOYEE: "Employee",
};

// Role hierarchy for access checks (higher = more privileged)
// DEVELOPER is the super-customizer role — can customize anything on the website.
export const ROLE_RANK: Record<Role, number> = {
  EMPLOYEE: 1,
  ADMIN: 2,
  DEVELOPER: 3,
};

export const BOOKING_STATUS = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  CANCELLED: "CANCELLED",
  CHECKED_IN: "CHECKED_IN",
  COMPLETED: "COMPLETED",
} as const;

export type BookingStatus = (typeof BOOKING_STATUS)[keyof typeof BOOKING_STATUS];

export const BOOKING_TYPE = {
  NORMAL: "NORMAL",
  LATE: "LATE",
} as const;

export const SEAT_STATE = {
  AVAILABLE: "AVAILABLE",
  RESERVED: "RESERVED",
  OCCUPIED: "OCCUPIED",
  PENDING: "PENDING",
  BLOCKED: "BLOCKED",
  EMERGENCY: "EMERGENCY",
} as const;

export type SeatState = (typeof SEAT_STATE)[keyof typeof SEAT_STATE];

export const AUDIT_ACTIONS = {
  USER_LOGIN: "USER_LOGIN",
  USER_LOGIN_FAILED: "USER_LOGIN_FAILED",
  BOOKING_CREATED: "BOOKING_CREATED",
  BOOKING_CANCELLED: "BOOKING_CANCELLED",
  BOOKING_APPROVED: "BOOKING_APPROVED",
  BOOKING_REJECTED: "BOOKING_REJECTED",
  BOOKING_CHECKED_IN: "BOOKING_CHECKED_IN",
  BOOKING_CHECKED_OUT: "BOOKING_CHECKED_OUT",
  EMPLOYEE_CREATED: "EMPLOYEE_CREATED",
  EMPLOYEES_BULK_UPLOAD: "EMPLOYEES_BULK_UPLOAD",
  SEAT_UPDATED: "SEAT_UPDATED",
} as const;

export const MAX_LOGIN_ATTEMPTS = 5;
export const LOCK_DURATION_MINUTES = 15;
export const SESSION_DAYS = 7;
export const SESSION_COOKIE = "edu_session";

export const DEFAULT_SETTINGS: Record<string, string> = {
  BOOKING_DEADLINE_HOUR: "17",
  LATE_BOOKING_POLICY: "REQUIRE_ADMIN",
  DEFAULT_CHECK_IN: "09:00",
  DEFAULT_CHECK_OUT: "18:00",
  ORG_NAME: "Edunet Foundation",
  // Auto-approval: when true, regular seat bookings are approved instantly (first-come-first-book)
  AUTO_APPROVAL_ENABLED: "true",
  // Emergency seat auto-approval (default true — all 8 seats auto-approved by default)
  AUTO_APPROVAL_EMERGENCY: "true",
  // Whether booking times are shown on the public homepage
  SHOW_BOOKING_TIMES_PUBLIC: "true",
  // Whether the time is auto-selected for employees (no time picker) — default false (editable)
  AUTO_SELECT_BOOKING_TIME: "false",
  // Whether public signup is enabled (developer can toggle)
  SIGNUP_ENABLED: "true",
};

export const AVATAR_COLORS = [
  "#10b981", "#0d9488", "#f59e0b", "#ef4444",
  "#8b5cf6", "#ec4899", "#14b8a6", "#f97316",
  "#84cc16", "#06b6d4", "#a855f7", "#e11d48",
];
