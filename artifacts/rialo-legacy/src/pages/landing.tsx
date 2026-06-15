import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  ArrowRight, Lock, Moon, Sun, Shield, Users, RefreshCw,
  Zap, Check, Menu, X, MessageSquare, Activity, Fingerprint,
  KeyRound, Eye, AlertTriangle, Heart, Bell, Ban, UserCheck,
  ShieldCheck, CheckCircle2, XCircle, ChevronDown, ChevronUp,
  Clock, Cpu,
} from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import logoUrl from "@/assets/rialo-logo.jpg";

const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Security", href: "#security" },
  { label: "Docs", href: "/docs", isRoute: true },
  { label: "Community", href: "/community", isRoute: true },
];

const FEATURES = [
  {
    icon: Users,
    title: "Threshold Guardian System",
    desc: "Choose 3 or 5 guardians. Recovery only unlocks when a quorum is reached (2-of-3 or 3-of-5), eliminating any single point of failure.",
    color: "text-primary bg-primary/10",
  },
  {
    icon: Activity,
    title: "Staged Inactivity Workflow",
    desc: "After detection, the system checks in with you first. If no response, guardians are notified. Only once the approval threshold is met does any action begin.",
    color: "text-sky-500 bg-sky-500/10",
  },
  {
    icon: RefreshCw,
    title: "Batch Transfers + Panic Abort",
    desc: "Assets transfer in stages, never all at once. Notifications continue at every batch. Press Panic at any point to instantly halt and reset the entire process.",
    color: "text-emerald-500 bg-emerald-500/10",
  },
];

const STEPS = [
  {
    icon: Users,
    title: "Set Up",
    desc: "Add wallets, assets, beneficiaries, and choose 3 or 5 trusted guardians with a quorum threshold.",
    status: null,
  },
  {
    icon: Activity,
    title: "Stay Active",
    desc: "Check in via wallet, email, WhatsApp, Telegram, or Discord. Inactivity is detected after your set window.",
    status: { icon: CheckCircle2, color: "text-emerald-400", label: "Active", sub: "Last check-in: 2 days ago" },
  },
  {
    icon: AlertTriangle,
    title: "Check-In & Guardian Alert",
    desc: "After 24 hrs of inactivity, you receive a check-in prompt. If still unresponsive after 48 hrs, guardians are notified.",
    status: { icon: AlertTriangle, color: "text-amber-400", label: "Warning Sent", sub: "Awaiting response..." },
  },
  {
    icon: Shield,
    title: "Threshold Approval",
    desc: "Guardians vote. Once the quorum is reached (e.g. 3-of-5), the recovery workflow is cleared to begin.",
    status: { icon: ShieldCheck, color: "text-primary", label: "Guardian Approval", sub: "2 of 3 confirmations received" },
  },
  {
    icon: Zap,
    title: "Batch Execution",
    desc: "Assets transfer in staged batches. You retain Panic Abort rights at every stage until completion.",
    status: { icon: Zap, color: "text-amber-400", label: "Executing", sub: "Batch 1 of 3 in progress" },
  },
];

const STATS = [
  {
    value: "100%",
    label: "Non-Custodial",
    sub: "You stay in control until the end.",
    icon: Shield,
    color: "text-primary",
    bg: "bg-primary/10",
  },
  {
    value: "256-bit",
    label: "End-to-End Encrypted",
    sub: "Military-grade encryption for your data.",
    icon: Lock,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
  },
  {
    value: "Multi",
    label: "Channel Alerts",
    sub: "Wallet • Email • WhatsApp • Telegram • Discord",
    icon: MessageSquare,
    color: "text-sky-400",
    bg: "bg-sky-500/10",
  },
  {
    value: "2-of-3",
    label: "Threshold Quorum",
    sub: "Guardian approval required before any transfer begins.",
    icon: KeyRound,
    color: "text-violet-400",
    bg: "bg-violet-500/10",
  },
];

