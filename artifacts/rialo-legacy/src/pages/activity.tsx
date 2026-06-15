import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity, Wallet, Mail, Smartphone, CheckCircle2,
  ChevronRight, Loader2, MessageSquare, Hash, Bell,
  AlertTriangle, Siren, Info,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useGetInactivitySettings, useUpdateInactivitySettings, getGetInactivitySettingsQueryKey } from "@/lib/api";
import { useNotificationPrefs } from "@/hooks/use-notification-prefs";
import { Switch } from "@/components/ui/switch";
import { Link } from "wouter";
import { toast } from "sonner";

const PERIOD_OPTIONS = [
  { days: 30, label: "30 Days", desc: "High-activity lifestyle" },
  { days: 60, label: "60 Days", desc: "Standard protection" },
  { days: 90, label: "90 Days", desc: "Recommended" },
  { days: 180, label: "180 Days", desc: "Low-activity lifestyle" },
];

const STAGES = [
  { key: "active", label: "Active", desc: "Normal operation", icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-500", border: "border-emerald-500" },
  { key: "warning", label: "Warning", desc: "No activity detected", icon: AlertTriangle, color: "text-amber-500", bg: "bg-amber-500", border: "border-amber-500" },
  { key: "escalation", label: "Escalation", desc: "Guardians notified", icon: Bell, color: "text-orange-500", bg: "bg-orange-400", border: "border-orange-400" },
  { key: "triggered", label: "Transfer", desc: "Batch transfer active", icon: Siren, color: "text-red-500", bg: "bg-red-500", border: "border-red-500" },
] as const;

const BATCH_STAGES = [
  {
    batch: "Batch 1 — 25%",
    warning: "Warning sent to user via email, WhatsApp, and Telegram.",
    guardians: "Guardians notified.",
    panicWindow: "72 hr panic window",
    color: "border-amber-500/60 bg-amber-500/5",
    dot: "bg-amber-500",
    label: "First batch",
  },
  {
    batch: "Batch 2 — 50%",
    warning: "Second warning sent. Guardian confirmation requested.",
    guardians: "Guardians vote required.",
    panicWindow: "48 hr panic window",
    color: "border-orange-500/60 bg-orange-500/5",
    dot: "bg-orange-400",
    label: "Second batch",
  },
  {
    batch: "Batch 3 — 75%",
    warning: "Final warning across all channels: email, WhatsApp, Telegram, Discord.",
    guardians: "All guardians must confirm.",
    panicWindow: "24 hr panic window",
    color: "border-red-500/60 bg-red-500/5",
    dot: "bg-red-500",
    label: "Third batch",
  },
  {
    batch: "Batch 4 — 100%",
    warning: "Full transfer executed after all panic windows have elapsed.",
    guardians: "Recovery package unlocked.",
    panicWindow: "No further abort",
    color: "border-red-700/60 bg-red-700/5",
    dot: "bg-red-700",
    label: "Final batch",
  },
];

export function ActivityPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useGetInactivitySettings();
  const { prefs } = useNotificationPrefs();
  const update = useUpdateInactivitySettings({
    mutation: {
      onSuccess: () => { qc.invalidateQueries({ queryKey: getGetInactivitySettingsQueryKey() }); },
      onError: () => toast.error("Failed to save settings"),
    },
  });

  const [inactivityDays, setInactivityDays] = useState(90);
  const [autoCheckIn, setAutoCheckIn] = useState(true);
  const [showBatches, setShowBatches] = useState(false);

  useEffect(() => {
    if (data) {
      setInactivityDays(data.inactivityDays);
      setAutoCheckIn(data.autoCheckInEnabled);
    }
  }, [data]);

  const status = data?.currentStatus ?? "active";
  const activeStageIdx = Math.max(0, STAGES.findIndex((s) => s.key === status));

  function selectPeriod(days: number) {
    setInactivityDays(days);
    update.mutate({ data: { inactivityDays: days } });
    toast.success(`Inactivity period set to ${days} days`);
  }

  function toggleAutoCheckIn(v: boolean) {
    setAutoCheckIn(v);
    update.mutate({ data: { autoCheckInEnabled: v } });
  }

  const signals = [
    {
      icon: Wallet, tone: "emerald" as const, title: "Wallet Activity",
      subtitle: "Monitors on-chain transactions on connected addresses",
      configured: true,
    },
    {
      icon: Mail, tone: "primary" as const, title: "Email Response",
      subtitle: "Sends periodic check-in emails and awaits response",
      configured: true,
    },
    {
      icon: Smartphone, tone: "emerald" as const, title: "WhatsApp",
      subtitle: prefs.whatsapp ? `Configured: ${prefs.whatsapp}` : "Not configured",
      configured: !!prefs.whatsapp,
      href: "/security",
      cta: prefs.whatsapp ? undefined : "Add number",
    },
    {
      icon: MessageSquare, tone: "sky" as const, title: "Telegram",
      subtitle: prefs.telegram ? `@${prefs.telegram.replace(/^@/, "")}` : "Not configured",
      configured: !!prefs.telegram,
      href: "/security",
      cta: prefs.telegram ? undefined : "Add username",
    },
    {
      icon: Hash, tone: "indigo" as const, title: "Discord",
      subtitle: prefs.discord ? prefs.discord : "Not configured",
      configured: !!prefs.discord,
      href: "/security",
      cta: prefs.discord ? undefined : "Add username",
    },
  ];

  const configuredCount = signals.filter((s) => s.configured).length;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-4xl font-bold mb-1.5">Activity Monitor</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Configure how Arkive detects your presence across all channels before triggering the dead-man switch.
        </p>
      </motion.div>

      {/* Status timeline */}
      <div className="bg-card border border-border rounded-2xl mb-6 overflow-hidden">
        <div className="px-4 sm:px-5 py-3 bg-primary/5 border-b border-border flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Activity className="w-4 h-4 text-primary flex-shrink-0" />
            <span className="text-sm font-medium flex-shrink-0">Status:</span>
            <span className="text-sm font-bold text-primary uppercase tracking-wide truncate">{status}</span>
          </div>
          {(status === "warning" || status === "escalation" || status === "triggered") && (
            <Link href="/dashboard">
              <span className="text-xs font-semibold text-red-400 hover:text-red-300 flex items-center gap-1 flex-shrink-0">
                <Siren className="w-3 h-3" /> Panic
              </span>
            </Link>
          )}
        </div>
        <div className="px-4 sm:px-5 py-5 overflow-x-auto">
          <div className="relative flex items-start justify-between gap-1 min-w-[280px]">
            <div className="absolute left-0 right-0 top-[13px] h-px bg-border -z-0" />
            {STAGES.map((stage, i) => {
              const isActive = i === activeStageIdx;
              const isPast = i < activeStageIdx;
              const StageIcon = stage.icon;
              return (
                <div key={stage.key} className="relative z-10 flex flex-col items-center text-center flex-1 px-1">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center border-2 flex-shrink-0 ${
                    isActive ? `${stage.bg} ${stage.border}` : isPast ? "bg-primary border-primary" : "bg-background border-border"
                  }`}>
                    {isActive
                      ? <div className="w-2.5 h-2.5 rounded-full bg-white" />
                      : isPast
                        ? <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                        : <StageIcon className={`w-3 h-3 ${stage.color} opacity-40`} />
                    }
                  </div>
                  <p className={`mt-2 text-[11px] sm:text-sm font-semibold leading-tight ${isActive ? "text-foreground" : "text-muted-foreground"}`}>
                    {stage.label}
                  </p>
                  <p className="text-[10px] text-muted-foreground hidden sm:block mt-0.5 leading-tight">{stage.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-5 mb-5">
        {/* Inactivity period */}
        <div className="space-y-5">
          <div className="bg-card border border-border rounded-2xl p-4 sm:p-5">
            <h3 className="font-bold mb-1">Inactivity Period</h3>
            <p className="text-sm text-muted-foreground mb-4">How long before the system considers you inactive across all channels?</p>
            <div className="space-y-2">
              {PERIOD_OPTIONS.map(({ days, label, desc }) => {
                const selected = inactivityDays === days;
                return (
                  <button key={days} onClick={() => selectPeriod(days)} disabled={isLoading || update.isPending}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left ${
                      selected ? "border-primary bg-primary/5" : "border-transparent bg-muted/50 hover:bg-muted"
                    }`}>
                    <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${selected ? "border-primary" : "border-muted-foreground/40"}`}>
                      {selected && <div className="w-2 h-2 rounded-full bg-primary" />}
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-sm font-medium">{label}</p>
                      <p className="text-xs text-muted-foreground">{desc}</p>
                    </div>
                    {selected && <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-4 sm:p-5">
            <h3 className="font-bold mb-1">Auto Check-In</h3>
            <p className="text-sm text-muted-foreground mb-4">Automatically reset the timer based on on-chain wallet activity.</p>
            <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-muted/50 border border-border">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                  <Wallet className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold">Wallet Activity Tracking</p>
                  <p className="text-xs text-muted-foreground">Monitor connected wallets for transactions</p>
                </div>
              </div>
              <Switch checked={autoCheckIn} onCheckedChange={toggleAutoCheckIn} />
            </div>
          </div>
        </div>

        {/* Multi-signal panel */}
        <div className="bg-card border border-border rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-bold">Multi-Signal Verification</h3>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${configuredCount >= 3 ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"}`}>
              {configuredCount}/5 active
            </span>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            All configured channels must be inactive before the system escalates. The more channels, the safer.
          </p>
          <div className="space-y-2.5">
            {signals.map((s) => (
              <SignalRow key={s.title} icon={s.icon} tone={s.tone} title={s.title} subtitle={s.subtitle} configured={s.configured} href={s.href} cta={s.cta} />
            ))}
          </div>
          {configuredCount < 3 && (
            <div className="mt-4 flex items-start gap-2 text-xs text-amber-500 bg-amber-500/10 rounded-xl p-3">
              <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              <span>Configure at least 3 channels for reliable multi-signal verification.</span>
            </div>
          )}
        </div>
      </div>

      {/* Batch Transfer Timeline */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <button
          onClick={() => setShowBatches((v) => !v)}
          className="w-full px-4 sm:px-5 py-4 flex items-center justify-between text-left hover:bg-muted/30 transition-colors"
        >
          <div className="flex items-center gap-2 min-w-0">
            <Siren className="w-4 h-4 text-primary flex-shrink-0" />
            <span className="font-bold">Batch Transfer Timeline</span>
            <span className="text-xs text-muted-foreground ml-1 hidden sm:inline">— how transfers execute with warnings</span>
          </div>
          <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform flex-shrink-0 ${showBatches ? "rotate-90" : ""}`} />
        </button>
        <AnimatePresence>
          {showBatches && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-t border-border"
            >
              <div className="p-4 sm:p-5 space-y-3">
                <p className="text-sm text-muted-foreground mb-4">
                  If all {inactivityDays}-day signals are missed, assets transfer in 4 batches over several days.
                  A panic reset is available at any point to abort and restore the system.
                </p>
                {BATCH_STAGES.map((b, i) => (
                  <div key={i} className={`border ${b.color} rounded-xl p-4`}>
                    <div className="flex items-start gap-3">
                      <div className={`w-2.5 h-2.5 rounded-full ${b.dot} mt-1.5 flex-shrink-0`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                          <p className="font-semibold text-sm">{b.batch}</p>
                          <span className="text-[10px] font-mono border border-current opacity-60 px-1.5 py-0.5 rounded">{b.panicWindow}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{b.warning}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{b.guardians}</p>
                      </div>
                    </div>
                  </div>
                ))}
                <div className="rounded-xl bg-primary/5 border border-primary/20 p-3 text-xs text-muted-foreground mt-2">
                  <span className="font-semibold text-foreground">Panic Button</span> — visible on your dashboard at all times once a transfer starts. Log in and press it to abort all batches and reset the system instantly.
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {update.isPending && (
        <div className="fixed bottom-6 right-6 bg-card border border-border rounded-full px-4 py-2 shadow-lg flex items-center gap-2 text-sm z-50">
          <Loader2 className="w-4 h-4 animate-spin text-primary" /> Saving...
        </div>
      )}
    </div>
  );
}

type Tone = "emerald" | "primary" | "amber" | "sky" | "indigo";

function SignalRow({ icon: Icon, tone, title, subtitle, configured, href, cta }: {
  icon: any; tone: Tone; title: string; subtitle: string; configured: boolean; href?: string; cta?: string;
}) {
  const toneMap: Record<Tone, string> = {
    emerald: "bg-emerald-500/10 text-emerald-500",
    primary: "bg-primary/10 text-primary",
    amber: "bg-amber-500/10 text-amber-500",
    sky: "bg-sky-500/10 text-sky-500",
    indigo: "bg-indigo-500/10 text-indigo-500",
  };
  return (
    <div className={`px-3.5 py-3 rounded-xl bg-muted/50 border ${configured ? "border-border" : "border-dashed border-border/60"}`}>
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${toneMap[tone]}`}><Icon className="w-4 h-4" /></div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold flex items-center gap-1.5">
            {title}
            {configured
              ? <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
              : <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30 flex-shrink-0" />
            }
          </p>
          <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
        </div>
        {cta && href && (
          <Link href={href}>
            <span className="text-xs font-semibold text-primary hover:underline flex items-center gap-0.5 whitespace-nowrap">
              {cta} <ChevronRight className="w-3 h-3" />
            </span>
          </Link>
        )}
      </div>
    </div>
  );
}
