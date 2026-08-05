// Shared API response shapes & DTOs.

export interface SeatDTO {
  id: string;
  number: string;
  label: string | null;
  isEmergency: boolean;
  isBlocked: boolean;
  posX: number;
  posY: number;
  zone: string | null;
  state: string;
  bookedBy?: {
    employeeId: string;
    name: string;
    bookingReference: string;
    status: string;
  } | null;
}

export interface BookingDTO {
  id: string;
  reference: string;
  userId: string;
  seatId: string;
  seatNumber: string;
  date: string;
  purpose: string;
  justification: string | null;
  type: string;
  status: string;
  expectedCheckIn: string;
  expectedCheckOut: string;
  checkedInAt: string | null;
  checkedOutAt: string | null;
  approvedById: string | null;
  approvedAt: string | null;
  approvalNote: string | null;
  cancelledReason: string | null;
  createdAt: string;
  employee?: { id: string; employeeId: string; name: string; jobTitle: string | null } | null;
}

export interface ApiResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
  code?: string;
}
