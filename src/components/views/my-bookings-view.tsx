"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  CalendarDays, Clock, MapPin, QrCode, X, CheckCircle2, LogIn, LogOut,
  Loader2, Armchair,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { PageHeader, EmptyState } from "@/components/shared";
import { useApp } from "@/lib/store";
import { cn } from "@/lib/utils";
import { format, isToday, isTomorrow, isPast } from "date-fns";

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    PENDING: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
    APPROVED: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
    CHECKED_IN: "bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-500/30",
    COMPLETED: "bg-zinc-500/15 text-zinc-700 dark:text-zinc-400 border-zinc-500/30",
    CANCELLED: "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30",
    REJECTED: "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30",
  };
  return <Badge className={cn("rounded-full border text-[10px]", map[status] ?? map.APPROVED)}>{status.replace(/_/g, " ").toLowerCase()}</Badge>;
}

function BookingCard({ b, onAction }: { b: any; onAction: (b: any, action: string) => void }) {
  const d = new Date(b.date);
  const dateLabel = isToday(d) ? "Today" : isTomorrow(d) ? "Tomorrow" : format(d, "EEE, dd MMM");
  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }}>
      <Card className={cn("p-4 border-border/60 shadow-premium hover:border-emerald-500/30 transition-colors", b.status === "CHECKED_IN" && "ring-1 ring-sky-500/40")}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div className="flex flex-col items-center justify-center size-14 rounded-xl bg-gradient-to-br from-emerald-500/15 to-teal-500/10 shrink-0">
              <Armchair className="size-5 text-emerald-600" />
              <span className="text-[10px] font-bold mt-0.5">{b.seatNumber}</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-semibold truncate">{b.purpose}</p>
                <StatusBadge status={b.status} />
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
                <MapPin className="size-3" /> {dateLabel}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
                <Clock className="size-3" /> Booked at {format(new Date(b.createdAt), "h:mm a")}
                {b.checkedInAt && <span className="text-sky-600 ml-1">· checked in {format(new Date(b.checkedInAt), "h:mm a")}</span>}
              </p>
              {b.justification && (
                <p className="text-[10px] text-muted-foreground mt-1.5 italic line-clamp-2">"{b.justification}"</p>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/40">
          {b.status === "APPROVED" && (
            <>
              <Button size="sm" variant="outline" className="h-8 rounded-lg gap-1.5 text-xs" onClick={() => onAction(b, "qr")}>
                <QrCode className="size-3.5" /> QR Pass
              </Button>
              <Button size="sm" className="h-8 rounded-lg gap-1.5 text-xs bg-sky-600 hover:bg-sky-700" onClick={() => onAction(b, "checkin")}>
                <LogIn className="size-3.5" /> Check in
              </Button>
              <Button size="sm" variant="ghost" className="h-8 rounded-lg gap-1.5 text-xs text-rose-600 hover:text-rose-700 ml-auto" onClick={() => onAction(b, "cancel")}>
                <X className="size-3.5" /> Cancel
              </Button>
            </>
          )}
          {b.status === "CHECKED_IN" && (
            <>
              <Button size="sm" className="h-8 rounded-lg gap-1.5 text-xs" onClick={() => onAction(b, "checkout")}>
                <LogOut className="size-3.5" /> Check out
              </Button>
              <Button size="sm" variant="outline" className="h-8 rounded-lg gap-1.5 text-xs ml-auto" onClick={() => onAction(b, "qr")}>
                <QrCode className="size-3.5" /> Show QR
              </Button>
            </>
          )}
          {b.status === "PENDING" && (
            <Button size="sm" variant="ghost" className="h-8 rounded-lg gap-1.5 text-xs text-rose-600 ml-auto" onClick={() => onAction(b, "cancel")}>
              <X className="size-3.5" /> Cancel request
            </Button>
          )}
          {b.status === "COMPLETED" && (
            <span className="text-[10px] text-muted-foreground ml-auto">
              {b.checkedOutAt && `Left ${format(new Date(b.checkedOutAt), "HH:mm")}`}
            </span>
          )}
        </div>
      </Card>
    </motion.div>
  );
}

