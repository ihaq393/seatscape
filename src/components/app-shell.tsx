"use client";

import { useEffect, useState } from "react";
import { useApp, type ViewKey } from "@/lib/store";
import { useRefreshAuth } from "@/components/providers";
import { ROLE_LABELS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import {
  Armchair, CalendarDays, CheckSquare, Settings,
  LogOut, Sun, Moon, Menu, Home, ChevronRight, SlidersHorizontal, User,
} from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { PublicView } from "@/components/views/public-view";
import { LoginView } from "@/components/views/login-view";
import { BookingView } from "@/components/views/booking-view";
import { MyBookingsView } from "@/components/views/my-bookings-view";
import { ApprovalsView } from "@/components/views/approvals-view";
import { AdminView } from "@/components/views/admin-view";
import { ControlPanelView } from "@/components/views/control-panel-view";
import { ProfileView } from "@/components/views/profile-view";
import { SignupView } from "@/components/views/signup-view";

interface NavItem {
  key: ViewKey;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: string[];
}

const NAV: NavItem[] = [
  { key: "home", label: "Home", icon: Home, roles: ["EMPLOYEE", "DEVELOPER", "ADMIN"] },
  { key: "book", label: "Book a Seat", icon: Armchair, roles: ["EMPLOYEE", "DEVELOPER", "ADMIN"] },
  { key: "my-bookings", label: "My Bookings", icon: CalendarDays, roles: ["EMPLOYEE", "DEVELOPER", "ADMIN"] },
  { key: "approvals", label: "Approvals", icon: CheckSquare, roles: ["ADMIN"] },
  { key: "admin", label: "Admin Panel", icon: Settings, roles: ["ADMIN"] },
  { key: "control-panel", label: "Control Panel", icon: SlidersHorizontal, roles: ["DEVELOPER"] },
  { key: "profile", label: "Profile", icon: User, roles: ["EMPLOYEE", "DEVELOPER", "ADMIN"] },
];

function getNavItems(role: string): NavItem[] {
  return NAV.filter((n) => n.roles.includes(role));
}

function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="size-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-glow">
        <Armchair className="size-5 text-white" />
      </div>
      <div className="leading-tight">
        <p className="font-semibold text-sm tracking-tight">SeatScape</p>
      </div>
    </div>
  );
}

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);
  if (!mounted) return <div className="size-9" />;
  const isDark = theme === "dark";
  return (
    <Button
      variant="ghost"
      size="icon"
      className="rounded-full"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label="Toggle theme"
    >
      {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const user = useApp((s) => s.user);
  const view = useApp((s) => s.view);
  const setView = useApp((s) => s.setView);
  const role = user?.role ?? "EMPLOYEE";
  const items = getNavItems(role);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    const { useRefreshAuth } = await import("@/components/providers");
    // Use the global refresh function
    const fn = (window as any).__refreshAuth;
    if (fn) await fn();
    useApp.getState().setView("home");
    onNavigate?.();
  };

  return (
    <nav className="flex flex-col gap-1 p-3 h-full">
      <div className="flex-1">
        {items.map((item) => {
          const active = view === item.key;
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              onClick={() => { setView(item.key); onNavigate?.(); }}
              className={cn(
                "group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                active
                  ? "bg-gradient-to-r from-emerald-500/15 to-teal-500/10 text-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              <span className={cn("flex size-8 items-center justify-center rounded-lg transition-colors", active ? "bg-primary text-primary-foreground" : "bg-muted/60 group-hover:bg-accent")}>
                <Icon className="size-4" />
              </span>
              <span className="flex-1 text-left">{item.label}</span>
              {active && <ChevronRight className="size-4 text-primary" />}
            </button>
          );
        })}
      </div>
      {/* Logout button at the bottom of the sidebar */}
      <div className="pt-3 border-t border-border/40">
        <button
          onClick={logout}
          className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-rose-600 hover:bg-rose-500/10 transition-all"
        >
          <span className="flex size-8 items-center justify-center rounded-lg bg-rose-500/10 group-hover:bg-rose-500/20 transition-colors">
            <LogOut className="size-4" />
          </span>
          <span className="flex-1 text-left">Logout</span>
        </button>
      </div>
    </nav>
  );
}

function TopBar() {
  const user = useApp((s) => s.user);
  const setView = useApp((s) => s.setView);
  const refreshAuth = useRefreshAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    await refreshAuth();
    useApp.getState().setView("home");
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 glass">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
        {user && (
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <SheetHeader className="px-4 py-4 border-b">
                <SheetTitle><Brand /></SheetTitle>
              </SheetHeader>
              <SidebarContent onNavigate={() => setMobileOpen(false)} />
            </SheetContent>
          </Sheet>
        )}

        <div className="hidden md:block"><Brand /></div>
        <div className="flex-1" />

        {user ? (
          <>
            <ThemeToggle />
            <div className="hidden sm:flex items-center gap-2 pl-2 ml-1 border-l">
              <Avatar className="size-8 ring-2 ring-background shadow-sm" style={{ backgroundColor: user.avatarColor }}>
                {user.photoUrl ? <img src={user.photoUrl} alt={user.name} className="size-full object-cover rounded-full" /> : <AvatarFallback className="text-white text-xs font-semibold" style={{ backgroundColor: user.avatarColor }}>{user.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}</AvatarFallback>}
              </Avatar>
              <div className="hidden lg:block leading-tight">
                <p className="text-xs font-semibold">{user.name}</p>
                <p className="text-[10px] text-muted-foreground">{ROLE_LABELS[user.role as keyof typeof ROLE_LABELS]}</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="rounded-full" onClick={logout} aria-label="Sign out">
              <LogOut className="size-4" />
            </Button>
          </>
        ) : (
          <ThemeToggle />
        )}
      </div>
    </header>
  );
}

