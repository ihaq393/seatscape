"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  SlidersHorizontal, Palette, Clock, CalendarDays, Users, Armchair,
  Loader2, Save, Eye, ScrollText, Database, Download, RefreshCw, AlertTriangle, CheckSquare,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { PageHeader, EmptyState } from "@/components/shared";
import { EmployeesTab, SeatsTab, AllBookingsTab } from "@/components/views/admin-view";
import { useApp } from "@/lib/store";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const ACCENT_PRESETS = [
  { name: "Emerald", value: "#10b981" },
  { name: "Teal", value: "#0d9488" },
  { name: "Violet", value: "#8b5cf6" },
  { name: "Rose", value: "#e11d48" },
  { name: "Amber", value: "#f59e0b" },
  { name: "Sky", value: "#0ea5e9" },
  { name: "Orange", value: "#f97316" },
  { name: "Lime", value: "#84cc16" },
];

// ─── Customize tab (developer-only: edit homepage content) ──────────────────
function CustomizeTab() {
  const qc = useQueryClient();
  const setView = useApp((s) => s.setView);
  const { data: custom, isLoading } = useQuery({
    queryKey: ["admin-customization"],
    queryFn: async () => { const r = await fetch("/api/admin/customization"); const j = await r.json(); return j.data ?? {}; },
  });
  const [draft, setDraft] = useState<Record<string, string>>({});

  const merged = { ...custom, ...draft };

  const save = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/customization", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(draft) });
      const j = await res.json(); if (!j.ok) throw new Error(j.error); return j.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-customization"] });
      qc.invalidateQueries({ queryKey: ["customization"] });
      setDraft({});
      toast.success("Homepage updated", { description: "Changes are live." });
    },
    onError: (e: Error) => toast.error("Could not save", { description: e.message }),
  });

  if (isLoading) return <Card className="p-10 text-center text-sm text-muted-foreground"><Loader2 className="size-5 animate-spin mx-auto mb-2" /> Loading…</Card>;

  return (
    <div className="space-y-4">
      <Card className="p-5 border-border/60 shadow-premium">
        <p className="text-sm font-semibold mb-1 flex items-center gap-2"><Palette className="size-4 text-emerald-500" /> Homepage content</p>
        <p className="text-[11px] text-muted-foreground mb-4">Edit what visitors see on the homepage. Changes go live instantly.</p>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Hero title</Label>
            <Input value={merged.heroTitle ?? ""} onChange={(e) => setDraft({ ...draft, heroTitle: e.target.value })} placeholder="Reserve your seat, simply." className="h-10" />
            <p className="text-[10px] text-muted-foreground">The last word will be highlighted with a gradient.</p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Hero subtitle</Label>
            <Textarea value={merged.heroSubtitle ?? ""} onChange={(e) => setDraft({ ...draft, heroSubtitle: e.target.value })} placeholder="Check live seat availability and book your desk in seconds." className="min-h-[60px]" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Login button label</Label>
              <Input value={merged.loginLabel ?? ""} onChange={(e) => setDraft({ ...draft, loginLabel: e.target.value })} placeholder="Login to book" className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Accent color</Label>
              <div className="flex items-center gap-1.5 flex-wrap">
                {ACCENT_PRESETS.map((c) => (
                  <button key={c.value} onClick={() => setDraft({ ...draft, accentColor: c.value })} className={cn("size-7 rounded-lg ring-2 transition-all", (merged.accentColor === c.value) ? "ring-foreground scale-110" : "ring-transparent hover:scale-105")} style={{ backgroundColor: c.value }} title={c.name} />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Office hours + branding */}
        <div className="grid grid-cols-2 gap-3 pt-4 border-t border-border/40">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Office open time</Label>
            <Input type="time" value={merged.officeOpenTime ?? "09:00"} onChange={(e) => setDraft({ ...draft, officeOpenTime: e.target.value })} className="h-9" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Office close time</Label>
            <Input type="time" value={merged.officeCloseTime ?? "19:00"} onChange={(e) => setDraft({ ...draft, officeCloseTime: e.target.value })} className="h-9" />
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label className="text-xs font-medium">Brand name (shown in sidebar)</Label>
            <Input value={merged.brandName ?? "SeatScape"} onChange={(e) => setDraft({ ...draft, brandName: e.target.value })} className="h-9" />
          </div>
        </div>
      </Card>

      <div className="flex items-center gap-2">
        <Button disabled={save.isPending || Object.keys(draft).length === 0} onClick={() => save.mutate()} className="rounded-full gap-1.5"><Save className="size-4" /> Save changes</Button>
        <Button variant="outline" className="rounded-full gap-1.5" onClick={() => setView("home")}><Eye className="size-4" /> Preview homepage</Button>
        {Object.keys(draft).length > 0 && <Button variant="ghost" className="text-xs" onClick={() => setDraft({})}>Discard</Button>}
      </div>
    </div>
  );
}

// ─── Booking Rules tab (developer-only: system settings) ────────────────────
const SETTING_FIELDS = [
  { key: "BOOKING_DEADLINE_HOUR", label: "Booking deadline (hour)", desc: "Book before this hour, day prior", type: "number" },
  { key: "LATE_BOOKING_POLICY", label: "Late booking policy", desc: "How late bookings are handled", type: "select", options: ["AUTO_APPROVE", "REQUIRE_ADMIN"] },
  { key: "DEFAULT_CHECK_IN", label: "Default check-in time", desc: "HH:MM", type: "text" },
  { key: "DEFAULT_CHECK_OUT", label: "Default check-out time", desc: "HH:MM", type: "text" },
  { key: "ORG_NAME", label: "Organization name", desc: "Display name", type: "text" },
];

function BookingRulesTab() {
  const qc = useQueryClient();
  const { data: settings } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: async () => { const r = await fetch("/api/admin/settings"); const j = await r.json(); return j.data ?? {}; },
  });
  const [draft, setDraft] = useState<Record<string, string>>({});
  const merged = { ...settings, ...draft };

  const save = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(draft) });
      const j = await res.json(); if (!j.ok) throw new Error(j.error); return j.data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-settings"] }); setDraft({}); toast.success("Booking rules saved"); },
    onError: (e: Error) => toast.error("Failed", { description: e.message }),
  });

  return (
    <div>
      <div className="grid sm:grid-cols-2 gap-3">
        {SETTING_FIELDS.map((f) => (
          <Card key={f.key} className="p-4 border-border/60 shadow-premium">
            <Label className="text-xs font-medium">{f.label}</Label>
            <p className="text-[10px] text-muted-foreground mb-2">{f.desc}</p>
            {f.type === "select" ? (
              <Select value={merged[f.key] ?? ""} onValueChange={(v) => setDraft({ ...draft, [f.key]: v })}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>{f.options!.map((o) => <SelectItem key={o} value={o}>{o === "AUTO_APPROVE" ? "Auto approve" : "Require admin approval"}</SelectItem>)}</SelectContent>
              </Select>
            ) : (
              <Input type={f.type} value={merged[f.key] ?? ""} onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })} className="h-9" />
            )}
          </Card>
        ))}
      </div>

      {/* Toggle settings */}
      <Card className="p-4 mt-3 border-border/60 shadow-premium">
        <p className="text-xs font-semibold mb-3 flex items-center gap-1.5"><CheckSquare className="size-3.5 text-emerald-500" /> Approval & visibility controls</p>
        <div className="space-y-3">
          {[
            { key: "AUTO_APPROVAL_ENABLED", label: "Auto-approve regular seats (7 seats)", desc: "First-come-first-book: bookings are approved instantly. Turn off to require admin approval for all regular seats." },
            { key: "AUTO_APPROVAL_EMERGENCY", label: "Auto-approve emergency seat", desc: "Allow the emergency seat to be auto-booked (off by default for safety)." },
            { key: "SHOW_BOOKING_TIMES_PUBLIC", label: "Show booking times on public homepage", desc: "Display check-in/out times on the homepage. Employee details are never shown publicly." },
            { key: "AUTO_SELECT_BOOKING_TIME", label: "Auto-select booking time for employees", desc: "Employees can't pick a time — the default office hours are used automatically." },
            { key: "SIGNUP_ENABLED", label: "Enable public signup", desc: "Show the 'Sign up' button on the homepage so visitors can request an account. Admins approve/reject requests." },
          ].map((t) => {
            const val = merged[t.key] === "true";
            return (
              <div key={t.key} className="flex items-start justify-between gap-3 py-2 border-b border-border/40 last:border-0">
                <div className="min-w-0">
                  <p className="text-xs font-medium">{t.label}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">{t.desc}</p>
                </div>
                <Switch checked={val} onCheckedChange={(v) => setDraft({ ...draft, [t.key]: v ? "true" : "false" })} />
              </div>
            );
          })}
        </div>
      </Card>

      <div className="flex justify-end mt-4">
        <Button disabled={Object.keys(draft).length === 0 || save.isPending} onClick={() => save.mutate()} className="rounded-full gap-1.5">{save.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Save rules</Button>
      </div>
    </div>
  );
}

