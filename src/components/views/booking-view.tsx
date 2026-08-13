"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Armchair, CalendarDays, Clock, Sparkles, AlertTriangle,
  CheckCircle2, Loader2, MapPin, Info, ArrowRight, Sofa, Users, ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useApp } from "@/lib/store";
import { cn } from "@/lib/utils";
import { format, addDays, isBefore, startOfDay } from "date-fns";
import type { SeatDTO } from "@/lib/types";

const STATE_STYLE: Record<string, { ring: string; bg: string; dot: string; label: string; badge: string }> = {
  AVAILABLE: { ring: "ring-emerald-500/40 hover:ring-emerald-500", bg: "bg-emerald-500/10 hover:bg-emerald-500/20", dot: "bg-emerald-500", label: "Available", badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" },
  RESERVED: { ring: "ring-rose-500/40", bg: "bg-rose-500/10", dot: "bg-rose-500", label: "Reserved", badge: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300" },
  OCCUPIED: { ring: "ring-sky-500/40", bg: "bg-sky-500/15", dot: "bg-sky-500", label: "Occupied", badge: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300" },
  PENDING: { ring: "ring-amber-500/40", bg: "bg-amber-500/10", dot: "bg-amber-500", label: "Pending", badge: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300" },
  BLOCKED: { ring: "ring-zinc-400/40", bg: "bg-zinc-400/10", dot: "bg-zinc-400", label: "Blocked", badge: "bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300" },
  EMERGENCY: { ring: "ring-violet-500/40", bg: "bg-violet-500/10", dot: "bg-violet-500", label: "Emergency", badge: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300" },
};

function SeatNode({ seat, onSelect, selected }: { seat: SeatDTO; onSelect: (s: SeatDTO) => void; selected: boolean }) {
  const style = STATE_STYLE[seat.state] ?? STATE_STYLE.AVAILABLE;
  const disabled = seat.state !== "AVAILABLE";
  const b = seat.bookedBy as any;
  const bookedAt = (seat as any).bookedAt || b?.bookedAt;
  const timeLabel = bookedAt ? format(new Date(bookedAt), "h:mm a") : null;

  // Booked seat: show rich card with photo + name + designation + time
  if (b) {
    return (
      <div
        className={cn("group relative flex flex-col rounded-2xl ring-2 p-2.5 gap-1.5 cursor-not-allowed opacity-80", style.ring, style.bg)}
        title={`${seat.number} · ${style.label} · ${b.name}`}
      >
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold leading-none">{seat.number}</span>
          <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded-full", style.badge)}>{style.label}</span>
        </div>
        {seat.isEmergency && (
          <span className="absolute -top-1.5 -right-1.5 text-[9px] bg-violet-500 text-white rounded-full px-1.5 py-0.5 font-bold">EM</span>
        )}
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
        {timeLabel && (
          <div className="flex items-center gap-1 text-[8px] text-muted-foreground border-t border-border/40 pt-1">
            <Clock className="size-2 text-emerald-500" />
            <span>Booked {timeLabel}</span>
          </div>
        )}
      </div>
    );
  }

  // Available seat: clickable for booking
  return (
    <button
      disabled={disabled}
      onClick={() => onSelect(seat)}
      className={cn(
        "group relative flex flex-col items-center justify-center gap-1.5 rounded-2xl ring-2 transition-all p-3 min-h-[100px]",
        style.ring, style.bg,
        disabled ? "cursor-not-allowed opacity-70" : "hover:scale-105 hover:shadow-premium cursor-pointer",
        selected && "ring-4 ring-emerald-500 scale-105 shadow-glow",
      )}
      title={`${seat.number} · ${style.label}`}
    >
      <Sofa className={cn("size-5 sm:size-6", seat.isEmergency ? "text-violet-500" : "text-foreground/70")} />
      <span className="text-[10px] font-bold leading-none">{seat.number}</span>
      <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", style.badge)}>
        {style.label}
      </span>
      {seat.isEmergency && (
        <span className="absolute -top-1.5 -right-1.5 text-[9px] bg-violet-500 text-white rounded-full px-1.5 py-0.5 font-bold">EM</span>
      )}
    </button>
  );
}

function SeatMap({ seats, onSelect, selected }: { seats: SeatDTO[]; onSelect: (s: SeatDTO) => void; selected: SeatDTO | null }) {
  const maxX = Math.max(...seats.map((s) => s.posX), 4);
  const maxY = Math.max(...seats.map((s) => s.posY), 4);
  return (
    <div className="relative rounded-2xl border-2 border-border/60 bg-gradient-to-br from-muted/30 to-background p-4 sm:p-6">
      <div className="absolute inset-x-4 top-3 flex items-center justify-between text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1"><MapPin className="size-3" /> Office Floor Plan</span>
      </div>
      <div className="mt-6 mb-3 h-px bg-border/60" />
      <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${maxX + 1}, minmax(0, 1fr))`, gridAutoRows: "auto" }}>
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
          return <SeatNode key={seat.id} seat={seat} onSelect={onSelect} selected={selected?.id === seat.id} />;
        })}
      </div>
      <div className="mt-4 flex items-center justify-between">
        <Badge variant="outline" className="rounded-md gap-1"><Users className="size-3" /> Meeting Room adjacent to S7</Badge>
        <div className="flex items-center gap-2 text-[10px] flex-wrap justify-end">
          {Object.entries(STATE_STYLE).map(([k, v]) => (
            <span key={k} className="flex items-center gap-1"><span className={cn("size-2 rounded-full", v.dot)} /> {v.label}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

export function BookingView() {
  const user = useApp((s) => s.user)!;
  const prefillDate = useApp((s) => s.bookingPrefillDate);
  const setView = useApp((s) => s.setView);
  const qc = useQueryClient();

  const [date, setDate] = useState<Date>(prefillDate ? new Date(prefillDate) : addDays(new Date(), 1));
  const [selectedSeat, setSelectedSeat] = useState<SeatDTO | null>(null);
  const [purpose, setPurpose] = useState("");
  const [expectedIn, setExpectedIn] = useState("09:00");
  const [expectedOut, setExpectedOut] = useState("18:00");
  const [justification, setJustification] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [successRef, setSuccessRef] = useState<string | null>(null);
  const [successPending, setSuccessPending] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  // Load customization to know if time should be auto-selected
  const { data: custom } = useQuery({
    queryKey: ["customization"],
    queryFn: async () => {
      const res = await fetch("/api/customization");
      const json = await res.json();
      return json.data ?? {};
    },
    staleTime: 60_000,
  });
  const autoSelectTime = custom?.autoSelectTime !== false; // default true
  const defaultIn = custom?.defaultCheckIn || "10:00";
  const defaultOut = custom?.defaultCheckOut || "18:00";

  const { data: seatsData, isLoading } = useQuery<{ seats: SeatDTO[] }>({
    queryKey: ["seats", date.toISOString()],
    queryFn: async () => {
      const res = await fetch(`/api/seats?date=${date.toISOString()}`);
      const json = await res.json();
      return json.data ?? { seats: [] };
    },
    staleTime: 15_000,
  });

  const seats = seatsData?.seats ?? [];

  // Late booking = after 5 PM the day before
  const isLate = useMemo(() => {
    const dayBefore = new Date(date);
    dayBefore.setUTCDate(dayBefore.getUTCDate() - 1);
    dayBefore.setUTCHours(17, 0, 0, 0);
    return new Date().getTime() > dayBefore.getTime();
  }, [date]);

  const createBooking = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          seatId: selectedSeat?.id,
          date: date.toISOString(),
          purpose,
          expectedCheckIn: expectedIn,
          expectedCheckOut: expectedOut,
          justification: isLate ? justification : undefined,
        }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Booking failed");
      return json.data;
    },
    onSuccess: (data) => {
      setSuccessRef(data.reference);
      setSuccessPending(data.status === "PENDING");
      setConfirmOpen(false);
      qc.invalidateQueries({ queryKey: ["seats"] });
      qc.invalidateQueries({ queryKey: ["bookings"] });
      toast.success("Seat reserved!", { description: `${data.seatNumber} · ${format(date, "EEE, dd MMM")}` });
    },
    onError: (e: Error) => {
      toast.error("Could not book", { description: e.message });
      setConfirmOpen(false);
    },
  });

  const submit = () => {
    if (!selectedSeat) { toast.error("Pick a seat first"); return; }
    if (isLate && !justification.trim()) { toast.error("Late bookings require a justification"); return; }
    setConfirmOpen(true);
  };

  const availableCount = seats.filter((s) => s.state === "AVAILABLE").length;

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-6 sm:py-8">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Book a Seat</h1>
        <p className="text-sm text-muted-foreground mt-1">Choose a date and pick an available seat on the live map.</p>
      </div>

      <div className="space-y-4">
        {/* Date picker — centered above the seat map */}
        <div className="flex justify-center">
          <Card className="p-3 border-border/60 shadow-premium max-w-sm w-full">
            <div className="flex items-center justify-between px-1 pb-2">
              <p className="text-xs font-medium flex items-center gap-1.5"><CalendarDays className="size-3.5 text-emerald-500" /> Select date</p>
              <Badge variant="outline" className="rounded-md text-[10px]">{format(date, "MMM yyyy")}</Badge>
            </div>
            <Calendar
              mode="single"
              selected={date}
              onSelect={(d) => { if (d) { setDate(d); setSelectedSeat(null); } }}
              disabled={(d) => isBefore(startOfDay(d), startOfDay(new Date()))}
              className="rounded-lg mx-auto"
            />
          </Card>
        </div>

        {/* Booking Details — collapsible, not compulsory */}
        <div className="flex justify-center">
          <div className="max-w-md w-full space-y-3">
            <Button
              variant="outline"
              className="w-full justify-between rounded-xl h-9 text-xs"
              onClick={() => setShowDetails((v) => !v)}
            >
              <span className="flex items-center gap-1.5"><Info className="size-3.5 text-emerald-500" /> Booking details (optional)</span>
              <ChevronDown className={cn("size-3.5 transition-transform", showDetails && "rotate-180")} />
            </Button>
            {showDetails && (
              <Card className="p-4 border-border/60 shadow-premium">
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[11px] text-muted-foreground">Check-in</Label>
                      <Input type="time" value={expectedIn} onChange={(e) => setExpectedIn(e.target.value)} className="h-9 text-xs" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] text-muted-foreground">Check-out</Label>
                      <Input type="time" value={expectedOut} onChange={(e) => setExpectedOut(e.target.value)} className="h-9 text-xs" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">Purpose of visit</Label>
                    <Textarea value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="e.g. Team meeting" className="text-xs min-h-[60px]" />
                  </div>
                </div>
              </Card>
            )}

            {isLate && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}>
                <Card className="p-4 border-amber-500/40 bg-amber-500/5">
                  <div className="flex gap-2 mb-2">
                    <AlertTriangle className="size-4 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold">Late booking detected</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">It's past 5 PM the day before. Provide a justification — this will require admin approval.</p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">Justification *</Label>
                    <Textarea value={justification} onChange={(e) => setJustification(e.target.value)} placeholder="Why do you need to visit on short notice?" className="text-xs min-h-[50px]" />
                  </div>
                </Card>
              </motion.div>
            )}
          </div>
        </div>

        {/* Seat map — centered */}
        <div className="space-y-4">
          <Card className="p-4 border-border/60 shadow-premium">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-500/10">
                  <Armchair className="size-4 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Live Seat Map</p>
                  <p className="text-[11px] text-muted-foreground">{format(date, "EEEE, dd MMMM yyyy")}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">
                  <span className="size-1.5 rounded-full bg-emerald-500 mr-1" /> {availableCount} available
                </Badge>
                {selectedSeat && (
                  <Badge className="rounded-full bg-foreground text-background">Selected: {selectedSeat.number}</Badge>
                )}
              </div>
            </div>
          </Card>

          {isLoading ? (
            <Card className="p-10 text-center text-sm text-muted-foreground"><Loader2 className="size-5 animate-spin mx-auto mb-2" /> Loading seat map…</Card>
          ) : (
            <SeatMap seats={seats} onSelect={setSelectedSeat} selected={selectedSeat} />
          )}

          {/* Action bar */}
          <div className="sticky bottom-4 z-10">
            <Card className="p-3 border-border/60 glass-strong shadow-premium flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                {selectedSeat ? (
                  <>
                    <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/15">
                      <Armchair className="size-5 text-emerald-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">Seat {selectedSeat.number} · {selectedSeat.label}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{selectedSeat.zone} · {expectedIn}–{expectedOut}</p>
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground px-2">Select an available seat to continue</p>
                )}
              </div>
              <Button disabled={!selectedSeat} onClick={submit} className="rounded-full gap-2 shadow-premium">
                <Sparkles className="size-4" /> Reserve seat
              </Button>
            </Card>
          </div>
        </div>
      </div>

      {/* Confirm dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><CheckCircle2 className="size-4 text-emerald-500" /> Confirm your reservation</DialogTitle>
            <DialogDescription>Review the details before confirming.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2.5 py-2">
            {[
              { label: "Seat", value: selectedSeat ? `${selectedSeat.number} · ${selectedSeat.label}` : "—" },
              { label: "Date", value: format(date, "EEEE, dd MMMM yyyy") },
              { label: "Time", value: `${expectedIn} – ${expectedOut}` },
              ...(purpose.trim() ? [{ label: "Purpose", value: purpose }] : []),
              ...(isLate ? [{ label: "Justification", value: justification }] : []),
              ...(isLate ? [{ label: "Approval", value: "Requires admin approval" }] : []),
            ].map((row) => (
              <div key={row.label} className="flex justify-between gap-4 text-sm">
                <span className="text-muted-foreground">{row.label}</span>
                <span className="font-medium text-right">{row.value}</span>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancel</Button>
            <Button disabled={createBooking.isPending} onClick={() => createBooking.mutate()} className="gap-2">
              {createBooking.isPending ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
              Confirm booking
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success dialog */}
      <Dialog open={!!successRef} onOpenChange={(o) => { if (!o) setSuccessRef(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex size-12 items-center justify-center rounded-2xl bg-emerald-500/15 mb-2">
              <CheckCircle2 className="size-6 text-emerald-600" />
            </div>
            <DialogTitle>Seat reserved!</DialogTitle>
            <DialogDescription>
              Your booking <span className="font-mono font-semibold text-foreground">{successRef}</span> is confirmed.
              {successPending && " It's pending admin approval — you'll get a notification."}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 py-2 text-xs text-muted-foreground">
            <p className="flex items-center gap-1.5"><Clock className="size-3.5 text-emerald-500" /> A reminder will be sent before your visit.</p>
            <p className="flex items-center gap-1.5"><MapPin className="size-3.5 text-emerald-500" /> Check in at your seat when you arrive.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setSuccessRef(null); setView("my-bookings"); }}>View my bookings</Button>
            <Button onClick={() => { setSuccessRef(null); setSelectedSeat(null); setPurpose(""); }}>Book another</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