function ViewRouter() {
  const user = useApp((s) => s.user);
  const view = useApp((s) => s.view);

  if (!user) {
    return view === "book" || view === "my-bookings" || view === "approvals" || view === "admin" || view === "control-panel" || view === "profile" ? <LoginView /> : view === "signup" ? <SignupView /> : <PublicView />;
  }

  switch (view) {
    case "home":
      return <PublicView />;
    case "book":
      return <BookingView />;
    case "my-bookings":
      return <MyBookingsView />;
    case "approvals":
      return <ApprovalsView />;
    case "admin":
      return <AdminView />;
    case "control-panel":
      return <ControlPanelView />;
    case "profile":
      return <ProfileView />;
    default:
      return <PublicView />;
  }
}

function Footer() {
  return (
    <footer className="mt-auto border-t border-border/60 bg-muted/30 shrink-0">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-3">
        <div className="flex items-center justify-center gap-2 text-[11px] sm:text-xs text-muted-foreground whitespace-nowrap">
          <div className="size-4 rounded-md bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shrink-0">
            <Armchair className="size-2.5 text-white" />
          </div>
          <span className="font-semibold text-foreground">SeatScape</span>
          <span className="text-muted-foreground/40">—</span>
          <span>Crafted with care by</span>
          <span className="font-semibold text-foreground">Inamul Haq</span>
        </div>
      </div>
    </footer>
  );
}

export function AppShell() {
  const user = useApp((s) => s.user);
  const [booting, setBooting] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setBooting(false), 100);
    return () => clearTimeout(t);
  }, []);

  if (booting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="size-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 animate-pulse" />
          <p className="text-sm text-muted-foreground">Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background bg-mesh">
      <TopBar />
      <div className="flex flex-1 w-full">
        {user && (
          <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-border/60 bg-sidebar/40 backdrop-blur-sm sticky top-16 h-[calc(100vh-4rem)]">
            <SidebarContent />
          </aside>
        )}
        <main className="flex-1 min-w-0">
          <ViewRouter />
        </main>
      </div>
      <Footer />
      <SonnerToaster />
    </div>
  );
}