// ─── Audit Logs tab (developer-only) ─────────────────────────────────────────
function AuditLogsTab() {
  const { data: logs, isLoading } = useQuery({
    queryKey: ["audit-logs"],
    queryFn: async () => { const r = await fetch("/api/admin/audit-logs?limit=100"); const j = await r.json(); return j.data ?? []; },
  });

  if (isLoading) return <Card className="p-10 text-center text-sm text-muted-foreground"><Loader2 className="size-5 animate-spin mx-auto mb-2" /> Loading audit logs…</Card>;
  if (!logs?.length) return <EmptyState icon={ScrollText} title="No audit logs yet" description="System actions will be recorded here." />;

  return (
    <Card className="border-border/60 shadow-premium overflow-hidden">
      <ScrollArea className="h-[600px]">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10">
            <tr className="border-b text-left text-[11px] uppercase tracking-wide text-muted-foreground bg-muted/90 backdrop-blur">
              <th className="py-2.5 px-4 font-medium">Action</th>
              <th className="py-2.5 px-4 font-medium">User</th>
              <th className="py-2.5 px-4 font-medium">Entity</th>
              <th className="py-2.5 px-4 font-medium">Details</th>
              <th className="py-2.5 px-4 font-medium">Time</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l: any) => (
              <tr key={l.id} className="border-b border-border/40 last:border-0 hover:bg-accent/30">
                <td className="py-2 px-4"><Badge variant="outline" className="text-[10px] font-mono">{l.action}</Badge></td>
                <td className="py-2 px-4 text-xs">{l.userName ?? "system"}{l.userEmployeeId ? <span className="text-muted-foreground ml-1">· {l.userEmployeeId}</span> : null}</td>
                <td className="py-2 px-4 text-xs text-muted-foreground">{l.entity ?? "—"}{l.entityId ? ` · ${l.entityId.slice(-6)}` : ""}</td>
                <td className="py-2 px-4 text-[11px] text-muted-foreground max-w-[280px] truncate" title={l.details ?? ""}>{l.details ?? "—"}</td>
                <td className="py-2 px-4 text-[11px] text-muted-foreground">{format(new Date(l.createdAt), "dd MMM HH:mm")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </ScrollArea>
    </Card>
  );
}

// ─── Data Management tab (developer-only) ────────────────────────────────────
function DataTab() {
  const qc = useQueryClient();
  const [resetAction, setResetAction] = useState<"reset-bookings" | "reset-settings" | "reset-all" | null>(null);

  const exportData = async () => {
    try {
      const res = await fetch("/api/admin/data");
      const json = await res.json();
      const blob = new Blob([JSON.stringify(json.data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `seatscape-export-${new Date().toISOString().slice(0, 10)}.json`; a.click();
      URL.revokeObjectURL(url);
      toast.success("Data exported", { description: "Full system data downloaded as JSON." });
    } catch (e: any) { toast.error("Export failed", { description: e.message }); }
  };

  const reset = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/data", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: resetAction }) });
      const j = await res.json(); if (!j.ok) throw new Error(j.error); return j.data;
    },
    onSuccess: () => {
      qc.invalidateQueries();
      toast.success("Reset complete", { description: "The selected data has been cleared." });
      setResetAction(null);
    },
    onError: (e: Error) => toast.error("Reset failed", { description: e.message }),
  });

  return (
    <div className="space-y-4">
      <Card className="p-5 border-border/60 shadow-premium">
        <p className="text-sm font-semibold mb-1 flex items-center gap-2"><Download className="size-4 text-emerald-500" /> Export data</p>
        <p className="text-[11px] text-muted-foreground mb-3">Download all system data (users, seats, bookings, settings, audit logs) as a JSON file.</p>
        <Button variant="outline" className="rounded-lg gap-1.5" onClick={exportData}><Download className="size-4" /> Export JSON</Button>
      </Card>

      <Card className="p-5 border-rose-500/30 bg-rose-500/5">
        <p className="text-sm font-semibold mb-1 flex items-center gap-2"><AlertTriangle className="size-4 text-rose-500" /> Danger zone — Reset data</p>
        <p className="text-[11px] text-muted-foreground mb-3">Permanently clear data. Users and seats are preserved unless noted. This cannot be undone.</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="rounded-lg gap-1.5 text-xs" onClick={() => setResetAction("reset-bookings")}><RefreshCw className="size-3.5" /> Clear all bookings</Button>
          <Button variant="outline" className="rounded-lg gap-1.5 text-xs" onClick={() => setResetAction("reset-settings")}><RefreshCw className="size-3.5" /> Reset settings</Button>
          <Button variant="outline" className="rounded-lg gap-1.5 text-xs text-rose-600" onClick={() => setResetAction("reset-all")}><RefreshCw className="size-3.5" /> Reset all (bookings + logs + settings)</Button>
        </div>
      </Card>

      {/* Reset confirmation */}
      {resetAction && (
        <Dialog open={!!resetAction} onOpenChange={(o) => { if (!o) setResetAction(null); }}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><AlertTriangle className="size-4 text-rose-500" /> Confirm reset</DialogTitle>
              <DialogDescription>
                {resetAction === "reset-all"
                  ? "This will permanently delete ALL bookings, audit logs, and reset settings to defaults. Users and seats are preserved. This cannot be undone."
                  : resetAction === "reset-bookings"
                  ? "This will permanently delete ALL bookings. This cannot be undone."
                  : "This will reset all settings to defaults. This cannot be undone."}
              </DialogDescription>
            </DialogHeader>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setResetAction(null)}>Cancel</Button>
              <Button variant="destructive" className="flex-1 gap-1.5" disabled={reset.isPending} onClick={() => reset.mutate()}>
                {reset.isPending ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />} Confirm reset
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// ─── Main Control Panel ─────────────────────────────────────────────────────
export function ControlPanelView() {
  const [tab, setTab] = useState("customize");
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6 sm:py-8">
      <PageHeader title="Control Panel" description="Customize the website, manage booking rules, employees, seats, bookings and system data." action={<Badge variant="outline" className="rounded-full gap-1.5"><SlidersHorizontal className="size-3 text-emerald-500" /> Developer</Badge>} />
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="rounded-full p-1 flex-wrap h-auto">
          <TabsTrigger value="customize" className="rounded-full gap-1.5 text-xs"><Palette className="size-3.5" /> Customize</TabsTrigger>
          <TabsTrigger value="rules" className="rounded-full gap-1.5 text-xs"><Clock className="size-3.5" /> Booking Rules</TabsTrigger>
          <TabsTrigger value="bookings" className="rounded-full gap-1.5 text-xs"><CalendarDays className="size-3.5" /> All Bookings</TabsTrigger>
          <TabsTrigger value="employees" className="rounded-full gap-1.5 text-xs"><Users className="size-3.5" /> Employees</TabsTrigger>
          <TabsTrigger value="seats" className="rounded-full gap-1.5 text-xs"><Armchair className="size-3.5" /> Seats</TabsTrigger>
          <TabsTrigger value="audit" className="rounded-full gap-1.5 text-xs"><ScrollText className="size-3.5" /> Audit Logs</TabsTrigger>
          <TabsTrigger value="data" className="rounded-full gap-1.5 text-xs"><Database className="size-3.5" /> Data</TabsTrigger>
        </TabsList>
        <TabsContent value="customize" className="mt-4"><CustomizeTab /></TabsContent>
        <TabsContent value="rules" className="mt-4"><BookingRulesTab /></TabsContent>
        <TabsContent value="bookings" className="mt-4"><AllBookingsTab /></TabsContent>
        <TabsContent value="employees" className="mt-4"><EmployeesTab /></TabsContent>
        <TabsContent value="seats" className="mt-4"><SeatsTab /></TabsContent>
        <TabsContent value="audit" className="mt-4"><AuditLogsTab /></TabsContent>
        <TabsContent value="data" className="mt-4"><DataTab /></TabsContent>
      </Tabs>
    </div>
  );
}
