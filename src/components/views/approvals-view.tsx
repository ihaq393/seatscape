"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  CheckSquare, Clock, MapPin, AlertTriangle, Check, X, Loader2, User,
  CalendarDays, MessageSquare,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { PageHeader, EmptyState } from "@/components/shared";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

function UrgencyBadge({ u }: { u: string }) {
  const cls = u === "HIGH" ? "bg-rose-500/15 text-rose-700" : u === "MEDIUM" ? "bg-amber-500/15 text-amber-700" : "bg-zinc-500/15 text-zinc-700";
  return <Badge className={cn("rounded-full text-[10px]", cls)}>{u}</Badge>;
}

export function ApprovalsView() {
  const qc = useQueryClient();
  const [actionTarget, setActionTarget] = useState<{ b: any; action: "approve" | "reject" } | null>(null);
  const [note, setNote] = useState("");

  const { data: pending, isLoading } = useQuery({
    queryKey: ["approvals"],
    queryFn: async () => {
      const res = await fetch("/api/approvals");
      const json = await res.json();
      return json.data ?? [];
    },
  });

  const act = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/approvals/${actionTarget!.b.id}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: actionTarget!.action, note }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);
      return json.data;
    },
    onSuccess: () => {
      toast.success(actionTarget!.action === "approve" ? "Booking approved" : "Booking rejected");
      qc.invalidateQueries({ queryKey: ["approvals"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      setActionTarget(null);
      setNote("");
    },
    onError: (e: Error) => toast.error("Action failed", { description: e.message }),
  });

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-6 sm:py-8">
      <PageHeader title="Approvals" description="Review late booking requests that require manager or admin approval." />

      {isLoading ? (
        <Card className="p-10 text-center text-sm text-muted-foreground"><Loader2 className="size-5 animate-spin mx-auto mb-2" /> Loading pending requests…</Card>
      ) : pending.length === 0 ? (
        <EmptyState icon={CheckSquare} title="All caught up!" description="There are no pending approval requests right now." />
      ) : (
        <div className="space-y-3">
          {pending.map((b: any) => (
            <Card key={b.id} className="p-4 border-border/60 shadow-premium">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <Avatar className="size-11 ring-2 ring-background" style={{ backgroundColor: "#10b981" }}>
                    <AvatarFallback className="text-white text-xs font-semibold" style={{ backgroundColor: "#10b981" }}>
                      {b.employeeName.split(" ").map((n: string) => n[0]).slice(0, 2).join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold">{b.employeeName}</p>
                      <Badge variant="outline" className="rounded-md text-[10px] font-mono">{b.employeeId}</Badge>
                      <UrgencyBadge u={b.urgency} />
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{b.department} · {b.managerName ? `Reports to ${b.managerName}` : "No manager"}</p>
                    <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                      <div className="flex items-center gap-1 text-muted-foreground"><MapPin className="size-3 text-emerald-500" /> {b.seatNumber} · {b.officeName}</div>
                      <div className="flex items-center gap-1 text-muted-foreground"><CalendarDays className="size-3 text-emerald-500" /> {format(new Date(b.date), "EEE, dd MMM")}</div>
                      <div className="flex items-center gap-1 text-muted-foreground"><Clock className="size-3 text-emerald-500" /> {b.expectedCheckIn}–{b.expectedCheckOut}</div>
                      <div className="flex items-center gap-1 text-muted-foreground"><User className="size-3 text-emerald-500" /> {b.type}</div>
                    </div>
                    <div className="mt-2 rounded-lg bg-amber-500/5 border border-amber-500/20 p-2.5">
                      <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1"><AlertTriangle className="size-3" /> Justification</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 italic">"{b.justification}"</p>
                    </div>
                    <p className="text-[11px] mt-1.5"><span className="text-muted-foreground">Purpose:</span> {b.purpose}</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/40">
                <Button size="sm" className="h-8 rounded-lg gap-1.5 text-xs" onClick={() => setActionTarget({ b, action: "approve" })}>
                  <Check className="size-3.5" /> Approve
                </Button>
                <Button size="sm" variant="outline" className="h-8 rounded-lg gap-1.5 text-xs text-rose-600 hover:text-rose-700" onClick={() => setActionTarget({ b, action: "reject" })}>
                  <X className="size-3.5" /> Reject
                </Button>
                <span className="text-[10px] text-muted-foreground ml-auto">Requested {format(new Date(b.createdAt), "dd MMM, HH:mm")}</span>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!actionTarget} onOpenChange={(o) => { if (!o) { setActionTarget(null); setNote(""); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {actionTarget?.action === "approve" ? <Check className="size-4 text-emerald-500" /> : <X className="size-4 text-rose-500" />}
              {actionTarget?.action === "approve" ? "Approve booking" : "Reject booking"}
            </DialogTitle>
            <DialogDescription>
              {actionTarget && `${actionTarget.b.employeeName} · Seat ${actionTarget.b.seatNumber} · ${format(new Date(actionTarget.b.date), "EEE, dd MMM")}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label className="text-xs flex items-center gap-1"><MessageSquare className="size-3" /> Note (optional)</Label>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder={actionTarget?.action === "approve" ? "Approved — see you at the office" : "Please book earlier next time"} className="text-xs min-h-[60px]" />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => { setActionTarget(null); setNote(""); }}>Cancel</Button>
            <Button
              className={cn("flex-1 gap-1.5", actionTarget?.action === "reject" && "bg-rose-600 hover:bg-rose-700")}
              disabled={act.isPending}
              onClick={() => act.mutate()}
            >
              {act.isPending ? <Loader2 className="size-4 animate-spin" /> : actionTarget?.action === "approve" ? <Check className="size-4" /> : <X className="size-4" />}
              {actionTarget?.action === "approve" ? "Confirm approval" : "Confirm rejection"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
