"use client";

import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Settings, Users, Armchair, CheckSquare, Plus, Loader2, Power, Search,
  Upload, Download, Trash2, FileSpreadsheet, Check, X, Clock, MapPin, CalendarDays,
  AlertTriangle, KeyRound, Camera, UserPlus,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PageHeader, EmptyState } from "@/components/shared";
import { ROLE_LABELS, ROLES } from "@/lib/constants";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

function generatePassword(length = 12): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789@#$";
  let pwd = "";
  for (let i = 0; i < length; i++) pwd += chars[Math.floor(Math.random() * chars.length)];
  return pwd;
}

// ─── Employees tab ──────────────────────────────────────────────────────────
export function EmployeesTab() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkResults, setBulkResults] = useState<any[] | null>(null);
  const [bulkCsv, setBulkCsv] = useState("");
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkFileName, setBulkFileName] = useState("");
  const [form, setForm] = useState({ employeeId: "", name: "", email: "", phone: "", role: "EMPLOYEE", jobTitle: "", designation: "", department: "", password: "" });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<"activate" | "deactivate" | "delete" | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [pwdTarget, setPwdTarget] = useState<any | null>(null);
  const [newPwd, setNewPwd] = useState("");
  const [photoTarget, setPhotoTarget] = useState<any | null>(null);
  const [bulkPwdOpen, setBulkPwdOpen] = useState(false);
  const [bulkPwdResults, setBulkPwdResults] = useState<any[] | null>(null);
  const [bulkPwdMode, setBulkPwdMode] = useState<"generate" | "custom">("generate");
  const [bulkPwdValue, setBulkPwdValue] = useState("");

  const { data: employees } = useQuery({
    queryKey: ["admin-employees"],
    queryFn: async () => { const r = await fetch("/api/admin/employees"); const j = await r.json(); return j.data ?? []; },
  });

  const filtered = (employees ?? []).filter((e: any) =>
    e.name.toLowerCase().includes(search.toLowerCase()) || e.employeeId.toLowerCase().includes(search.toLowerCase()) || e.email.toLowerCase().includes(search.toLowerCase()),
  );

  const allFilteredIds = filtered.map((e: any) => e.id);
  const allSelected = allFilteredIds.length > 0 && allFilteredIds.every((id) => selected.has(id));

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const toggleSelectAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(allFilteredIds));
  };

  const toggle = useMutation({
    mutationFn: async (e: any) => {
      const res = await fetch(`/api/admin/employees/${e.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive: !e.isActive }) });
      const j = await res.json(); if (!j.ok) throw new Error(j.error); return j.data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-employees"] }); toast.success("Employee updated"); },
    onError: (e: Error) => toast.error("Failed", { description: e.message }),
  });

  const create = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/employees", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const j = await res.json(); if (!j.ok) throw new Error(j.error); return j.data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-employees"] }); toast.success("Employee created"); setAddOpen(false); setForm({ employeeId: "", name: "", email: "", phone: "", role: "EMPLOYEE", jobTitle: "", designation: "", department: "", password: "" }); },
    onError: (e: Error) => toast.error("Could not create", { description: e.message }),
  });

  const bulkUpload = useMutation({
    mutationFn: async () => {
      let body: Record<string, unknown>;
      if (bulkFile) {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => { resolve((reader.result as string).split(",")[1] || ""); };
          reader.onerror = reject;
          reader.readAsDataURL(bulkFile);
        });
        body = { file: base64, mimeType: bulkFile.type };
      } else {
        body = { csv: bulkCsv };
      }
      const res = await fetch("/api/admin/employees/bulk", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const j = await res.json(); if (!j.ok) throw new Error(j.error); return j.data;
    },
    onSuccess: (data) => { qc.invalidateQueries({ queryKey: ["admin-employees"] }); setBulkResults(data.results); toast.success(`Bulk upload complete`, { description: `${data.created} created · ${data.skipped} skipped` }); },
    onError: (e: Error) => toast.error("Bulk upload failed", { description: e.message }),
  });

  const downloadTemplate = async () => {
    try {
      const res = await fetch("/api/admin/employees/bulk");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "edunet-employees-template.xlsx"; a.click();
      URL.revokeObjectURL(url);
      toast.success("Excel template downloaded");
    } catch (e: any) { toast.error("Could not download template", { description: e.message }); }
  };

  // Bulk action mutation (activate / deactivate / delete multiple users)
  const runBulkAction = useMutation({
    mutationFn: async () => {
      const ids = Array.from(selected);
      const res = await fetch("/api/admin/employees/bulk-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, action: bulkAction }),
      });
      const j = await res.json();
      if (!j.ok) throw new Error(j.error);
      return j.data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["admin-employees"] });
      toast.success(`Bulk ${bulkAction} complete`, { description: `${data.affected} employees affected` });
      setSelected(new Set());
      setBulkAction(null);
    },
    onError: (e: Error) => toast.error("Bulk action failed", { description: e.message }),
  });

  // Single delete mutation
  const deleteOne = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/employees/${id}`, { method: "DELETE" });
      const j = await res.json(); if (!j.ok) throw new Error(j.error); return j.data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-employees"] }); toast.success("Employee deleted"); },
    onError: (e: Error) => toast.error("Could not delete", { description: e.message }),
  });

  // Reset single user's password
  const resetPwd = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/admin/employees/${pwdTarget.id}/password`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ newPassword: newPwd }) });
      const j = await res.json(); if (!j.ok) throw new Error(j.error); return j.data;
    },
    onSuccess: () => { toast.success("Password reset", { description: `New password set for ${pwdTarget.name}` }); setPwdTarget(null); setNewPwd(""); },
    onError: (e: Error) => toast.error("Could not reset password", { description: e.message }),
  });

  // Set a user's photo (admin/dev)
  const setUserPhoto = useMutation({
    mutationFn: async ({ id, photo }: { id: string; photo: string }) => {
      const res = await fetch(`/api/admin/employees/${id}/photo`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ photo }) });
      const j = await res.json(); if (!j.ok) throw new Error(j.error); return j.data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-employees"] }); qc.invalidateQueries({ queryKey: ["seats"] }); toast.success("Photo updated"); setPhotoTarget(null); },
    onError: (e: Error) => toast.error("Could not set photo", { description: e.message }),
  });

  // Bulk password reset
  const bulkPwd = useMutation({
    mutationFn: async () => {
      const ids = Array.from(selected);
      const body: Record<string, unknown> = { ids };
      if (bulkPwdMode === "generate") body.generate = true;
      else body.newPassword = bulkPwdValue;
      const res = await fetch("/api/admin/employees/bulk-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const j = await res.json(); if (!j.ok) throw new Error(j.error); return j.data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["admin-employees"] });
      setBulkPwdResults(data.results);
      toast.success(`Reset ${data.reset} passwords`, { description: data.blocked ? `${data.blocked} blocked` : undefined });
    },
    onError: (e: Error) => toast.error("Bulk reset failed", { description: e.message }),
  });

  return (
    <div>
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, ID, or email…" className="pl-9 h-9 rounded-lg" />
        </div>
        <Button variant="outline" className="rounded-lg gap-1.5" onClick={() => { setBulkOpen(true); setBulkResults(null); setBulkCsv(""); setBulkFile(null); setBulkFileName(""); }}><Upload className="size-4" /> Bulk upload</Button>
        <Button className="rounded-lg gap-1.5" onClick={() => setAddOpen(true)}><Plus className="size-4" /> Add employee</Button>
      </div>
      {/* Bulk action bar (appears when rows selected) */}
      {selected.size > 0 && (
        <Card className="mb-3 p-3 border-emerald-500/30 bg-emerald-500/5 shadow-premium flex items-center gap-2 flex-wrap">
          <Badge className="rounded-full bg-emerald-500/15 text-emerald-700">{selected.size} selected</Badge>
          <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={() => setBulkAction("activate")}><Power className="size-3.5 text-emerald-600" /> Activate</Button>
          <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={() => setBulkAction("deactivate")}><Power className="size-3.5 text-amber-600" /> Deactivate</Button>
          <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={() => { setBulkPwdOpen(true); setBulkPwdResults(null); }}><KeyRound className="size-3.5" /> Reset passwords</Button>
          <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs text-rose-600" onClick={() => setBulkAction("delete")}><Trash2 className="size-3.5" /> Delete</Button>
          <Button size="sm" variant="ghost" className="h-8 text-xs ml-auto" onClick={() => setSelected(new Set())}>Clear selection</Button>
        </Card>
      )}
      <Card className="border-border/60 shadow-premium overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-[11px] uppercase tracking-wide text-muted-foreground bg-muted/30">
                <th className="py-2.5 px-3 w-10"><Checkbox checked={allSelected} onCheckedChange={toggleSelectAll} aria-label="Select all" /></th>
                <th className="py-2.5 px-4 font-medium">Employee</th>
                <th className="py-2.5 px-4 font-medium">Role</th>
                <th className="py-2.5 px-4 font-medium">Job title</th>
                <th className="py-2.5 px-4 font-medium">Status</th>
                <th className="py-2.5 px-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e: any) => (
                <tr key={e.id} className={cn("border-b border-border/40 last:border-0 hover:bg-accent/30", selected.has(e.id) && "bg-emerald-500/5")}>
                  <td className="py-2.5 px-3"><Checkbox checked={selected.has(e.id)} onCheckedChange={() => toggleSelect(e.id)} aria-label={`Select ${e.name}`} /></td>
                  <td className="py-2.5 px-4">
                    <div className="flex items-center gap-2">
                      <Avatar className="size-8 shrink-0" style={{ backgroundColor: e.avatarColor }}>
                        {e.photoUrl ? <img src={e.photoUrl} alt={e.name} className="size-full object-cover rounded-full" /> : <AvatarFallback className="text-[10px] text-white font-semibold" style={{ backgroundColor: e.avatarColor }}>{e.name.split(" ").map((n: string) => n[0]).slice(0, 2).join("")}</AvatarFallback>}
                      </Avatar>
                      <div><p className="text-xs font-medium">{e.name}</p><p className="text-[10px] text-muted-foreground">{e.employeeId} · {e.email}</p></div>
                    </div>
                  </td>
                  <td className="py-2.5 px-4"><Badge variant="outline" className="text-[10px]">{ROLE_LABELS[e.role as keyof typeof ROLE_LABELS] ?? e.role}</Badge></td>
                  <td className="py-2.5 px-4 text-xs text-muted-foreground">{e.designation ?? e.jobTitle ?? "—"}</td>
                  <td className="py-2.5 px-4"><Badge className={cn("rounded-full text-[10px]", e.isActive ? "bg-emerald-500/15 text-emerald-700" : "bg-zinc-500/15 text-zinc-600")}>{e.isActive ? "Active" : "Inactive"}</Badge></td>
                  <td className="py-2.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" title="Set photo" onClick={() => setPhotoTarget(e)}><Camera className="size-3" /></Button>
                      <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" title="Reset password" onClick={() => setPwdTarget(e)}><KeyRound className="size-3" /></Button>
                      <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => toggle.mutate(e)} title={e.isActive ? "Deactivate" : "Activate"}><Power className="size-3" /> {e.isActive ? "Deactivate" : "Activate"}</Button>
                      <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-rose-600 hover:text-rose-700 hover:bg-rose-500/10" onClick={() => setDeleteTarget(e)} title="Delete"><Trash2 className="size-3" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add employee dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Plus className="size-4 text-emerald-500" /> Add employee</DialogTitle><DialogDescription>Create a new account. Fields marked * are required.</DialogDescription></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label className="text-xs">Employee ID *</Label><Input value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value.toUpperCase() })} placeholder="EDU-2025" className="h-9" /></div>
            <div className="space-y-1"><Label className="text-xs">Full name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="John Doe" className="h-9" /></div>
            <div className="space-y-1"><Label className="text-xs">Email *</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="name@edunet.org" className="h-9" /></div>
            <div className="space-y-1"><Label className="text-xs">Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91…" className="h-9" /></div>
            <div className="space-y-1"><Label className="text-xs">Role *</Label><Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}><SelectTrigger className="h-9"><SelectValue /></SelectTrigger><SelectContent>{Object.values(ROLES).map((r) => <SelectItem key={r} value={r}>{ROLE_LABELS[r as keyof typeof ROLE_LABELS]}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1"><Label className="text-xs">Job title</Label><Input value={form.jobTitle} onChange={(e) => setForm({ ...form, jobTitle: e.target.value })} placeholder="Program Manager" className="h-9" /></div>
            <div className="space-y-1"><Label className="text-xs">Designation</Label><Input value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} placeholder="Program Director" className="h-9" /></div>
            <div className="space-y-1"><Label className="text-xs">Department</Label><Input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} placeholder="Programs" className="h-9" /></div>
            <div className="col-span-2 space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Temporary password *</Label>
                <button type="button" onClick={() => setForm({ ...form, password: generatePassword() })} className="text-[10px] text-emerald-600 hover:underline">Generate</button>
              </div>
              <Input type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Min 8 characters" className="h-9 font-mono text-xs" />
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button><Button disabled={create.isPending} onClick={() => create.mutate()} className="gap-1.5">{create.isPending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} Create</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk upload dialog */}
      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Upload className="size-4 text-emerald-500" /> Bulk upload employees</DialogTitle><DialogDescription>Upload an Excel (.xlsx) or CSV file. Existing employee IDs or emails are skipped.</DialogDescription></DialogHeader>
          {!bulkResults ? (
            <>
              <div className="mb-2"><Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={downloadTemplate}><Download className="size-3.5" /> Download Excel template</Button></div>
              <label className="cursor-pointer block">
                <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (!f) return; setBulkFile(f); setBulkFileName(f.name); if (f.name.endsWith(".csv")) { const r = new FileReader(); r.onload = () => setBulkCsv(String(r.result || "")); r.readAsText(f); } else setBulkCsv(""); }} />
                <div className={cn("rounded-xl border-2 border-dashed p-6 text-center transition-colors", bulkFile ? "border-emerald-500/50 bg-emerald-500/5" : "border-border/60 hover:border-emerald-500/40 hover:bg-accent/40")}>
                  <FileSpreadsheet className={cn("size-8 mx-auto mb-2", bulkFile ? "text-emerald-500" : "text-muted-foreground")} />
                  {bulkFile ? <div><p className="text-sm font-medium">{bulkFileName}</p><p className="text-[11px] text-muted-foreground mt-0.5">{(bulkFile.size / 1024).toFixed(1)} KB · Click to replace</p></div> : <div><p className="text-sm font-medium">Click to upload Excel or CSV file</p><p className="text-[11px] text-muted-foreground mt-0.5">Supports .xlsx, .xls, .csv</p></div>}
                </div>
              </label>
              <div className="text-center text-[10px] text-muted-foreground my-1">— or paste CSV below —</div>
              <Textarea value={bulkCsv} onChange={(e) => { setBulkCsv(e.target.value); if (bulkFile) { setBulkFile(null); setBulkFileName(""); } }} placeholder={"employeeId,name,email,phone,password,role,jobTitle\nEDU-3001,John Doe,john.doe@edunet.org,+919811003001,TempPass@123,EMPLOYEE,Program Manager"} className="min-h-[100px] font-mono text-xs scrollbar-thin" />
              <DialogFooter>
                <Button variant="outline" onClick={() => setBulkOpen(false)}>Cancel</Button>
                <Button disabled={bulkUpload.isPending || (!bulkFile && !bulkCsv.trim())} onClick={() => bulkUpload.mutate()} className="gap-1.5">{bulkUpload.isPending ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />} Upload</Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 text-center"><p className="text-2xl font-semibold text-emerald-600">{bulkResults.filter((r) => r.status === "created").length}</p><p className="text-[10px] text-muted-foreground">Created</p></div>
                <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 text-center"><p className="text-2xl font-semibold text-amber-600">{bulkResults.filter((r) => r.status === "skipped").length}</p><p className="text-[10px] text-muted-foreground">Skipped</p></div>
                <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 p-3 text-center"><p className="text-2xl font-semibold text-rose-600">{bulkResults.filter((r) => r.status === "error").length}</p><p className="text-[10px] text-muted-foreground">Errors</p></div>
              </div>
              <ScrollArea className="h-[220px] rounded-lg border">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-muted"><tr><th className="py-2 px-3 text-left font-medium">Row</th><th className="py-2 px-3 text-left font-medium">Employee ID</th><th className="py-2 px-3 text-left font-medium">Status</th><th className="py-2 px-3 text-left font-medium">Message</th></tr></thead>
                  <tbody>{bulkResults.map((r, i) => (<tr key={i} className="border-b last:border-0"><td className="py-1.5 px-3 text-muted-foreground">{r.row}</td><td className="py-1.5 px-3 font-mono">{r.employeeId}</td><td className="py-1.5 px-3"><Badge className={cn("rounded-full text-[9px]", r.status === "created" ? "bg-emerald-500/15 text-emerald-700" : r.status === "skipped" ? "bg-amber-500/15 text-amber-700" : "bg-rose-500/15 text-rose-700")}>{r.status}</Badge></td><td className="py-1.5 px-3 text-muted-foreground">{r.message ?? "—"}</td></tr>))}</tbody>
                </table>
              </ScrollArea>
              <DialogFooter><Button variant="outline" onClick={() => { setBulkResults(null); setBulkCsv(""); setBulkFile(null); setBulkFileName(""); }}>Upload more</Button><Button onClick={() => setBulkOpen(false)} className="gap-1.5"><Check className="size-4" /> Done</Button></DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Bulk action confirmation */}
      <Dialog open={!!bulkAction} onOpenChange={(o) => { if (!o) setBulkAction(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {bulkAction === "delete" ? <Trash2 className="size-4 text-rose-500" /> : <Power className="size-4 text-amber-500" />}
              {bulkAction === "activate" ? "Activate" : bulkAction === "deactivate" ? "Deactivate" : "Delete"} {selected.size} {selected.size === 1 ? "employee" : "employees"}?
            </DialogTitle>
            <DialogDescription>
              {bulkAction === "delete"
                ? "This will permanently delete the selected employees and all their bookings. This action cannot be undone."
                : bulkAction === "activate"
                ? "The selected employees will be able to log in again."
                : "The selected employees will no longer be able to log in."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkAction(null)}>Cancel</Button>
            <Button variant={bulkAction === "delete" ? "destructive" : "default"} disabled={runBulkAction.isPending} onClick={() => runBulkAction.mutate()} className="gap-1.5">
              {runBulkAction.isPending ? <Loader2 className="size-4 animate-spin" /> : bulkAction === "delete" ? <Trash2 className="size-4" /> : <Power className="size-4" />}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Single delete confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Trash2 className="size-4 text-rose-500" /> Delete {deleteTarget?.name}?</DialogTitle>
            <DialogDescription>This will permanently delete {deleteTarget?.name} ({deleteTarget?.employeeId}) and all their bookings. This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" disabled={deleteOne.isPending} onClick={() => { if (deleteTarget) deleteOne.mutate(deleteTarget.id); }} className="gap-1.5">
              {deleteOne.isPending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />} Delete employee
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset password dialog (single user) */}
      <Dialog open={!!pwdTarget} onOpenChange={(o) => { if (!o) { setPwdTarget(null); setNewPwd(""); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><KeyRound className="size-4 text-emerald-500" /> Reset password for {pwdTarget?.name}?</DialogTitle>
            <DialogDescription>Set a new password for {pwdTarget?.employeeId}. They'll need to use it to sign in next time.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">New password</Label>
              <button onClick={() => setNewPwd(generatePassword())} className="text-[10px] text-emerald-600 hover:underline">Generate</button>
            </div>
            <Input type="text" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} placeholder="Min 8 characters" className="h-9 font-mono text-xs" />
            {newPwd && newPwd.length < 8 && <p className="text-[10px] text-rose-600">Password must be at least 8 characters</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setPwdTarget(null); setNewPwd(""); }}>Cancel</Button>
            <Button disabled={resetPwd.isPending || !newPwd || newPwd.length < 8} onClick={() => resetPwd.mutate()} className="gap-1.5">
              {resetPwd.isPending ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />} Reset password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Set photo dialog (single user) */}
      <Dialog open={!!photoTarget} onOpenChange={(o) => { if (!o) setPhotoTarget(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Camera className="size-4 text-emerald-500" /> Set photo for {photoTarget?.name}</DialogTitle>
            <DialogDescription>Upload a profile photo for {photoTarget?.employeeId}.</DialogDescription>
          </DialogHeader>
          <PhotoUploader
            currentPhoto={photoTarget?.photoUrl}
            color={photoTarget?.avatarColor}
            name={photoTarget?.name}
            onUpload={(dataUrl) => setUserPhoto.mutate({ id: photoTarget.id, photo: dataUrl })}
            loading={setUserPhoto.isPending}
          />
          {photoTarget?.photoUrl && (
            <Button variant="outline" size="sm" className="gap-1.5 text-rose-600" disabled={setUserPhoto.isPending} onClick={() => {
              setUserPhoto.mutate({ id: photoTarget.id, photo: "" });
              // send null to remove
              fetch(`/api/admin/employees/${photoTarget.id}/photo`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ photo: null }) }).then(() => {
                qc.invalidateQueries({ queryKey: ["admin-employees"] }); qc.invalidateQueries({ queryKey: ["seats"] }); toast.success("Photo removed"); setPhotoTarget(null);
              });
            }}><Trash2 className="size-3.5" /> Remove photo</Button>
          )}
        </DialogContent>
      </Dialog>

      {/* Bulk password reset dialog */}
      <Dialog open={bulkPwdOpen} onOpenChange={setBulkPwdOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><KeyRound className="size-4 text-emerald-500" /> Reset passwords — {selected.size} selected</DialogTitle>
            <DialogDescription>{bulkPwdResults ? "Passwords have been reset. Copy them now — they won't be shown again." : "Generate unique random passwords for each selected employee, or set one password for all."}</DialogDescription>
          </DialogHeader>
          {!bulkPwdResults ? (
            <>
              <div className="flex gap-2 mb-3">
                <Button size="sm" variant={bulkPwdMode === "generate" ? "default" : "outline"} onClick={() => setBulkPwdMode("generate")}>Generate unique</Button>
                <Button size="sm" variant={bulkPwdMode === "custom" ? "default" : "outline"} onClick={() => setBulkPwdMode("custom")}>Same password</Button>
              </div>
              {bulkPwdMode === "custom" && (
                <div className="space-y-2 mb-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Password for all selected</Label>
                    <button onClick={() => setBulkPwdValue(generatePassword())} className="text-[10px] text-emerald-600 hover:underline">Generate</button>
                  </div>
                  <Input type="text" value={bulkPwdValue} onChange={(e) => setBulkPwdValue(e.target.value)} placeholder="Min 8 characters" className="h-9 font-mono text-xs" />
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setBulkPwdOpen(false)}>Cancel</Button>
                <Button disabled={bulkPwd.isPending || (bulkPwdMode === "custom" && (!bulkPwdValue || bulkPwdValue.length < 8))} onClick={() => bulkPwd.mutate()} className="gap-1.5">
                  {bulkPwd.isPending ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />} Reset {selected.size} passwords
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <ScrollArea className="h-[300px] rounded-lg border">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-muted"><tr><th className="py-2 px-3 text-left font-medium">Employee</th><th className="py-2 px-3 text-left font-medium">New password</th><th className="py-2 px-3 text-left font-medium">Copy</th></tr></thead>
                  <tbody>
                    {bulkPwdResults.map((r, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="py-1.5 px-3"><p className="font-medium">{r.name}</p><p className="text-[10px] text-muted-foreground">{r.employeeId}</p></td>
                        <td className="py-1.5 px-3 font-mono">{r.newPassword}</td>
                        <td className="py-1.5 px-3"><Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => { navigator.clipboard?.writeText(r.newPassword); toast.success("Copied"); }}>Copy</Button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ScrollArea>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setBulkPwdResults(null); setBulkPwdOpen(false); setSelected(new Set()); }}>Done</Button>
                <Button variant="outline" onClick={() => { navigator.clipboard?.writeText(bulkPwdResults.map((r) => `${r.employeeId}\t${r.newPassword}`).join("\n")); toast.success("All copied to clipboard"); }}>Copy all</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Photo uploader helper component
function PhotoUploader({ currentPhoto, color, name, onUpload, loading }: { currentPhoto?: string | null; color?: string; name?: string; onUpload: (dataUrl: string) => void; loading: boolean }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Please select an image"); return; }
    if (file.size > 2_000_000) { toast.error("Image too large (max 2MB)"); return; }
    const reader = new FileReader();
    reader.onload = () => onUpload(reader.result as string);
    reader.readAsDataURL(file);
  };
  return (
    <div className="flex flex-col items-center gap-3 py-2">
      <Avatar className="size-20 ring-2 ring-background shadow-premium" style={{ backgroundColor: color }}>
        {currentPhoto ? <img src={currentPhoto} alt={name ?? ""} className="size-full object-cover rounded-full" /> : <AvatarFallback className="text-lg font-semibold text-white" style={{ backgroundColor: color }}>{name?.split(" ").map((n) => n[0]).slice(0, 2).join("")}</AvatarFallback>}
      </Avatar>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onChange} />
      <Button variant="outline" size="sm" className="gap-1.5" disabled={loading} onClick={() => fileRef.current?.click()}>
        {loading ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />} {currentPhoto ? "Change photo" : "Upload photo"}
      </Button>
    </div>
  );
}

// ─── Seats tab ───────────────────────────────────────────────────────────────
export function SeatsTab() {
  const qc = useQueryClient();
  const [addCount, setAddCount] = useState(1);
  const [addZone, setAddZone] = useState("Open Area");
  const [removeTarget, setRemoveTarget] = useState<any | null>(null);

  const { data: seats } = useQuery({
    queryKey: ["admin-seats"],
    queryFn: async () => { const r = await fetch("/api/admin/seats"); const j = await r.json(); return j.data ?? []; },
  });

  const toggleBlock = useMutation({
    mutationFn: async (s: any) => { const res = await fetch(`/api/admin/seats/${s.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isBlocked: !s.isBlocked }) }); const j = await res.json(); if (!j.ok) throw new Error(j.error); return j.data; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-seats"] }); qc.invalidateQueries({ queryKey: ["seats"] }); toast.success("Seat updated"); },
    onError: (e: Error) => toast.error("Failed", { description: e.message }),
  });

  // Toggle per-seat auto-approval override (null = inherit global, true = force auto, false = force manual)
  const toggleAutoApprove = useMutation({
    mutationFn: async (s: any) => {
      // Cycle: null → true → false → null
      const next = s.autoApprove === null ? true : s.autoApprove === true ? false : null;
      const res = await fetch(`/api/admin/seats/${s.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ autoApprove: next }) });
      const j = await res.json(); if (!j.ok) throw new Error(j.error); return j.data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-seats"] }); qc.invalidateQueries({ queryKey: ["seats"] }); toast.success("Auto-approval updated"); },
    onError: (e: Error) => toast.error("Failed", { description: e.message }),
  });

  const addSeats = useMutation({
    mutationFn: async () => { const res = await fetch("/api/admin/seats", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ count: addCount, zone: addZone }) }); const j = await res.json(); if (!j.ok) throw new Error(j.error); return j.data; },
    onSuccess: (data) => { qc.invalidateQueries({ queryKey: ["admin-seats"] }); qc.invalidateQueries({ queryKey: ["seats"] }); toast.success(`${data.created} seat${data.created === 1 ? "" : "s"} added`); },
    onError: (e: Error) => toast.error("Could not add seats", { description: e.message }),
  });

  const removeSeat = useMutation({
    mutationFn: async (s: any) => { const res = await fetch(`/api/admin/seats/${s.id}`, { method: "DELETE" }); const j = await res.json(); if (!j.ok) throw new Error(j.error); return j.data; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-seats"] }); qc.invalidateQueries({ queryKey: ["seats"] }); toast.success("Seat removed"); setRemoveTarget(null); },
    onError: (e: Error) => toast.error("Could not remove", { description: e.message }),
  });

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Badge variant="outline" className="rounded-full text-xs gap-1"><Armchair className="size-3 text-emerald-500" /> {(seats ?? []).length} seats</Badge>
        <div className="flex items-center gap-1.5 ml-auto">
          <Input type="number" min={1} max={50} value={addCount} onChange={(e) => setAddCount(Math.max(1, Math.min(50, Number(e.target.value) || 1)))} className="w-16 h-9 text-center" />
          <Select value={addZone} onValueChange={setAddZone}>
            <SelectTrigger className="w-[140px] h-9 rounded-lg text-xs"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="Quiet Zone">Quiet Zone</SelectItem><SelectItem value="Collab Zone">Collab Zone</SelectItem><SelectItem value="Open Area">Open Area</SelectItem><SelectItem value="Window Zone">Window Zone</SelectItem></SelectContent>
          </Select>
          <Button size="sm" className="rounded-lg gap-1.5 h-9" disabled={addSeats.isPending} onClick={() => addSeats.mutate()}>{addSeats.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />} Add seats</Button>
        </div>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {(seats ?? []).map((s: any) => (
          <Card key={s.id} className={cn("p-4 border-border/60 shadow-premium", s.isEmergency && "ring-1 ring-violet-500/30", s.isBlocked && "opacity-70")}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <div className="size-9 rounded-lg bg-emerald-500/15 flex items-center justify-center shrink-0"><Armchair className="size-4 text-emerald-600" /></div>
                <div className="min-w-0"><p className="text-sm font-semibold truncate">{s.number}</p><p className="text-[10px] text-muted-foreground truncate">{s.label}</p></div>
              </div>
              {s.isEmergency && <Badge className="rounded-full bg-violet-500/15 text-violet-700 text-[9px] shrink-0">EM</Badge>}
            </div>
            <div className="mt-3 flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground truncate">{s.zone ?? "—"}</span>
              <Badge className={cn("rounded-full text-[10px] shrink-0", s.isBlocked ? "bg-zinc-500/15 text-zinc-600" : "bg-emerald-500/15 text-emerald-700")}>{s.isBlocked ? "Blocked" : "Active"}</Badge>
            </div>
            <div className="mt-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5"><Switch checked={s.isBlocked} onCheckedChange={() => toggleBlock.mutate(s)} id={`block-${s.id}`} /><Label htmlFor={`block-${s.id}`} className="text-[11px] text-muted-foreground cursor-pointer">Block</Label></div>
              {!s.isEmergency && <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-rose-600 hover:text-rose-700 hover:bg-rose-500/10" onClick={() => setRemoveTarget(s)}><Trash2 className="size-3" /> Remove</Button>}
            </div>
            {/* Per-seat auto-approval override */}
            <div className="mt-2 pt-2 border-t border-border/40 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <button onClick={() => toggleAutoApprove.mutate(s)} className="shrink-0" title="Click to cycle: inherit → auto → manual → inherit">
                  <Badge className={cn("rounded-full text-[9px] cursor-pointer", s.autoApprove === true ? "bg-emerald-500/15 text-emerald-700" : s.autoApprove === false ? "bg-rose-500/15 text-rose-700" : "bg-zinc-500/15 text-zinc-600")}>
                    {s.autoApprove === true ? "Auto ✓" : s.autoApprove === false ? "Manual ✗" : "Inherit"}
                  </Badge>
                </button>
                <span className="text-[10px] text-muted-foreground truncate">Approval</span>
              </div>
            </div>
          </Card>
        ))}
      </div>
      {(seats ?? []).length === 0 && <EmptyState icon={Armchair} title="No seats configured" description="Add seats using the controls above." />}

      <Dialog open={!!removeTarget} onOpenChange={(o) => { if (!o) setRemoveTarget(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Trash2 className="size-4 text-rose-500" /> Remove seat {removeTarget?.number}?</DialogTitle><DialogDescription>This will permanently delete seat {removeTarget?.number}. Any existing bookings for this seat will be removed. This action cannot be undone.</DialogDescription></DialogHeader>
          <DialogFooter><Button variant="outline" onClick={() => setRemoveTarget(null)}>Cancel</Button><Button variant="destructive" disabled={removeSeat.isPending} onClick={() => removeSeat.mutate(removeTarget)} className="gap-1.5">{removeSeat.isPending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />} Remove seat</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── All Bookings tab (admin can cancel any) ────────────────────────────────
export function AllBookingsTab() {
  const qc = useQueryClient();
  const [cancelTarget, setCancelTarget] = useState<any | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [filter, setFilter] = useState("ALL");

  const { data: bookings, isLoading } = useQuery({
    queryKey: ["all-bookings", filter],
    queryFn: async () => {
      const res = await fetch("/api/bookings?all=true");
      const j = await res.json();
      return j.data ?? [];
    },
  });

  const cancel = useMutation({
    mutationFn: async (b: any) => {
      const res = await fetch(`/api/bookings/${b.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason: cancelReason || "Cancelled by admin" }) });
      const j = await res.json(); if (!j.ok) throw new Error(j.error); return j.data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["all-bookings"] }); toast.success("Booking cancelled"); setCancelTarget(null); setCancelReason(""); },
    onError: (e: Error) => toast.error("Could not cancel", { description: e.message }),
  });

  const filtered = (bookings ?? []).filter((b: any) => filter === "ALL" || b.status === filter).slice(0, 50);

  return (
    <div>
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[180px] h-9 rounded-lg text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All bookings</SelectItem>
            <SelectItem value="APPROVED">Approved</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="CHECKED_IN">Checked in</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Badge variant="outline" className="rounded-full text-xs">{filtered.length} shown</Badge>
      </div>
      {isLoading ? (
        <Card className="p-10 text-center text-sm text-muted-foreground"><Loader2 className="size-5 animate-spin mx-auto mb-2" /> Loading bookings…</Card>
      ) : filtered.length === 0 ? (
        <EmptyState icon={CalendarDays} title="No bookings found" description="Bookings will appear here once employees start reserving seats." />
      ) : (
        <div className="space-y-2">
          {filtered.map((b: any) => (
            <Card key={b.id} className="p-3 border-border/60 shadow-premium flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-500/15 shrink-0"><Armchair className="size-4 text-emerald-600" /></div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium truncate">{b.employee?.name ?? "Unknown"}</p>
                  <Badge className={cn("rounded-full text-[9px]", b.status === "APPROVED" ? "bg-emerald-500/15 text-emerald-700" : b.status === "PENDING" ? "bg-amber-500/15 text-amber-700" : b.status === "CHECKED_IN" ? "bg-sky-500/15 text-sky-700" : b.status === "CANCELLED" ? "bg-rose-500/15 text-rose-700" : "bg-zinc-500/15 text-zinc-600")}>{b.status.replace(/_/g, " ").toLowerCase()}</Badge>
                  {b.type === "LATE" && <Badge variant="outline" className="text-[9px]">late</Badge>}
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1"><MapPin className="size-2.5" /> Seat {b.seatNumber}</span>
                  <span className="flex items-center gap-1"><CalendarDays className="size-2.5" /> {format(new Date(b.date), "EEE, dd MMM")}</span>
                  <span className="flex items-center gap-1"><Clock className="size-2.5" /> {b.expectedCheckIn}–{b.expectedCheckOut}</span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{b.purpose}</p>
              </div>
              {(b.status === "APPROVED" || b.status === "PENDING" || b.status === "CHECKED_IN") && (
                <Button variant="ghost" size="sm" className="text-rose-600 hover:text-rose-700 text-xs shrink-0" onClick={() => setCancelTarget(b)}>Cancel</Button>
              )}
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!cancelTarget} onOpenChange={(o) => { if (!o) { setCancelTarget(null); setCancelReason(""); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><X className="size-4 text-rose-500" /> Cancel this booking?</DialogTitle><DialogDescription>{cancelTarget && `${cancelTarget.employee?.name} · Seat ${cancelTarget.seatNumber} · ${format(new Date(cancelTarget.date), "EEE, dd MMM")}. The seat will become available immediately.`}</DialogDescription></DialogHeader>
          <div className="space-y-2"><Label className="text-xs">Reason (optional)</Label><Textarea value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="e.g. Seat needed for priority booking" className="text-xs min-h-[60px]" /></div>
          <div className="flex gap-2"><Button variant="outline" className="flex-1" onClick={() => { setCancelTarget(null); setCancelReason(""); }}>Keep booking</Button><Button variant="destructive" className="flex-1 gap-1.5" disabled={cancel.isPending} onClick={() => cancel.mutate(cancelTarget)}>{cancel.isPending ? <Loader2 className="size-4 animate-spin" /> : <X className="size-4" />} Cancel booking</Button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Signups tab (admin: approve/reject signup requests) ───────────────────
export function SignupsTab() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState("PENDING");
  const [actionTarget, setActionTarget] = useState<any | null>(null);
  const [note, setNote] = useState("");

  const { data: requests, isLoading } = useQuery({
    queryKey: ["admin-signups", filter],
    queryFn: async () => {
      const r = await fetch(`/api/admin/signups?status=${filter}`);
      const j = await r.json();
      return j.data ?? [];
    },
  });

  const act = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/admin/signups/${actionTarget.id}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: actionTarget.action, note }),
      });
      const j = await res.json(); if (!j.ok) throw new Error(j.error); return j.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-signups"] });
      qc.invalidateQueries({ queryKey: ["admin-employees"] });
      toast.success(actionTarget.action === "approve" ? "Signup approved — account created" : "Signup rejected");
      setActionTarget(null); setNote("");
    },
    onError: (e: Error) => toast.error("Action failed", { description: e.message }),
  });

  const counts = (requests ?? []).reduce((acc: any, r: any) => {
    if (!acc[r.status]) acc[r.status] = 0; acc[r.status]++; return acc;
  }, { PENDING: 0, APPROVED: 0, REJECTED: 0 } as Record<string, number>);

  return (
    <div>
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[160px] h-9 rounded-lg text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="PENDING">Pending ({counts.PENDING || 0})</SelectItem>
            <SelectItem value="APPROVED">Approved</SelectItem>
            <SelectItem value="REJECTED">Rejected</SelectItem>
            <SelectItem value="all">All</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <Card className="p-10 text-center text-sm text-muted-foreground"><Loader2 className="size-5 animate-spin mx-auto mb-2" /> Loading…</Card>
      ) : !requests?.length ? (
        <EmptyState icon={UserPlus} title="No signup requests" description={filter === "PENDING" ? "No pending requests right now." : `No ${filter.toLowerCase()} requests.`} />
      ) : (
        <div className="space-y-3">
          {requests.map((r: any) => (
            <Card key={r.id} className={cn("p-4 border-border/60 shadow-premium", r.status === "PENDING" && "ring-1 ring-amber-500/20")}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <Avatar className="size-10 ring-2 ring-background shrink-0" style={{ backgroundColor: "#10b981" }}>
                    <AvatarFallback className="text-white text-xs font-semibold" style={{ backgroundColor: "#10b981" }}>{r.name.split(" ").map((n: string) => n[0]).slice(0, 2).join("")}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold">{r.name}</p>
                      <Badge variant="outline" className="text-[10px] font-mono">{r.employeeId}</Badge>
                      <Badge className={cn("rounded-full text-[9px]", r.status === "PENDING" ? "bg-amber-500/15 text-amber-700" : r.status === "APPROVED" ? "bg-emerald-500/15 text-emerald-700" : "bg-rose-500/15 text-rose-700")}>{r.status.toLowerCase()}</Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{r.email}{r.phone ? ` · ${r.phone}` : ""}</p>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-[10px] text-muted-foreground">
                      {r.designation && <span>{r.designation}</span>}
                      {r.department && <span>· {r.department}</span>}
                      {r.jobTitle && <span>· {r.jobTitle}</span>}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">Requested {format(new Date(r.createdAt), "dd MMM, HH:mm")}{r.reviewedAt ? ` · Reviewed ${format(new Date(r.reviewedAt), "dd MMM")}` : ""}</p>
                    {r.reviewNote && <p className="text-[10px] text-amber-600 mt-1 italic">Note: {r.reviewNote}</p>}
                  </div>
                </div>
              </div>
              {r.status === "PENDING" && (
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/40">
                  <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={() => setActionTarget({ ...r, action: "approve" })}><Check className="size-3.5" /> Approve</Button>
                  <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs text-rose-600" onClick={() => setActionTarget({ ...r, action: "reject" })}><X className="size-3.5" /> Reject</Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!actionTarget} onOpenChange={(o) => { if (!o) { setActionTarget(null); setNote(""); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {actionTarget?.action === "approve" ? <Check className="size-4 text-emerald-500" /> : <X className="size-4 text-rose-500" />}
              {actionTarget?.action === "approve" ? "Approve signup" : "Reject signup"}
            </DialogTitle>
            <DialogDescription>{actionTarget?.name} · {actionTarget?.employeeId}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label className="text-xs">Note (optional)</Label>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder={actionTarget?.action === "approve" ? "Welcome to the team" : "Reason for rejection"} className="text-xs min-h-[60px]" />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => { setActionTarget(null); setNote(""); }}>Cancel</Button>
            <Button className={cn("flex-1 gap-1.5", actionTarget?.action === "reject" && "bg-rose-600 hover:bg-rose-700")} disabled={act.isPending} onClick={() => act.mutate()}>
              {act.isPending ? <Loader2 className="size-4 animate-spin" /> : actionTarget?.action === "approve" ? <Check className="size-4" /> : <X className="size-4" />}
              {actionTarget?.action === "approve" ? "Approve & create account" : "Reject request"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Main Admin Panel ────────────────────────────────────────────────────────
export function AdminView() {
  const [tab, setTab] = useState("approvals");
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6 sm:py-8">
      <PageHeader title="Admin Panel" description="Approve bookings, manage employees and seats." />
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="rounded-full p-1 flex-wrap h-auto">
          <TabsTrigger value="approvals" className="rounded-full gap-1.5 text-xs"><CheckSquare className="size-3.5" /> Approvals</TabsTrigger>
          <TabsTrigger value="signups" className="rounded-full gap-1.5 text-xs"><UserPlus className="size-3.5" /> Signups</TabsTrigger>
          <TabsTrigger value="bookings" className="rounded-full gap-1.5 text-xs"><CalendarDays className="size-3.5" /> All Bookings</TabsTrigger>
          <TabsTrigger value="employees" className="rounded-full gap-1.5 text-xs"><Users className="size-3.5" /> Employees</TabsTrigger>
          <TabsTrigger value="seats" className="rounded-full gap-1.5 text-xs"><Armchair className="size-3.5" /> Seats</TabsTrigger>
        </TabsList>
        <TabsContent value="approvals" className="mt-4"><ApprovalsInline /></TabsContent>
        <TabsContent value="signups" className="mt-4"><SignupsTab /></TabsContent>
        <TabsContent value="bookings" className="mt-4"><AllBookingsTab /></TabsContent>
        <TabsContent value="employees" className="mt-4"><EmployeesTab /></TabsContent>
        <TabsContent value="seats" className="mt-4"><SeatsTab /></TabsContent>
      </Tabs>
    </div>
  );
}

// Inline approvals (reused in admin panel)
export function ApprovalsInline() {
  const qc = useQueryClient();
  const [actionTarget, setActionTarget] = useState<any | null>(null);
  const [note, setNote] = useState("");

  const { data: pending, isLoading } = useQuery({
    queryKey: ["approvals"],
    queryFn: async () => { const res = await fetch("/api/approvals"); const json = await res.json(); return json.data ?? []; },
  });

  const act = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/approvals/${actionTarget.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: actionTarget.action, note }) });
      const j = await res.json(); if (!j.ok) throw new Error(j.error); return j.data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["approvals"] }); toast.success(actionTarget.action === "approve" ? "Booking approved" : "Booking rejected"); setActionTarget(null); setNote(""); },
    onError: (e: Error) => toast.error("Action failed", { description: e.message }),
  });

  if (isLoading) return <Card className="p-10 text-center text-sm text-muted-foreground"><Loader2 className="size-5 animate-spin mx-auto mb-2" /> Loading…</Card>;
  if (!pending?.length) return <EmptyState icon={CheckSquare} title="All caught up!" description="No pending approval requests." />;

  return (
    <div className="space-y-3">
      {pending.map((b: any) => (
        <Card key={b.id} className="p-4 border-border/60 shadow-premium">
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">{b.employeeName} <span className="text-[10px] text-muted-foreground font-normal">{b.employeeId}</span></p>
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1"><MapPin className="size-2.5" /> Seat {b.seatNumber}</span>
                <span className="flex items-center gap-1"><CalendarDays className="size-2.5" /> {format(new Date(b.date), "EEE, dd MMM")}</span>
                <span className="flex items-center gap-1"><Clock className="size-2.5" /> {b.expectedCheckIn}–{b.expectedCheckOut}</span>
              </div>
              {b.justification && <div className="mt-2 rounded-lg bg-amber-500/5 border border-amber-500/20 p-2"><p className="text-[11px] text-muted-foreground italic">"{b.justification}"</p></div>}
              <p className="text-[11px] mt-1"><span className="text-muted-foreground">Purpose:</span> {b.purpose}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/40">
            <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={() => setActionTarget({ ...b, action: "approve" })}><Check className="size-3.5" /> Approve</Button>
            <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs text-rose-600" onClick={() => setActionTarget({ ...b, action: "reject" })}><X className="size-3.5" /> Reject</Button>
          </div>
        </Card>
      ))}
      <Dialog open={!!actionTarget} onOpenChange={(o) => { if (!o) { setActionTarget(null); setNote(""); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2">{actionTarget?.action === "approve" ? <Check className="size-4 text-emerald-500" /> : <X className="size-4 text-rose-500" />}{actionTarget?.action === "approve" ? "Approve booking" : "Reject booking"}</DialogTitle><DialogDescription>{actionTarget && `${actionTarget.employeeName} · Seat ${actionTarget.seatNumber}`}</DialogDescription></DialogHeader>
          <div className="space-y-2"><Label className="text-xs">Note (optional)</Label><Textarea value={note} onChange={(e) => setNote(e.target.value)} className="text-xs min-h-[60px]" /></div>
          <div className="flex gap-2"><Button variant="outline" className="flex-1" onClick={() => { setActionTarget(null); setNote(""); }}>Cancel</Button><Button className={cn("flex-1 gap-1.5", actionTarget?.action === "reject" && "bg-rose-600 hover:bg-rose-700")} disabled={act.isPending} onClick={() => act.mutate()}>{act.isPending ? <Loader2 className="size-4 animate-spin" /> : actionTarget?.action === "approve" ? <Check className="size-4" /> : <X className="size-4" />} Confirm</Button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