export function MyBookingsView() {
  const user = useApp((s) => s.user)!;
  const qc = useQueryClient();
  const [qrBooking, setQrBooking] = useState<any | null>(null);
  const [cancelBooking, setCancelBooking] = useState<any | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  const { data: bookings, isLoading } = useQuery({
    queryKey: ["bookings", user.id],
    queryFn: async () => {
      const res = await fetch("/api/bookings?mine=true");
      const json = await res.json();
      return json.data ?? [];
    },
  });

  const { data: qrData } = useQuery({
    queryKey: ["qr", qrBooking?.id],
    queryFn: async () => {
      const res = await fetch(`/api/bookings/${qrBooking.id}/qr`);
      const json = await res.json();
      return json.data;
    },
    enabled: !!qrBooking,
  });

  const checkin = useMutation({
    mutationFn: async (b: any) => {
      const res = await fetch(`/api/bookings/${b.id}/checkin`, { method: "POST" });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);
      return json.data;
    },
    onSuccess: () => {
      toast.success("Checked in!", { description: "Your seat is now marked occupied." });
      qc.invalidateQueries({ queryKey: ["bookings"] });
      setQrBooking(null);
    },
    onError: (e: Error) => toast.error("Check-in failed", { description: e.message }),
  });

  const checkout = useMutation({
    mutationFn: async (b: any) => {
      const res = await fetch(`/api/bookings/${b.id}/checkout`, { method: "POST" });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);
      return json.data;
    },
    onSuccess: () => {
      toast.success("Checked out!", { description: "Thanks for visiting." });
      qc.invalidateQueries({ queryKey: ["bookings"] });
    },
    onError: (e: Error) => toast.error("Check-out failed", { description: e.message }),
  });

  const cancel = useMutation({
    mutationFn: async (b: any) => {
      const res = await fetch(`/api/bookings/${b.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason: cancelReason || "Cancelled by user" }) });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);
      return json.data;
    },
    onSuccess: () => {
      toast.success("Booking cancelled", { description: "The seat is now available for others." });
      qc.invalidateQueries({ queryKey: ["bookings"] });
      setCancelBooking(null);
      setCancelReason("");
    },
    onError: (e: Error) => toast.error("Could not cancel", { description: e.message }),
  });

  const onAction = (b: any, action: string) => {
    if (action === "qr") setQrBooking(b);
    else if (action === "checkin") checkin.mutate(b);
    else if (action === "checkout") checkout.mutate(b);
    else if (action === "cancel") setCancelBooking(b);
  };

  // Only show upcoming bookings (not past/completed/cancelled)
  const upcoming = (bookings ?? [])
    .filter((b: any) => b.status === "APPROVED" || b.status === "PENDING" || b.status === "CHECKED_IN")
    .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-6 sm:py-8">
      <PageHeader title="My Bookings" description="Manage your upcoming reservations." />

      {isLoading ? (
        <Card className="p-10 text-center text-sm text-muted-foreground"><Loader2 className="size-5 animate-spin mx-auto mb-2" /> Loading…</Card>
      ) : upcoming.length === 0 ? (
        <EmptyState icon={CalendarDays} title="No upcoming bookings" description="Reserve a seat to see it here." action={<Button className="rounded-full" onClick={() => useApp.getState().setView("book")}>Book a seat</Button>} />
      ) : (
        <div className="space-y-3">
          {upcoming.map((b: any) => <BookingCard key={b.id} b={b} onAction={onAction} />)}
        </div>
      )}

      {/* QR dialog */}
      <Dialog open={!!qrBooking} onOpenChange={(o) => !o && setQrBooking(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><QrCode className="size-4 text-emerald-500" /> Your QR Check-in Pass</DialogTitle>
            <DialogDescription>
              {qrBooking && `Seat ${qrBooking.seatNumber} · ${format(new Date(qrBooking.date), "EEE, dd MMM")}`}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center py-2">
            {qrData?.dataUrl ? (
              <div className="rounded-2xl bg-white p-3 shadow-premium">
                <img src={qrData.dataUrl} alt="Booking QR code" className="size-52" />
              </div>
            ) : (
              <div className="size-52 rounded-2xl bg-muted animate-pulse flex items-center justify-center"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
            )}
            <p className="mt-3 text-xs font-mono text-muted-foreground">Ref: {qrBooking?.reference}</p>
            <p className="text-[11px] text-muted-foreground mt-1 text-center max-w-xs">Scan this QR at your seat to check in.</p>
          </div>
          {qrBooking?.status === "APPROVED" && (
            <Button className="w-full gap-2" disabled={checkin.isPending} onClick={() => checkin.mutate(qrBooking)}>
              {checkin.isPending ? <Loader2 className="size-4 animate-spin" /> : <LogIn className="size-4" />}
              Simulate QR scan & check in
            </Button>
          )}
        </DialogContent>
      </Dialog>

      {/* Cancel dialog */}
      <Dialog open={!!cancelBooking} onOpenChange={(o) => { if (!o) { setCancelBooking(null); setCancelReason(""); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><X className="size-4 text-rose-500" /> Cancel booking?</DialogTitle>
            <DialogDescription>
              {cancelBooking && `Seat ${cancelBooking.seatNumber} on ${format(new Date(cancelBooking.date), "EEE, dd MMM")}. The seat will become available immediately.`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label className="text-xs">Reason (optional)</Label>
            <Textarea value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="e.g. Plans changed" className="text-xs min-h-[60px]" />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => { setCancelBooking(null); setCancelReason(""); }}>Keep booking</Button>
            <Button variant="destructive" className="flex-1 gap-1.5" disabled={cancel.isPending} onClick={() => cancel.mutate(cancelBooking)}>
              {cancel.isPending ? <Loader2 className="size-4 animate-spin" /> : <X className="size-4" />} Cancel booking
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
