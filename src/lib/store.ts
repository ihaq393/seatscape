import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ViewKey =
  | "home"
  | "book"
  | "my-bookings"
  | "approvals"
  | "admin"
  | "control-panel"
  | "profile"
  | "signup";

interface AppState {
  user: { id: string; employeeId: string; name: string; email: string; role: string; phone?: string | null; jobTitle?: string | null; designation?: string | null; department?: string | null; photoUrl?: string | null; avatarColor: string } | null;
  setUser: (u: AppState["user"]) => void;
  view: ViewKey;
  setView: (v: ViewKey) => void;
  bookingPrefillDate: string | null;
  setBookingPrefillDate: (d: string | null) => void;
}

export const useApp = create<AppState>()(
  persist(
    (set) => ({
      user: null,
      setUser: (u) => set({ user: u }),
      view: "home",
      setView: (v) => set({ view: v }),
      bookingPrefillDate: null,
      setBookingPrefillDate: (d) => set({ bookingPrefillDate: d }),
    }),
    { name: "edunet-app", partialize: () => ({}) },
  ),
);
