"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Armchair, User, Mail, Lock, Eye, EyeOff, ArrowRight, ArrowLeft, CheckCircle2,
  Loader2, Building2, Phone, Briefcase, ShieldCheck, Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useApp } from "@/lib/store";

export function SignupView() {
  const setView = useApp((s) => s.setView);
  const [form, setForm] = useState({
    name: "", email: "", employeeId: "", phone: "", jobTitle: "",
    designation: "", department: "", password: "", confirmPassword: "",
  });
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const update = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.employeeId || !form.password) {
      toast.error("Please fill all required fields");
      return;
    }
    if (form.password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (form.password !== form.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (!form.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      toast.error("Please enter a valid email address");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          employeeId: form.employeeId,
          phone: form.phone,
          jobTitle: form.jobTitle,
          designation: form.designation,
          department: form.department,
          password: form.password,
        }),
      });
      const json = await res.json();
      if (!json.ok) {
        toast.error("Signup failed", { description: json.error });
        setLoading(false);
        return;
      }
      setSubmitted(true);
      toast.success("Signup request submitted!", { description: "An admin will review your request." });
    } catch {
      toast.error("Network error", { description: "Please try again." });
    }
    setLoading(false);
  };

  if (submitted) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 sm:p-6 bg-mesh">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md text-center">
          <div className="flex size-16 items-center justify-center rounded-2xl bg-emerald-500/15 mx-auto mb-5">
            <CheckCircle2 className="size-8 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Request submitted!</h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">
            Your signup request has been received. An admin will review it and you'll be able to log in once approved.
          </p>
          <Card className="mt-6 p-4 text-left border-border/60 shadow-premium">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="size-3.5 text-amber-500" />
              <span>Status: <span className="font-semibold text-amber-600">Pending admin approval</span></span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
              <User className="size-3.5 text-emerald-500" />
              <span>{form.name} · {form.employeeId}</span>
            </div>
          </Card>
          <Button className="mt-6 rounded-full gap-2" onClick={() => setView("home")}>
            <ArrowLeft className="size-4" /> Back to home
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 sm:p-6 bg-mesh">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="flex items-center gap-2.5 mb-6 justify-center">
          <div className="size-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-glow">
            <Armchair className="size-5 text-white" />
          </div>
          <div>
            <p className="font-semibold tracking-tight">SeatScape</p>
            <p className="text-[10px] text-muted-foreground -mt-0.5">Smart Seat Reservation</p>
          </div>
        </div>

        <h1 className="text-2xl font-semibold tracking-tight text-center">Request an account</h1>
        <p className="text-sm text-muted-foreground mt-1 text-center">Fill in your details. An admin will review and approve your request.</p>

        <form onSubmit={submit} className="mt-6 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Full name *</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="John Doe" className="pl-9 h-10 rounded-xl" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Employee ID *</Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input value={form.employeeId} onChange={(e) => update("employeeId", e.target.value.toUpperCase())} placeholder="EDU-2025" className="pl-9 h-10 rounded-xl" />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Email *</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="name@edunet.org" className="pl-9 h-10 rounded-xl" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Phone</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input value={form.phone} onChange={(e) => update("phone", e.target.value)} placeholder="+91…" className="pl-9 h-10 rounded-xl" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Department</Label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input value={form.department} onChange={(e) => update("department", e.target.value)} placeholder="Programs" className="pl-9 h-10 rounded-xl" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Job title</Label>
              <Input value={form.jobTitle} onChange={(e) => update("jobTitle", e.target.value)} placeholder="Program Manager" className="h-10 rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Designation</Label>
              <Input value={form.designation} onChange={(e) => update("designation", e.target.value)} placeholder="Program Director" className="h-10 rounded-xl" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Password *</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input type={showPwd ? "text" : "password"} value={form.password} onChange={(e) => update("password", e.target.value)} placeholder="Min 8 characters" className="pl-9 pr-9 h-10 rounded-xl" />
              <button type="button" onClick={() => setShowPwd((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showPwd ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Confirm password *</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input type={showPwd ? "text" : "password"} value={form.confirmPassword} onChange={(e) => update("confirmPassword", e.target.value)} placeholder="Re-enter password" className="pl-9 h-10 rounded-xl" />
            </div>
            {form.confirmPassword && form.password !== form.confirmPassword && <p className="text-[10px] text-rose-600">Passwords do not match</p>}
          </div>

          <Button type="submit" disabled={loading} className="w-full h-11 rounded-xl gap-2 shadow-premium">
            {loading ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
            {loading ? "Submitting…" : "Submit request"}
            {!loading && <ArrowRight className="size-4" />}
          </Button>
        </form>

        <div className="mt-5 text-center">
          <button onClick={() => setView("home")} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 mx-auto">
            <ArrowLeft className="size-3" /> Back to home
          </button>
        </div>

        <p className="text-center text-[11px] text-muted-foreground mt-4">
          Already have an account?{" "}
          <button onClick={() => setView("book")} className="text-emerald-600 hover:underline">Sign in</button>
        </p>
      </motion.div>
    </div>
  );
}
