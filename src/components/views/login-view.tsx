"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Lock, Mail, Eye, EyeOff, ArrowRight, ShieldCheck, KeyRound,
  Building2, CheckCircle2, Loader2, Armchair,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useApp } from "@/lib/store";
import { useRefreshAuth } from "@/components/providers";

export function LoginView() {
  const setView = useApp((s) => s.setView);
  const refreshAuth = useRefreshAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);

  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotStep, setForgotStep] = useState<"request" | "reset">("request");
  const [forgotEid, setForgotEid] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const isEmail = identifier.includes("@");

  // Check if signup is enabled (developer can toggle)
  const { data: custom } = useQuery({
    queryKey: ["customization"],
    queryFn: async () => { const r = await fetch("/api/customization"); const j = await r.json(); return j.data ?? {}; },
    staleTime: 60_000,
  });
  const signupEnabled = custom?.signupEnabled !== false;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !password) {
      toast.error("Please enter your Employee ID or email and password");
      return;
    }
    setLoading(true);
    try {
      const payload = isEmail ? { email: identifier } : { employeeId: identifier };
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, password, remember }),
      });
      const json = await res.json();
      if (!json.ok) {
        if (json.code === "LOCKED") toast.error("Account locked", { description: "Too many failed attempts. Try again in 15 minutes." });
        else toast.error("Login failed", { description: json.error });
        setLoading(false);
        return;
      }
      toast.success("Welcome back!", { description: `${json.data.name} · ${json.data.role}` });
      await refreshAuth();
      setView("book");
    } catch {
      toast.error("Network error", { description: "Please try again." });
    }
    setLoading(false);
  };

  const requestReset = async () => {
    if (!forgotEid) { toast.error("Enter your Employee ID or email"); return; }
    setLoading(true);
    const res = await fetch("/api/auth/forgot-password", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(forgotEid.includes("@") ? { email: forgotEid } : { employeeId: forgotEid }),
    });
    const json = await res.json();
    setLoading(false);
    if (json.ok) {
      toast.success("Reset link generated", { description: "Check your email (token shown below)." });
      if (json.data?.devToken) { setResetToken(json.data.devToken); setForgotStep("reset"); }
    } else toast.error("Could not process", { description: json.error });
  };

  const doReset = async () => {
    if (!newPassword || newPassword.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    setLoading(true);
    const res = await fetch("/api/auth/reset-password", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: resetToken, password: newPassword, ...(forgotEid.includes("@") ? { email: forgotEid } : { employeeId: forgotEid }) }),
    });
    const json = await res.json();
    setLoading(false);
    if (json.ok) {
      toast.success("Password reset", { description: "You're now logged in." });
      setForgotOpen(false);
      await refreshAuth();
      setView("book");
    } else toast.error("Reset failed", { description: json.error });
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 sm:p-6 bg-mesh">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm"
      >
        <div className="flex items-center gap-2.5 mb-8 justify-center">
          <div className="size-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-glow">
            <Armchair className="size-5 text-white" />
          </div>
          <div>
            <p className="font-semibold tracking-tight">SeatScape</p>
            <p className="text-[10px] text-muted-foreground -mt-0.5">Smart Seat Reservation</p>
          </div>
        </div>

        <h1 className="text-2xl font-semibold tracking-tight text-center">Welcome back</h1>
        <p className="text-sm text-muted-foreground mt-1 text-center">Sign in to reserve your seat.</p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="eid" className="text-xs font-medium">Employee ID or Email</Label>
            <div className="relative">
              {isEmail ? <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" /> : <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />}
              <Input
                id="eid" value={identifier} onChange={(e) => setIdentifier(e.target.value)}
                placeholder="EDU-0001 or name@edunet.org" className="pl-9 h-11 rounded-xl"
                autoComplete="username"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="pwd" className="text-xs font-medium">Password</Label>
              <button type="button" onClick={() => setForgotOpen(true)} className="text-[11px] text-emerald-600 hover:underline">
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                id="pwd" type={showPwd ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••" className="pl-9 pr-9 h-11 rounded-xl"
                autoComplete="current-password"
              />
              <button type="button" onClick={() => setShowPwd((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showPwd ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Checkbox id="remember" checked={remember} onCheckedChange={(v) => setRemember(!!v)} />
              <Label htmlFor="remember" className="text-xs text-muted-foreground cursor-pointer">Remember me</Label>
            </div>
            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
              <ShieldCheck className="size-3 text-emerald-500" /> Secured
            </span>
          </div>
          <Button type="submit" disabled={loading} className="w-full h-11 rounded-xl gap-2 shadow-premium">
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Lock className="size-4" />}
            {loading ? "Signing in…" : "Sign in"}
            {!loading && <ArrowRight className="size-4" />}
          </Button>
        </form>

        <p className="text-center text-[11px] text-muted-foreground mt-6">
          Don't have an account?{" "}
          {signupEnabled ? (
            <button onClick={() => setView("signup")} className="text-emerald-600 hover:underline font-medium">Sign up</button>
          ) : (
            <button onClick={() => setView("home")} className="text-emerald-600 hover:underline">Contact admin</button>
          )}
        </p>
      </motion.div>

      {/* Forgot password dialog */}
      <Dialog open={forgotOpen} onOpenChange={(o) => { setForgotOpen(o); if (!o) setForgotStep("request"); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><KeyRound className="size-4 text-emerald-500" /> Reset your password</DialogTitle>
            <DialogDescription>
              {forgotStep === "request"
                ? "Enter your Employee ID or email. We'll send a reset link to your registered email."
                : "Enter the token from your email and choose a new password."}
            </DialogDescription>
          </DialogHeader>
          {forgotStep === "request" ? (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Employee ID or Email</Label>
                <Input value={forgotEid} onChange={(e) => setForgotEid(e.target.value)} placeholder="EDU-0001 or name@edunet.org" className="h-10" />
              </div>
              <Button className="w-full h-10" disabled={loading} onClick={requestReset}>
                {loading ? <Loader2 className="size-4 animate-spin" /> : "Send reset link"}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Reset token</Label>
                <Input value={resetToken} onChange={(e) => setResetToken(e.target.value)} className="h-10 font-mono text-xs" readOnly />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">New password</Label>
                <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="At least 8 characters" className="h-10" />
              </div>
              <Button className="w-full h-10" disabled={loading} onClick={doReset}>
                {loading ? <Loader2 className="size-4 animate-spin" /> : "Reset & sign in"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
