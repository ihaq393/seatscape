"use client";

import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ShieldCheck, KeyRound, Camera, Loader2, Lock, Eye, EyeOff, Check, User, Mail, Phone, Briefcase, Building2, Save, Trash2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared";
import { useApp } from "@/lib/store";
import { useRefreshAuth } from "@/components/providers";
import { ROLE_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function ProfileView() {
  const user = useApp((s) => s.user)!;
  const refreshAuth = useRefreshAuth();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);

  const changePassword = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/auth/password", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const j = await res.json(); if (!j.ok) throw new Error(j.error); return j.data;
    },
    onSuccess: () => {
      toast.success("Password changed", { description: "Use your new password next time you sign in." });
      setCurrentPassword(""); setNewPassword("");
    },
    onError: (e: Error) => toast.error("Could not change password", { description: e.message }),
  });

  const uploadPhoto = useMutation({
    mutationFn: async (file: File) => {
      const reader = new FileReader();
      const dataUrl: string = await new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const res = await fetch("/api/profile/photo", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photo: dataUrl }),
      });
      const j = await res.json(); if (!j.ok) throw new Error(j.error); return j.data;
    },
    onSuccess: () => { toast.success("Photo updated"); refreshAuth(); qc.invalidateQueries({ queryKey: ["seats"] }); },
    onError: (e: Error) => toast.error("Upload failed", { description: e.message }),
  });

  const removePhoto = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/profile/photo", { method: "DELETE" });
      const j = await res.json(); if (!j.ok) throw new Error(j.error); return j.data;
    },
    onSuccess: () => { toast.success("Photo removed"); refreshAuth(); qc.invalidateQueries({ queryKey: ["seats"] }); },
    onError: (e: Error) => toast.error("Could not remove", { description: e.message }),
  });

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Please select an image file"); return; }
    if (file.size > 2_000_000) { toast.error("Image too large (max 2MB)"); return; }
    uploadPhoto.mutate(file);
  };

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-6 sm:py-8">
      <PageHeader title="My Profile" description="Manage your account, photo and password." />

      <div className="grid gap-6 md:grid-cols-[280px_1fr]">
        {/* Left — profile card */}
        <Card className="p-5 border-border/60 shadow-premium text-center">
          <div className="relative inline-block">
            <Avatar className="size-24 ring-4 ring-background shadow-premium" style={{ backgroundColor: user.avatarColor }}>
              {user.photoUrl ? (
                <img src={user.photoUrl} alt={user.name} className="size-full object-cover rounded-full" />
              ) : (
                <AvatarFallback className="text-2xl font-semibold text-white" style={{ backgroundColor: user.avatarColor }}>
                  {user.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                </AvatarFallback>
              )}
            </Avatar>
            <button
              onClick={() => fileRef.current?.click()}
              className="absolute bottom-1 right-1 size-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-premium hover:scale-105 transition-transform"
              aria-label="Change photo"
              disabled={uploadPhoto.isPending}
            >
              {uploadPhoto.isPending ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />
          </div>
          <p className="mt-3 text-base font-semibold">{user.name}</p>
          <p className="text-xs text-muted-foreground">{user.employeeId}</p>
          <Badge variant="outline" className="mt-2 rounded-full text-xs gap-1">
            <ShieldCheck className="size-3 text-emerald-500" /> {ROLE_LABELS[user.role as keyof typeof ROLE_LABELS] ?? user.role}
          </Badge>
          {user.photoUrl && (
            <Button variant="ghost" size="sm" className="mt-3 text-xs text-rose-600 gap-1.5" onClick={() => removePhoto.mutate()} disabled={removePhoto.isPending}>
              <Trash2 className="size-3.5" /> Remove photo
            </Button>
          )}
        </Card>

        {/* Right — details + password */}
        <div className="space-y-4">
          <Card className="p-5 border-border/60 shadow-premium">
            <p className="text-sm font-semibold mb-3 flex items-center gap-2"><User className="size-4 text-emerald-500" /> Account details</p>
            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              <div><Label className="text-[11px] text-muted-foreground">Name</Label><p className="font-medium">{user.name}</p></div>
              <div><Label className="text-[11px] text-muted-foreground">Email</Label><p className="font-medium truncate">{user.email}</p></div>
              <div><Label className="text-[11px] text-muted-foreground">Designation</Label><p className="font-medium">{user.designation ?? user.jobTitle ?? "—"}</p></div>
              <div><Label className="text-[11px] text-muted-foreground">Department</Label><p className="font-medium">{user.department ?? "—"}</p></div>
              <div><Label className="text-[11px] text-muted-foreground">Phone</Label><p className="font-medium">{user.phone ?? "—"}</p></div>
              <div><Label className="text-[11px] text-muted-foreground">Employee ID</Label><p className="font-medium font-mono">{user.employeeId}</p></div>
            </div>
          </Card>

          <Card className="p-5 border-border/60 shadow-premium">
            <p className="text-sm font-semibold mb-3 flex items-center gap-2"><KeyRound className="size-4 text-emerald-500" /> Change password</p>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Current password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input type={showPwd ? "text" : "password"} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="pl-9 pr-9 h-10 rounded-xl" placeholder="••••••••" />
                  <button type="button" onClick={() => setShowPwd((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">{showPwd ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">New password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input type={showPwd ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="pl-9 h-10 rounded-xl" placeholder="At least 8 characters" />
                </div>
                {newPassword && newPassword.length < 8 && <p className="text-[10px] text-rose-600">Password must be at least 8 characters</p>}
              </div>
              <Button className="rounded-full gap-1.5" disabled={changePassword.isPending || !currentPassword || !newPassword || newPassword.length < 8} onClick={() => changePassword.mutate()}>
                {changePassword.isPending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />} Update password
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