const ARKIVE_INFRA = [
  {
    icon: RefreshCw,
    label: "Async Transactions",
    sub: "Long-Running Workflows",
    desc: "Pause, resume, and automate inheritance workflows across inactivity checks, guardian approvals, and staged execution.",
    color: "text-amber-400",
    bg: "bg-amber-400/10 border-amber-400/20",
  },
  {
    icon: Zap,
    label: "Reactive Transactions",
    sub: "Event-Driven Automation",
    desc: "Automatically executes workflows when inactivity conditions and guardian approval thresholds are satisfied.",
    color: "text-sky-400",
    bg: "bg-sky-400/10 border-sky-400/20",
  },
  {
    icon: KeyRound,
    label: "Threshold MPC",
    sub: "Multi-Party Computation",
    desc: "Recovery authorization is distributed across multiple guardians to eliminate single points of failure.",
    color: "text-violet-400",
    bg: "bg-violet-400/10 border-violet-400/20",
  },
  {
    icon: Cpu,
    label: "Native Automation",
    sub: "Automated Workflow Orchestration",
    desc: "Inheritance workflows progress automatically through verification, notifications, approvals, and batch execution.",
    color: "text-emerald-400",
    bg: "bg-emerald-400/10 border-emerald-400/20",
  },
];

const ARKIVE_INFRA_EXPANDED = [
  {
    icon: Eye,
    label: "Rialo Edge",
    sub: "Native API Calls",
    desc: "Securely interacts with external APIs and real-world activity signals directly within automated workflows.",
    color: "text-rose-400",
    bg: "bg-rose-400/10 border-rose-400/20",
  },
  {
    icon: Fingerprint,
    label: "Rialo IPC",
    sub: "Identity, Privacy & Compliance",
    desc: "Identity-aware infrastructure designed for privacy-preserving workflows and secure guardian coordination.",
    color: "text-cyan-400",
    bg: "bg-cyan-400/10 border-cyan-400/20",
  },
  {
    icon: Shield,
    label: "Confidential Computation",
    sub: "REX Engine",
    desc: "Sensitive recovery logic and encrypted inheritance workflows execute privately without exposing confidential user data.",
    color: "text-indigo-400",
    bg: "bg-indigo-400/10 border-indigo-400/20",
  },
  {
    icon: MessageSquare,
    label: "Native Messaging",
    sub: "Multi-Channel Notifications",
    desc: "Automated check-ins, warnings, guardian alerts, and recovery notifications are delivered throughout every stage of execution.",
    color: "text-teal-400",
    bg: "bg-teal-400/10 border-teal-400/20",
  },
  {
    icon: Activity,
    label: "Conditional Transactions",
    sub: "Rule-Based Execution",
    desc: "Transfers and recovery actions only execute when inactivity conditions and guardian approval thresholds are satisfied.",
    color: "text-orange-400",
    bg: "bg-orange-400/10 border-orange-400/20",
  },
  {
    icon: Clock,
    label: "Time-Based Execution",
    sub: "Scheduled Security Flows",
    desc: "Supports delayed execution, staged warnings, inactivity timers, and batch-based transfer scheduling for safer inheritance automation.",
    color: "text-pink-400",
    bg: "bg-pink-400/10 border-pink-400/20",
  },
];

const TRUST_BADGES = [
  { icon: Shield, label: "End-to-End Encrypted" },
  { icon: Lock, label: "You're Always in Control" },
  { icon: Check, label: "Built on Rialo" },
];

const TRUST_GUARANTEES = [
  { icon: XCircle, label: "No single guardian controls access", color: "text-rose-400" },
  { icon: ShieldCheck, label: "Threshold approval required", color: "text-primary" },
  { icon: CheckCircle2, label: "Multi-stage verification before execution", color: "text-emerald-400" },
  { icon: UserCheck, label: "User override available anytime", color: "text-sky-400" },
];

function fade(delay = 0) {
  return {
    initial: { opacity: 0, y: 20 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: 0.5, delay },
  };
}

