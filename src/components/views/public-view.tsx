"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Armchair, Users, CheckCircle2, Lock, CalendarDays, ArrowRight, Sofa, ChevronDown, Clock, UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useApp } from "@/lib/store";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const STATE_STYLE: Record<string, { ring: string; bg: string; dot: string; label: string; badge: string }> = {
  AVAILABLE: { ring: "ring-emerald-500/40 hover:ring-emerald-500", bg: "bg-emerald-500/10 hover:bg-emerald-500/20", dot: "bg-emerald-500", label: "Available", badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" },
  RESERVED: { ring: "ring-rose-500/40", bg: "bg-rose-500/10", dot: "bg-rose-500", label: "Reserved", badge: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300" },
  OCCUPIED: { ring: "ring-sky-500/40", bg: "bg-sky-500/15", dot: "bg-sky-500", label: "Occupied", badge: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300" },
  PENDING: { ring: "ring-amber-500/40", bg: "bg-amber-500/10", dot: "bg-amber-500", label: "Pending", badge: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300" },
  BLOCKED: { ring: "ring-zinc-400/40", bg: "bg-zinc-400/10", dot: "bg-zinc-400", label: "Blocked", badge: "bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300" },
  EMERGENCY: { ring: "ring-violet-500/40", bg: "bg-violet-500/10", dot: "bg-violet-500", label: "Emergency", badge: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300" },
};

function SeatNode({ seat, showDetails }: { seat: any; showDetails: boolean }) {
  const style = STATE_STYLE[seat.state] ?? STATE_STYLE.AVAILABLE;
  const b = showDetails ? seat.bookedBy : null;
  const bookedAt = seat.bookedAt || (b?.bookedAt);
  const timeLabel = bookedAt ? format(new Date(bookedAt), "h:mm a") : null;

  // When logged in and seat is booked, show a rich card with photo + name + designation + time
  if (b && showDetails) {
    return (
      <div
        className={cn("group relative flex flex-col rounded-2xl ring-2 p-2.5 gap-1.5", style.ring, style.bg)}
        title={`${seat.number} · ${style.label} · ${b.name}`}
      >
        {/* Top row: seat number + status badge */}
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold leading-none">{seat.number}</span>
          <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded-full", style.badge)}>{style.label}</span>
        </div>
        {seat.isEmergency && (
          <span className="absolute -top-1.5 -right-1.5 text-[9px] bg-violet-500 text-white rounded-full px-1.5 py-0.5 font-bold">EM</span>
        )}
        {/* Avatar + name */}
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="size-7 rounded-full overflow-hidden ring-2 ring-background shrink-0" style={{ backgroundColor: b.avatarColor }}>
            {b.photoUrl ? (
              <img src={b.photoUrl} alt={b.name} className="size-full object-cover" />
            ) : (
              <span className="flex size-full items-center justify-center text-[9px] font-bold text-white">
                {b.name.split(" ").map((n: string) => n[0]).slice(0, 2).join("")}
              </span>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold truncate leading-tight">{b.name}</p>
            {b.designation && <p className="text-[8px] text-muted-foreground truncate leading-tight">{b.designation}</p>}
          </div>
        </div>
        {/* Booked-at time */}
        {timeLabel && (
          <div className="flex items-center gap-1 text-[8px] text-muted-foreground border-t border-border/40 pt-1">
            <Clock className="size-2 text-emerald-500" />
            <span>Booked {timeLabel}</span>
          </div>
        )}
        {b.purpose && <p className="text-[8px] text-muted-foreground truncate" title={b.purpose}>{b.purpose}</p>}
      </div>
    );
  }

  // Public (not logged in): show seat number + status badge + booked-at time
  return (
    <div
      className={cn("group relative flex flex-col items-center justify-center gap-2 rounded-2xl ring-2 p-3 min-h-[100px]", style.ring, style.bg)}
      title={`${seat.number} · ${style.label}${timeLabel ? ` · Booked ${timeLabel}` : ""}`}
    >
      <Sofa className={cn("size-5 sm:size-6", seat.isEmergency ? "text-violet-500" : "text-foreground/70")} />
      <span className="text-xs font-bold leading-none">{seat.number}</span>
      {/* Status badge — opaque background with high-contrast text */}
      <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", style.badge)}>
        {style.label}
      </span>
      {seat.isEmergency && (
        <span className="absolute -top-1.5 -right-1.5 text-[9px] bg-violet-500 text-white rounded-full px-1.5 py-0.5 font-bold">EM</span>
      )}
      {timeLabel && (
        <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 text-[8px] bg-foreground/80 text-background rounded-full px-1.5 py-0.5 font-medium whitespace-nowrap">
          {timeLabel}
        </span>
      )}
    </div>
  );
}

function SeatMap({ seats, showDetails }: { seats: any[]; showDetails: boolean }) {
  const maxX = Math.max(...seats.map((s) => s.posX), 4);
  const maxY = Math.max(...seats.map((s) => s.posY), 4);
  return (
    <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${maxX + 1}, minmax(0, 1fr))`, gridAutoRows: showDetails ? "auto" : undefined }}>
      {Array.from({ length: (maxY + 1) * (maxX + 1) }).map((_, idx) => {
        const x = idx % (maxX + 1);
        const y = Math.floor(idx / (maxX + 1));
        const seat = seats.find((s) => s.posX === x && s.posY === y);
        if (!seat) {
          if (y === 1 && x >= 1) {
            return <div key={idx} className="flex items-center justify-center text-[9px] text-muted-foreground/40 border border-dashed border-border/40 rounded-xl py-1">aisle</div>;
          }
          return <div key={idx} />;
        }
        return <SeatNode key={seat.id} seat={seat} showDetails={showDetails} />;
      })}
    </div>
  );
}

export function PublicView() {
  const setView = useApp((s) => s.setView);
  const user = useApp((s) => s.user);
  const [date, setDate] = useState<Date>(new Date());
  const [calOpen, setCalOpen] = useState(false);

  // Load customization (editable by developer)
  const { data: custom } = useQuery({
    queryKey: ["customization"],
    queryFn: async () => {
      const res = await fetch("/api/customization");
      const json = await res.json();
      return json.data ?? {};
    },
    staleTime: 60_000,
  });

  const { data: seatsData, isLoading } = useQuery<{ seats: any[] }>({
    queryKey: ["seats", date.toISOString()],
    queryFn: async () => {
      const res = await fetch(`/api/seats?date=${date.toISOString()}`);
      const json = await res.json();
      return json.data ?? { seats: [] };
    },
    staleTime: 15_000,
  });

  const seats = seatsData?.seats ?? [];
  const availableCount = seats.filter((s) => s.state === "AVAILABLE").length;
  const reservedCount = seats.filter((s) => s.state === "RESERVED" || s.state === "OCCUPIED" || s.state === "PENDING").length;

  const heroTitle = custom?.heroTitle || "Reserve your seat here";
  const heroSubtitle = custom?.heroSubtitle || "Check live seat availability and book your desk in seconds.";
  const loginLabel = "Login";

  return (
    <div className="bg-mesh min-h-full">
      {/* Hero — centered */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-60" />
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 pt-10 pb-6 sm:pt-14">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="max-w-2xl mx-auto text-center"
          >
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight leading-[1.1]">
              {heroTitle.split(" ").slice(0, -1).join(" ")} <span className="text-gradient">{heroTitle.split(" ").slice(-1)}</span>
            </h1>
            <p className="mt-4 text-sm sm:text-base text-muted-foreground max-w-xl leading-relaxed mx-auto">
              {heroSubtitle}
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              {!user ? (
                <>
                  <Button size="lg" className="rounded-full gap-2 shadow-glow h-11 px-6" onClick={() => setView("book")}>
                    <Lock className="size-4" /> {loginLabel}
                  </Button>
                  {custom?.signupEnabled !== false && (
                    <Button size="lg" variant="outline" className="rounded-full gap-2 h-11 px-6" onClick={() => setView("signup")}>
                      <UserPlus className="size-4" /> Sign up
                    </Button>
                  )}
                </>
              ) : (
                <Button size="lg" className="rounded-full gap-2 shadow-glow h-11 px-6" onClick={() => setView("book")}>
                  <Armchair className="size-4" /> Book a seat <ArrowRight className="size-4" />
                </Button>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Live Seat Map — centered container */}
      <section className="mx-auto max-w-4xl px-4 sm:px-6 pb-12">
        <Card className="p-4 sm:p-6 border-border/60 shadow-premium">
          {/* Header: title + clickable date + available badge */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <div>
              <p className="text-sm font-semibold">Seat Availability</p>
              {/* Clickable date button — opens calendar popover */}
              <Popover open={calOpen} onOpenChange={setCalOpen}>
                <PopoverTrigger asChild>
                  <button className="mt-1 inline-flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors group">
                    <CalendarDays className="size-3.5 text-emerald-500" />
                    {format(date, "EEEE, dd MMMM yyyy")}
                    <ChevronDown className="size-3 opacity-50 group-hover:opacity-100 transition-opacity" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(d) => { if (d) { setDate(d); setCalOpen(false); } }}
                    disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                    className="rounded-lg border-0"
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className="rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">
                <span className="size-1.5 rounded-full bg-emerald-500 mr-1" /> {isLoading ? "—" : availableCount} available
              </Badge>
              {/* Compact legend */}
              <div className="hidden sm:flex items-center gap-2 text-[10px]">
                {Object.entries(STATE_STYLE).map(([k, v]) => (
                  <span key={k} className="flex items-center gap-1">
                    <span className={cn("size-2 rounded-full", v.dot)} />
                    <span className="text-muted-foreground">{v.label}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Seat map */}
          {isLoading ? (
            <div className="py-10 text-center text-sm text-muted-foreground">Loading seat map…</div>
          ) : (
            <SeatMap seats={seats} showDetails={!!user} />
          )}

          {/* Mobile legend */}
          <div className="sm:hidden mt-4 flex flex-wrap items-center gap-2 text-[10px]">
            {Object.entries(STATE_STYLE).map(([k, v]) => (
              <span key={k} className="flex items-center gap-1">
                <span className={cn("size-2 rounded-full", v.dot)} />
                <span className="text-muted-foreground">{v.label}</span>
              </span>
            ))}
          </div>
        </Card>
      </section>
    </div>
  );
}
