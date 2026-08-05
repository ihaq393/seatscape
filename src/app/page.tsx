"use client";

import dynamic from "next/dynamic";

// Load the shell client-side only to avoid SSR/cookie hydration mismatch
const AppShell = dynamic(() => import("@/components/app-shell").then((m) => m.AppShell), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="size-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 animate-pulse" />
        <p className="text-sm text-muted-foreground">Loading SeatScape…</p>
      </div>
    </div>
  ),
});

export default function Page() {
  return <AppShell />;
}