export function LandingPage() {
  const { user, loading } = useAuth();
  const { theme, setTheme } = useTheme();
  const [, navigate] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [infraExpanded, setInfraExpanded] = useState(false);
  const isDark = theme === "dark";

  useEffect(() => {
    if (!loading && user) navigate("/dashboard");
  }, [user, loading, navigate]);

  function handleNavClick(l: { href: string; isRoute?: boolean }) {
    setMobileOpen(false);
    if (l.isRoute) {
      navigate(l.href);
    } else {
      const el = document.querySelector(l.href);
      if (el) el.scrollIntoView({ behavior: "smooth" });
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground antialiased">

      {/* ── NAV ── */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2 flex-shrink-0">
            <img src={logoUrl} alt="Arkive" className="w-8 h-8 rounded-lg object-cover ring-1 ring-border bg-white" />
            <span className="font-bold text-base tracking-tight">
              <span className="text-foreground">Arkive</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((l) => (
              <button key={l.label} onClick={() => handleNavClick(l)}
                className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted/60">
                {l.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <button onClick={() => setTheme(isDark ? "light" : "dark")}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
              title="Toggle theme">
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <Link href="/auth">
              <Button variant="ghost" size="sm" className="hidden sm:flex">Login</Button>
            </Link>
            <Link href="/auth">
              <Button size="sm" className="gap-1.5 shadow-md shadow-primary/20">
                Get Started <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
            <button className="md:hidden p-1.5 text-muted-foreground hover:text-foreground" onClick={() => setMobileOpen((v) => !v)}>
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="md:hidden border-t border-border bg-background px-4 py-3 space-y-1">
            {NAV_LINKS.map((l) => (
              <button key={l.label} onClick={() => handleNavClick(l)}
                className="block w-full text-left px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded-lg transition-colors">
                {l.label}
              </button>
            ))}
            <div className="pt-2 flex gap-2">
              <Link href="/auth" className="flex-1"><Button variant="outline" className="w-full" size="sm">Login</Button></Link>
              <Link href="/auth" className="flex-1"><Button className="w-full" size="sm">Get Started</Button></Link>
            </div>
          </div>
        )}
      </header>

      {/* ── HERO ── */}
      <section className="relative overflow-hidden py-20 sm:py-28 lg:py-32">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-primary/8 blur-[120px]" />
          <div className="absolute top-20 right-0 w-[400px] h-[400px] rounded-full bg-primary/5 blur-[100px]" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left */}
            <motion.div initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }}>
              <div className="flex flex-wrap items-center gap-2 mb-7">
                {[
                  { icon: Shield, label: "Non-custodial" },
                  { icon: Users, label: "Guardian-protected" },
                  { icon: Clock, label: "Dead-man switch" },
                ].map(({ icon: Icon, label }) => (
                  <span key={label} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-border bg-card text-xs font-medium text-muted-foreground">
                    <Icon className="w-3 h-3 text-primary" />{label}
                  </span>
                ))}
              </div>

              {/* Typography hierarchy: very bold headline */}
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.05] mb-6">
                Your Crypto.<br />
                Your Legacy.<br />
                <span className="text-primary">Protected Forever.</span>
              </h1>

              {/* Shorter, cleaner subheading */}
              <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-md mb-8">
                Securely pass on your crypto assets and recovery instructions through staged verification, guardian approvals, and automated execution powered by Rialo.
              </p>

              {/* Built on Arkive — simplified badge */}
              <div className="inline-flex flex-col sm:flex-row gap-3 sm:items-center px-4 py-3.5 rounded-xl border border-primary/30 bg-primary/8 mb-8 backdrop-blur-sm w-full sm:w-auto">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center flex-shrink-0">
                    <img src={logoUrl} alt="" className="w-5 h-5 rounded object-cover bg-white" />
                  </div>
                  <span className="text-sm font-bold text-primary">Built on Rialo Infrastructure</span>
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-1 sm:border-l sm:border-primary/20 sm:pl-3">
                  {["Async Transactions", "Reactive Transactions", "Threshold MPC", "Native Automation"].map((t) => (
                    <span key={t} className="flex items-center gap-1 text-[11px] text-primary">
                      <span className="w-1 h-1 rounded-full bg-primary/80" />{t}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-3 mb-10">
                <Link href="/auth">
                  <Button size="lg" className="gap-2 shadow-xl shadow-primary/30 h-12 px-7 text-base font-semibold">
                    Get Started Free <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
                <Button size="lg" variant="outline" className="h-12 px-6 border-border/60 hover:border-primary/40 hover:bg-primary/5 transition-colors" disabled>
                  Explore Demo
                </Button>
              </div>

              <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                {TRUST_BADGES.map((b) => (
                  <span key={b.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <b.icon className="w-3.5 h-3.5 text-primary" /> {b.label}
                  </span>
                ))}
              </div>
            </motion.div>

            {/* Right – Crypto Vault illustration */}
            <motion.div
              initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.1 }}
              className="flex justify-center lg:justify-end"
            >
              <CryptoVaultIllustration />
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── WHY THIS EXISTS ── */}
      <section className="py-20 border-t border-border bg-muted/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <motion.div {...fade()} className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-xs font-medium text-rose-400 mb-6">
              <Heart className="w-3 h-3" /> The Problem We Solve
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-tight mb-6">
              Crypto Shouldn't<br />
              <span className="text-primary">Disappear Forever.</span>
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground leading-relaxed mb-10 max-w-2xl mx-auto">
              Millions in digital assets are permanently lost because families cannot access wallets after unexpected events. Arkive helps users securely protect and pass on their digital legacy, without ever surrendering control.
            </p>
            <div className="grid sm:grid-cols-3 gap-5">
              {[
                { value: "$140B+", label: "Lost in inaccessible wallets", color: "text-rose-400", bg: "bg-rose-500/10 border-rose-500/20" },
                { value: "4M+", label: "Bitcoin estimated permanently lost", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
                { value: "0", label: "Recovery options without a plan", color: "text-primary", bg: "bg-primary/10 border-primary/20" },
              ].map((s) => (
                <motion.div key={s.label} {...fade(0.1)} className={`rounded-2xl border p-6 text-center ${s.bg}`}>
                  <p className={`text-3xl font-extrabold mb-1 ${s.color}`}>{s.value}</p>
                  <p className="text-sm text-foreground/80 font-medium leading-snug">{s.label}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="py-20 border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <motion.div {...fade()} className="text-center mb-14">
            <p className="text-xs font-mono text-primary uppercase tracking-widest mb-3">Features</p>
            <h2 className="text-3xl sm:text-4xl font-bold mb-3 tracking-tight">
              Built For Real Life.{" "}
              <span className="text-muted-foreground font-normal">Ready For The Unexpected.</span>
            </h2>
          </motion.div>

          <div className="grid sm:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title} {...fade(i * 0.1)}
                className="group bg-card border border-border rounded-2xl p-8 hover:border-primary/40 transition-all hover:shadow-xl hover:shadow-primary/8"
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-6 ${f.color}`}>
                  <f.icon className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-lg mb-3 tracking-tight">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAILSAFE EXECUTION — promoted highlight ── */}
      <section className="py-20 border-t border-border bg-muted/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div {...fade()}>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-medium text-emerald-400 mb-6">
                <Zap className="w-3 h-3" /> Failsafe Execution System
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight leading-tight mb-5">
                Transfers Happen in Stages.<br />
                <span className="text-emerald-400">You Can Stop It Anytime.</span>
              </h2>
              <p className="text-base text-muted-foreground leading-relaxed mb-8 max-w-lg">
                Unlike all-or-nothing transfers, Arkive executes in staged batches with continuous notifications at every step. One tap of Panic Abort instantly halts and resets the entire process.
              </p>
              <div className="space-y-4">
                {[
                  { icon: RefreshCw, label: "Staged batch transfers, never all at once", color: "text-emerald-400", bg: "bg-emerald-500/10" },
                  { icon: Bell, label: "Continuous warnings sent during every batch", color: "text-sky-400", bg: "bg-sky-500/10" },
                  { icon: Ban, label: "Panic Abort: instant halt and full reset", color: "text-rose-400", bg: "bg-rose-500/10" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${item.bg}`}>
                      <item.icon className={`w-4 h-4 ${item.color}`} />
                    </div>
                    <p className="text-sm font-medium">{item.label}</p>
                  </div>
                ))}
              </div>
            </motion.div>
            <motion.div {...fade(0.15)} className="flex justify-center lg:justify-end">
              <FailsafeIllustration />
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="py-20 border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <motion.div {...fade()} className="text-center mb-16">
            <p className="text-xs font-mono text-primary uppercase tracking-widest mb-3">Automated Security Orchestration</p>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              How <span className="text-primary">Arkive</span> Works
            </h2>
          </motion.div>

          <div className="relative">
            <div className="hidden lg:block absolute top-[2.4rem] left-[10%] right-[10%] h-px bg-border z-0" />

            <div className="grid grid-cols-1 sm:grid-cols-5 gap-8 lg:gap-4 relative z-10">
              {STEPS.map((step, i) => (
                <motion.div key={step.title} {...fade(i * 0.08)} className="flex flex-col items-center text-center">
                  <div className="relative mb-5">
                    <div className="w-[4.5rem] h-[4.5rem] rounded-full bg-card border-2 border-border flex items-center justify-center shadow-lg">
                      <step.icon className="w-6 h-6 text-primary" />
                    </div>
                    <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center text-[9px] font-bold text-primary-foreground">
                      {i + 1}
                    </span>
                  </div>
                  <h4 className="font-bold text-sm mb-2 tracking-tight">{step.title}</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed mb-3">{step.desc}</p>

                  {/* Status line */}
                  {step.status && (
                    <div className="mt-auto w-full bg-muted/60 border border-border rounded-lg px-2.5 py-2 text-left">
                      <p className="text-[10px] font-semibold text-foreground leading-tight flex items-center gap-1.5">
                        <step.status.icon className={`w-3 h-3 flex-shrink-0 ${step.status.color}`} />
                        {step.status.label}
                      </p>
                      <p className="text-[9px] text-muted-foreground mt-0.5">{step.status.sub}</p>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── TRUST LAYER ── */}
      <section className="py-20 border-t border-border bg-muted/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div {...fade()}>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-medium text-primary mb-6">
                <ShieldCheck className="w-3 h-3" /> Trust Layer
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight leading-tight mb-4">
                What If Guardians<br />
                <span className="text-primary">Try to Collude?</span>
              </h2>
              <p className="text-base text-muted-foreground leading-relaxed mb-8 max-w-md">
                We've thought about this. Every layer of the protocol is designed so no single party, not even a majority of guardians, can act without your knowledge or override.
              </p>
              <div className="space-y-3">
                {TRUST_GUARANTEES.map((g) => (
                  <div key={g.label} className="flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-3">
                    <g.icon className={`w-4 h-4 flex-shrink-0 ${g.color}`} />
                    <p className="text-sm font-medium">{g.label}</p>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div {...fade(0.15)}>
              <div className="bg-card border border-border rounded-2xl overflow-hidden">
                <div className="bg-muted/60 border-b border-border px-5 py-3 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-rose-400" />
                  <div className="w-2 h-2 rounded-full bg-amber-400" />
                  <div className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="text-xs font-mono text-muted-foreground ml-2">security_guarantees.log</span>
                </div>
                <div className="p-5 font-mono text-xs space-y-3">
                  {[
                    { label: "THRESHOLD_CHECK", value: "2-of-3 signatures required", color: "text-primary" },
                    { label: "USER_OVERRIDE", value: "panic_abort = always_enabled", color: "text-emerald-400" },
                    { label: "STAGE_VERIFY", value: "multi_step = true", color: "text-sky-400" },
                    { label: "COLLUSION_GUARD", value: "single_guardian_access = false", color: "text-amber-400" },
                    { label: "ENCRYPTION", value: "aes_256_gcm + threshold_mpc", color: "text-violet-400" },
                  ].map((row) => (
                    <div key={row.label} className="flex items-center gap-2 flex-wrap">
                      <span className="text-muted-foreground">[SYS]</span>
                      <span className="text-foreground">{row.label}</span>
                      <span className="text-muted-foreground">=</span>
                      <span className={row.color}>{row.value}</span>
                    </div>
                  ))}
                  <div className="border-t border-border pt-3 flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">All security checks passed.</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── STATS / SECURITY ── */}
      <section id="security" className="py-20 border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <motion.div {...fade()} className="text-center mb-14">
            <p className="text-xs font-mono text-primary uppercase tracking-widest mb-3">Security</p>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Security Guarantees
            </h2>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-16">
            {STATS.map((s, i) => (
              <motion.div
                key={s.label} {...fade(i * 0.08)}
                className="bg-card border border-border rounded-2xl p-6 flex items-start gap-4 hover:border-primary/30 transition-all hover:shadow-lg hover:shadow-primary/5"
              >
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${s.bg}`}>
                  <s.icon className={`w-5 h-5 ${s.color}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-2xl font-extrabold leading-tight">{s.value}</p>
                  <p className="text-sm font-semibold text-foreground">{s.label}</p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{s.sub}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Built on Arkive infrastructure */}
          <motion.div {...fade(0.1)}>
            <div className="flex items-center gap-4 mb-8">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center flex-shrink-0">
                  <img src={logoUrl} alt="" className="w-6 h-6 rounded object-cover bg-white" />
                </div>
                <div>
                  <h3 className="font-bold text-base leading-tight">Built on Rialo Infrastructure</h3>
                  <p className="text-xs text-muted-foreground">The infrastructure powering every Arkive workflow</p>
                </div>
              </div>
              <div className="flex-1 h-px bg-border" />
              <span className="text-[10px] font-mono text-primary border border-primary/40 bg-primary/10 px-2 py-0.5 rounded whitespace-nowrap">
                native automation layer
              </span>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {ARKIVE_INFRA.map((item, i) => (
                <motion.div key={item.label} {...fade(0.1 + i * 0.07)}
                  className={`rounded-2xl border p-6 ${item.bg} hover:scale-[1.02] transition-transform`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${item.bg}`}>
                    <item.icon className={`w-5 h-5 ${item.color}`} />
                  </div>
                  <p className={`text-sm font-bold mb-0.5 ${item.color}`}>{item.label}</p>
                  <p className="text-[10px] font-mono text-muted-foreground mb-3 uppercase tracking-wide">{item.sub}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                </motion.div>
              ))}
            </div>

            {/* Expand / collapse button */}
            <div className="mt-6 flex justify-center">
              <button
                onClick={() => setInfraExpanded((v) => !v)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border bg-card hover:border-primary/40 hover:bg-primary/5 text-sm font-medium text-muted-foreground hover:text-primary transition-all"
              >
                {infraExpanded ? (
                  <><ChevronUp className="w-4 h-4" /> Hide Full Infrastructure Stack</>
                ) : (
                  <><ChevronDown className="w-4 h-4" /> View Full Rialo Infrastructure Stack</>
                )}
              </button>
            </div>

            {/* Expandable hidden cards */}
            {infraExpanded && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-4"
              >
                {ARKIVE_INFRA_EXPANDED.map((item, i) => (
                  <motion.div key={item.label} {...fade(i * 0.06)}
                    className={`rounded-2xl border p-6 ${item.bg} hover:scale-[1.02] transition-transform`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${item.bg}`}>
                      <item.icon className={`w-5 h-5 ${item.color}`} />
                    </div>
                    <p className={`text-sm font-bold mb-0.5 ${item.color}`}>{item.label}</p>
                    <p className="text-[10px] font-mono text-muted-foreground mb-3 uppercase tracking-wide">{item.sub}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </motion.div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-24 border-t border-border relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-from)_0%,_transparent_70%)] from-primary/10" />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div {...fade()}>
              <h2 className="text-4xl sm:text-5xl font-bold leading-tight tracking-tight mb-5">
                Secure today.<br />
                <span className="text-primary">Protect tomorrow.</span>
              </h2>
              <p className="text-muted-foreground text-base sm:text-lg mb-8 max-w-md leading-relaxed">
                Join thousands of users building their legacy on a decentralized future. Set up in minutes, protected forever.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link href="/auth">
                  <Button size="lg" className="gap-2 shadow-xl shadow-primary/25 h-12 px-7 text-base font-semibold">
                    Create Your Legacy Now <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>

              <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2">
                {["Free to start", "No private keys required", "Cancel anytime"].map((t) => (
                  <span key={t} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Check className="w-3.5 h-3.5 text-primary" /> {t}
                  </span>
                ))}
              </div>
            </motion.div>

            <motion.div {...fade(0.15)} className="flex justify-center lg:justify-end">
              <ShieldIllustration />
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-border bg-card/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14">
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-10 mb-12">
            <div className="lg:col-span-1">
              <Link href="/" className="flex items-center gap-2 mb-4">
                <img src={logoUrl} alt="Arkive" className="w-8 h-8 rounded-lg object-cover ring-1 ring-border bg-white" />
                <span className="font-bold text-sm">
                  <span className="text-foreground">Arkive</span>
                </span>
              </Link>
              <p className="text-xs text-muted-foreground leading-relaxed">
                The decentralized dead-man switch for crypto inheritance.
              </p>
            </div>

            <div>
              <p className="text-sm font-semibold mb-4">Product</p>
              <ul className="space-y-2.5">
                {["Features", "How It Works", "Security", "Pricing"].map((l) => (
                  <li key={l}><a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">{l}</a></li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-sm font-semibold mb-4">Resources</p>
              <ul className="space-y-2.5">
                {["Docs", "Guides", "FAQ", "Blog"].map((l) => (
                  <li key={l}><a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">{l}</a></li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-sm font-semibold mb-4">Community</p>
              <ul className="space-y-2.5">
                {["Discord", "Telegram", "X (Twitter)", "GitHub"].map((l) => (
                  <li key={l}><a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">{l}</a></li>
                ))}
              </ul>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                  <img src={logoUrl} alt="" className="w-5 h-5 rounded object-cover bg-white" />
                </div>
                <p className="text-sm font-semibold">Built on Rialo</p>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                The automation layer for the next generation of decentralized apps.
              </p>
            </div>
          </div>

          <div className="border-t border-border pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
            <p>© 2025 Arkive. All rights reserved.</p>
            <div className="flex gap-4">
              <a href="#" className="hover:text-primary transition-colors">Privacy</a>
              <a href="#" className="hover:text-primary transition-colors">Terms</a>
              <a href="#" className="hover:text-primary transition-colors">Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

const COIN_LOGOS: Record<string, string> = {
  BTC: "https://s2.coinmarketcap.com/static/img/coins/64x64/1.png",
  ETH: "https://s2.coinmarketcap.com/static/img/coins/64x64/1027.png",
  USDC: "https://s2.coinmarketcap.com/static/img/coins/64x64/3408.png",
  BNB: "https://s2.coinmarketcap.com/static/img/coins/64x64/1839.png",
};

function CoinBadge({ symbol, size = 28 }: { symbol: string; size?: number }) {
  return (
    <img
      src={COIN_LOGOS[symbol]}
      alt={symbol}
      width={size}
      height={size}
      className="rounded-full"
      style={{ width: size, height: size, objectFit: "cover" }}
    />
  );
}

/* ── Crypto Vault Illustration ── */
function CryptoVaultIllustration() {
  const coins = [
    { symbol: "BTC", label: "Bitcoin", sub: "BTC", change: "+2.4%" },
    { symbol: "ETH", label: "Ethereum", sub: "ETH", change: "+1.8%" },
    { symbol: "USDC", label: "USD Coin", sub: "USDC", change: "Stable" },
    { symbol: "BNB", label: "BNB Chain", sub: "BNB", change: "+3.1%" },
  ];

  return (
    <div className="select-none w-full max-w-[400px]">
      {/* Vault card */}
      <div className="relative bg-card border border-border rounded-2xl p-5 mb-3 shadow-xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-transparent to-transparent pointer-events-none" />
        <div className="flex items-center gap-4 relative">
          <div className="w-14 h-14 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center flex-shrink-0 shadow-inner">
            <Lock className="w-7 h-7 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-mono text-primary uppercase tracking-widest mb-0.5">Secured Vault</p>
            <p className="text-2xl font-extrabold tracking-tight">$2,450,000</p>
            <p className="text-xs text-muted-foreground mt-0.5">4 assets protected</p>
          </div>
          <div className="flex-shrink-0">
            <span className="inline-flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-2.5 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wide">Active</span>
            </span>
          </div>
        </div>
        <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-primary" /> Guardian quorum: 2 of 3</span>
          <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Check-in: 6h ago</span>
        </div>
      </div>

      {/* 2×2 coin grid */}
      <div className="grid grid-cols-2 gap-3">
        {coins.map(({ symbol, label, sub, change }) => (
          <div key={symbol} className="bg-card border border-border rounded-xl px-3.5 py-3 flex items-center gap-3 shadow-sm hover:border-primary/30 transition-colors">
            <CoinBadge symbol={symbol} size={34} />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-foreground leading-tight truncate">{label}</p>
              <p className="text-[10px] text-muted-foreground font-mono">{sub}</p>
            </div>
            <span className={`text-[10px] font-semibold flex-shrink-0 ${change === "Stable" ? "text-muted-foreground" : "text-emerald-400"}`}>{change}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Failsafe Illustration ── */
function FailsafeIllustration() {
  return (
    <div className="relative w-[300px] sm:w-[340px]">
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-xl">
        <div className="bg-muted/60 border-b border-border px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-rose-400" />
            <div className="w-2 h-2 rounded-full bg-amber-400" />
            <div className="w-2 h-2 rounded-full bg-emerald-400" />
          </div>
          <span className="text-[10px] font-mono text-muted-foreground">batch_transfer.log</span>
        </div>
        <div className="p-4 space-y-3">
          {[
            { label: "Batch 1 of 3", amount: "0.45 ETH", status: "Complete", color: "text-emerald-400", bg: "bg-emerald-500/10" },
            { label: "Batch 2 of 3", amount: "0.45 ETH", status: "Executing", color: "text-amber-400", bg: "bg-amber-500/10" },
            { label: "Batch 3 of 3", amount: "0.45 ETH", status: "Pending", color: "text-muted-foreground", bg: "bg-muted/40" },
          ].map((b) => (
            <div key={b.label} className={`flex items-center justify-between rounded-xl px-3 py-2.5 border border-border ${b.bg}`}>
              <div>
                <p className="text-xs font-semibold">{b.label}</p>
                <p className="text-[10px] text-muted-foreground font-mono">{b.amount}</p>
              </div>
              <span className={`text-[10px] font-bold ${b.color}`}>{b.status}</span>
            </div>
          ))}
          <div className="border-t border-border pt-3">
            <button className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-bold hover:bg-rose-500/20 transition-colors">
              <Ban className="w-3.5 h-3.5" /> Panic Abort: Halt Everything
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Shield Illustration ── */
function ShieldIllustration() {
  return (
    <div className="relative w-[260px] h-[260px] sm:w-[300px] sm:h-[300px] flex items-center justify-center">
      <div className="absolute inset-0 rounded-full bg-primary/5 border border-primary/10 animate-ping opacity-20" style={{ animationDuration: "3s" }} />
      <div className="absolute inset-8 rounded-full bg-primary/8 border border-primary/15" />
      <div className="relative z-10 w-24 h-24 rounded-full bg-primary/20 border-2 border-primary/40 flex items-center justify-center shadow-xl shadow-primary/20">
        <Shield className="w-10 h-10 text-primary" />
      </div>
      {[
        { icon: Lock, angle: 0, color: "text-primary", bg: "bg-primary/10" },
        { icon: Users, angle: 72, color: "text-sky-400", bg: "bg-sky-500/10" },
        { icon: Zap, angle: 144, color: "text-amber-400", bg: "bg-amber-500/10" },
        { icon: Eye, angle: 216, color: "text-violet-400", bg: "bg-violet-500/10" },
        { icon: CheckCircle2, angle: 288, color: "text-emerald-400", bg: "bg-emerald-500/10" },
      ].map(({ icon: Icon, angle, color, bg }) => {
        const rad = (angle - 90) * (Math.PI / 180);
        const r = 108;
        const x = Math.cos(rad) * r;
        const y = Math.sin(rad) * r;
        return (
          <div key={angle} className={`absolute w-9 h-9 rounded-xl ${bg} border border-border flex items-center justify-center shadow-md`}
            style={{ left: `calc(50% + ${x}px - 18px)`, top: `calc(50% + ${y}px - 18px)` }}>
            <Icon className={`w-4 h-4 ${color}`} />
          </div>
        );
      })}
    </div>
  );
}
