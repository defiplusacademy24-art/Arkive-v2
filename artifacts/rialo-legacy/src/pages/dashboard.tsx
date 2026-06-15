import { useState } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, Timer, ShieldCheck, Settings, ArrowRight,
  DollarSign, Lock, RefreshCw, Clock, ShieldHalf,
  CheckCircle2, AlertTriangle, Siren, Loader2, Activity,
  Wallet, UserPlus, Shield, Zap, Plus, ArrowDownToLine,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useGetDashboardSummary, useListActivity, useListAssets,
  useCheckIn, usePanicReset,
  getGetDashboardSummaryQueryKey, getGetInactivitySettingsQueryKey, getListActivityQueryKey,
} from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useVaultBalance } from "@/hooks/use-vault-balance";
import { DepositModal } from "@/components/deposit-modal";
import { WithdrawModal } from "@/components/withdraw-modal";

const settingsCards = [
  { icon: Users, label: "Beneficiaries", desc: "Add or manage your recipients.", action: "Manage", href: "/transfer", color: "text-blue-500 bg-blue-500/10" },
  { icon: Timer, label: "Inactivity Rules", desc: "Set inactivity period & checks.", action: "Edit", href: "/security", color: "text-amber-500 bg-amber-500/10" },
  { icon: ShieldCheck, label: "Guardian Approvals", desc: "Select trusted guardians.", action: "Configure", href: "/guardians", color: "text-emerald-500 bg-emerald-500/10" },
  { icon: Settings, label: "Security Options", desc: "Advanced security settings.", action: "View", href: "/security", color: "text-primary bg-primary/10" },
];

const finalWishes = [
  { icon: DollarSign, name: "BTC Wallet", desc: "2.5 BTC to Sarah Johnson", color: "text-orange-500 bg-orange-500/10" },
  { icon: DollarSign, name: "ETH Wallet", desc: "10 ETH to David Chen", color: "text-sky-500 bg-sky-500/10" },
  { icon: DollarSign, name: "USDC Wallet", desc: "5000 USDC to Sarah Johnson", color: "text-emerald-500 bg-emerald-500/10" },
  { icon: Lock, name: "Recovery Package", desc: "Encrypted backup to be sent to family", color: "text-primary bg-primary/10" },
];

export function DashboardPage() {
  const qc = useQueryClient();
  const { data: summary, refetch: refetchSummary } = useGetDashboardSummary();
  const { data: activity } = useListActivity();
  const { data: assets } = useListAssets();
  const [showPanicConfirm, setShowPanicConfirm] = useState(false);
  const [showAllActivity, setShowAllActivity] = useState(false);
  const [showDeposit, setShowDeposit] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const vault = useVaultBalance();
  const vaultHasBalance = !!vault.balance && parseFloat(vault.balance) > 0;

  const checkIn = useCheckIn({
    mutation: {
      onSuccess: () => {
        toast.success("Check-in recorded!", { description: "Your inactivity timer has been reset." });
        qc.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
        qc.invalidateQueries({ queryKey: getGetInactivitySettingsQueryKey() });
        qc.invalidateQueries({ queryKey: getListActivityQueryKey() });
      },
      onError: (e: any) => toast.error(e?.message ?? "Check-in failed"),
    },
  });

  const panicReset = usePanicReset({
    mutation: {
      onSuccess: () => {
        toast.success("System reset!", { description: "All pending transfers have been aborted." });
        setShowPanicConfirm(false);
        qc.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
        qc.invalidateQueries({ queryKey: getGetInactivitySettingsQueryKey() });
        qc.invalidateQueries({ queryKey: getListActivityQueryKey() });
      },
      onError: (e: any) => toast.error(e?.message ?? "Reset failed"),
    },
  });

  const status = summary?.status ?? "active";
  const isAlert = status !== "active";
  const allActivity = activity ?? [];
  const recent = showAllActivity ? allActivity : allActivity.slice(0, 4);
  const wishes = (assets && assets.length > 0)
    ? assets.slice(0, 4).map((a) => ({
        icon: DollarSign,
        name: `${a.symbol} Wallet`,
        desc: `${a.amount} ${a.symbol}${a.beneficiaryName ? ` to ${a.beneficiaryName}` : ""}`,
        color: "text-primary bg-primary/10",
      }))
    : finalWishes;

  const statusConfig = {
    active: { color: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400", dot: "bg-emerald-500", label: "System Active", icon: CheckCircle2 },
    warning: { color: "bg-amber-500/10 border-amber-500/40 text-amber-400", dot: "bg-amber-500", label: "Inactivity Warning", icon: AlertTriangle },
    escalation: { color: "bg-orange-500/10 border-orange-500/40 text-orange-400", dot: "bg-orange-400", label: "Guardian Escalation", icon: AlertTriangle },
    triggered: { color: "bg-red-500/10 border-red-500/40 text-red-400", dot: "bg-red-500", label: "Transfer Triggered", icon: Siren },
  };
  const sc = statusConfig[status as keyof typeof statusConfig] ?? statusConfig.active;
  const StatusIcon = sc.icon;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">

      {/* Status Banner + Action Buttons */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        {/* Panic Banner */}
        <AnimatePresence>
          {isAlert && (
            <motion.div
              initial={{ opacity: 0, y: -12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12 }}
              className="mb-4 rounded-2xl border border-red-500/50 bg-red-500/10 p-5"
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex items-start gap-3 flex-1">
                  <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Siren className="w-5 h-5 text-red-400" />
                  </div>
                  <div>
                    <p className="font-bold text-red-400 text-lg">
                      {status === "triggered" ? "⚠️ Transfer in Progress" : status === "escalation" ? "⚠️ Guardian Escalation Active" : "⚠️ Inactivity Warning"}
                    </p>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {status === "triggered"
                        ? "A batch transfer has started. Press the Panic Button immediately if you are still alive to abort all transfers."
                        : status === "escalation"
                        ? "Your guardians have been notified. Confirm you are alive to prevent transfer execution."
                        : "We have not detected your activity. Please check in now to prevent transfer execution."}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10"
                    onClick={() => checkIn.mutate()}
                    disabled={checkIn.isPending}
                  >
                    {checkIn.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-1.5" />}
                    I'm Alive
                  </Button>
                  <Button
                    size="sm"
                    className="bg-red-600 hover:bg-red-700 text-white border-0"
                    onClick={() => setShowPanicConfirm(true)}
                  >
                    <Siren className="w-4 h-4 mr-1.5" /> Panic Reset
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Hero + normal status */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="text-center sm:text-left">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Secure Your Crypto Legacy</h1>
            <p className="text-muted-foreground mt-1.5 text-sm sm:text-base">
              Ensure your assets are safe for your loved ones in case of inactivity.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-2">
            {/* Status pill */}
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium ${sc.color}`}>
              <span className={`w-2 h-2 rounded-full ${sc.dot} ${status === "active" ? "" : "animate-pulse"}`} />
              <StatusIcon className="w-3.5 h-3.5" />
              {sc.label}
            </div>
            {/* Check-in button */}
            <Button
              onClick={() => checkIn.mutate()}
              disabled={checkIn.isPending}
              className="rounded-full h-9 px-4 bg-primary/90 hover:bg-primary shadow-lg shadow-primary/20"
              size="sm"
            >
              {checkIn.isPending ? (
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4 mr-1.5" />
              )}
              Check In Now
            </Button>
          </div>
        </div>

        {summary?.lastCheckIn && (
          <p className="text-xs text-muted-foreground mt-2 sm:text-right">
            Last check-in: {new Date(summary.lastCheckIn).toLocaleString()}
          </p>
        )}
      </motion.div>

      {/* Panic Confirm Modal */}
      <AnimatePresence>
        {showPanicConfirm && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={() => setShowPanicConfirm(false)}
          >
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
              className="relative z-10 bg-card border border-red-500/40 rounded-2xl shadow-2xl max-w-sm w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-red-500/15 flex items-center justify-center mx-auto mb-4">
                  <Siren className="w-8 h-8 text-red-500" />
                </div>
                <h2 className="text-xl font-bold mb-2">Confirm Panic Reset</h2>
                <p className="text-sm text-muted-foreground mb-6">
                  This will immediately abort all pending transfers, notify your guardians, and reset the inactivity timer.
                  Your legacy system will return to active status.
                </p>
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={() => setShowPanicConfirm(false)}>
                    Cancel
                  </Button>
                  <Button
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white border-0"
                    onClick={() => panicReset.mutate()}
                    disabled={panicReset.isPending}
                  >
                    {panicReset.isPending ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : null}
                    Yes, Reset Now
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Deposit Modal */}
      <AnimatePresence>
        {showDeposit && <DepositModal onClose={() => { setShowDeposit(false); vault.refresh(); }} />}
        {showWithdraw && <WithdrawModal onClose={() => { setShowWithdraw(false); vault.refresh(); }} />}
      </AnimatePresence>

      {/* Onboarding Checklist */}
      <OnboardingChecklist summary={summary} vaultHasBalance={vaultHasBalance} />

      {/* Vault Balance */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="mb-8"
      >
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="sm:col-span-1 bg-card border border-border rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none rounded-2xl" />
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Wallet className="w-4 h-4 text-primary" />
                  </div>
                  <h3 className="font-bold text-sm">Vault Balance</h3>
                </div>
                <button
                  onClick={vault.refresh}
                  disabled={vault.loading || !vault.address}
                  className="p-1.5 rounded-lg hover:bg-muted transition-colors disabled:opacity-40"
                  title="Refresh balance"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-muted-foreground ${vault.loading ? "animate-spin" : ""}`} />
                </button>
              </div>

              {!vault.address ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Connect wallet to view balance
                </p>
              ) : !vault.onArc ? (
                <p className="text-sm text-amber-500 text-center py-4">
                  Switch to Arc Testnet to view
                </p>
              ) : vault.loading && vault.balance === null ? (
                <div className="h-10 bg-muted/50 rounded-xl animate-pulse mb-4" />
              ) : (
                <div className="mb-4">
                  <div className="text-3xl font-bold tracking-tight">
                    {vault.balance ?? "–"}
                    <span className="text-base font-semibold text-muted-foreground ml-1.5">USDC</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Live · Arc Testnet</p>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  onClick={() => setShowDeposit(true)}
                  className="flex-1 rounded-xl"
                  size="sm"
                  disabled={!vault.address || !vault.onArc}
                >
                  <Plus className="w-3.5 h-3.5 mr-1.5" /> Deposit
                </Button>
                <Button
                  onClick={() => setShowWithdraw(true)}
                  variant="outline"
                  className="flex-1 rounded-xl"
                  size="sm"
                  disabled={!vault.address || !vault.onArc || !vaultHasBalance}
                >
                  <ArrowDownToLine className="w-3.5 h-3.5 mr-1.5" /> Withdraw
                </Button>
              </div>
            </div>
          </div>

          <div className="sm:col-span-1 lg:col-span-2 bg-card border border-border rounded-2xl p-6 flex flex-col justify-between">
            <div>
              <h3 className="font-bold text-sm mb-1">Contract</h3>
              <p className="text-xs text-muted-foreground mb-3">ArkiveVault deployed on Arc Testnet</p>
              <a
                href={`https://testnet.arcscan.app/address/0x86c5dFdA52AA8C7912fAf02b6393BD434d817059`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-[11px] text-primary hover:underline break-all"
              >
                0x86c5dFdA52AA8C7912fAf02b6393BD434d817059
              </a>
            </div>
            <div className="mt-4 flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5 text-primary" /> Non-custodial</span>
              <span className="flex items-center gap-1.5"><ShieldHalf className="w-3.5 h-3.5 text-primary" /> USDC only</span>
              <span className="flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 text-primary" /> Instant deposits</span>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="grid md:grid-cols-2 gap-5 mb-10">
        <FeatureCard title="Auto Asset Transfer" desc="Automatically send your crypto to your beneficiaries in verified batches." cta="Set Up Transfer" href="/transfer" illustration={<TransferIllustration />} />
        <FeatureCard title="Recovery Package" desc="Provide an encrypted recovery kit to your family with guardian-approved access." cta="Set Up Recovery" href="/recovery" illustration={<RecoveryIllustration />} />
      </div>

      <h2 className="text-xl font-bold mb-4">Legacy Settings</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {settingsCards.map((s) => (
          <Link key={s.label} href={s.href} className="block">
            <motion.div whileHover={{ y: -2 }}
              className="bg-card border border-border rounded-2xl p-5 h-full hover:border-primary/40 transition-colors">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${s.color} mb-4`}>
                <s.icon className="w-5 h-5" />
              </div>
              <h3 className="font-semibold mb-1">{s.label}</h3>
              <p className="text-xs text-muted-foreground mb-4">{s.desc}</p>
              <Button variant="outline" size="sm" className="w-full rounded-full">
                {s.action} <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </motion.div>
          </Link>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-5 mb-10">
        <div className="bg-card border border-border rounded-2xl p-6">
          <h3 className="font-bold mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" /> Recent Activity
          </h3>
          <div className="space-y-3">
            {allActivity.length === 0 ? (
              <>
                <ActivityRow color="bg-emerald-500" label="Check-In Reminder Sent" time="02:41 PM" />
                <ActivityRow color="bg-emerald-500" label="Guardian Approval Received" time="01:51 PM" />
                <ActivityRow color="bg-amber-500" label="Inactivity Alert Triggered" time="12:51 PM" />
                <ActivityRow color="bg-emerald-500" label="Recovery Package Prepared" time="11:51 AM" />
              </>
            ) : (
              recent.map((a) => (
                <ActivityRow
                  key={a.id}
                  color={a.severity === "critical" ? "bg-destructive" : a.severity === "warning" ? "bg-amber-500" : "bg-emerald-500"}
                  label={a.message}
                  time={new Date(a.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                />
              ))
            )}
          </div>
          {allActivity.length > 4 && (
            <Button
              variant="outline"
              className="w-full mt-5 rounded-full"
              onClick={() => setShowAllActivity((v) => !v)}
            >
              {showAllActivity ? (
                <>Collapse <ArrowRight className="w-3.5 h-3.5 ml-1 rotate-90" /></>
              ) : (
                <>View All ({allActivity.length}) <ArrowRight className="w-3.5 h-3.5 ml-1" /></>
              )}
            </Button>
          )}
        </div>

        <div className="bg-card border border-border rounded-2xl p-6">
          <h3 className="font-bold mb-4 flex items-center gap-2">
            <Lock className="w-4 h-4 text-primary" /> Final Wishes
          </h3>
          <div className="space-y-3">
            {wishes.map((w, i) => (
              <Link key={i} href="/transfer" className="flex items-center gap-3 p-2 -mx-2 rounded-lg hover:bg-muted/60 transition-colors">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${w.color}`}>
                  <w.icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{w.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{w.desc}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
              </Link>
            ))}
          </div>
          <Link href="/transfer">
            <Button variant="outline" className="w-full mt-5 rounded-full">
              Update Details <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </Link>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl p-6 text-center">
        <p className="text-sm text-muted-foreground max-w-2xl mx-auto mb-4">
          Your data is end-to-end encrypted. Only your trusted guardians can unlock recovery instructions.
        </p>
        <div className="flex flex-wrap justify-center gap-x-8 gap-y-3 text-sm">
          <span className="flex items-center gap-2 text-muted-foreground"><ShieldHalf className="w-4 h-4 text-primary" /> MPC Encryption</span>
          <span className="flex items-center gap-2 text-muted-foreground"><RefreshCw className="w-4 h-4 text-primary" /> Multi-Signal Verification</span>
          <span className="flex items-center gap-2 text-muted-foreground"><Clock className="w-4 h-4 text-primary" /> Time Delayed Actions</span>
        </div>
        {summary && (
          <p className="text-xs text-muted-foreground mt-4">
            {Math.max(summary.totalAssets ?? 0, vaultHasBalance ? 1 : 0)} assets · {summary.totalBeneficiaries} beneficiaries · {summary.totalGuardians} guardians
          </p>
        )}
      </div>
    </div>
  );
}

function FeatureCard({ title, desc, cta, href, illustration }: { title: string; desc: string; cta: string; href: string; illustration: React.ReactNode }) {
  return (
    <motion.div whileHover={{ y: -3 }} className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="p-8 pb-4 text-center">
        <h3 className="text-2xl font-bold mb-6">{title}</h3>
        <div className="flex justify-center mb-4">{illustration}</div>
      </div>
      <div className="px-6 pb-6">
        <p className="text-center text-sm text-muted-foreground mb-4">{desc}</p>
        <Link href={href}>
          <Button className="w-full rounded-full h-11 text-sm font-semibold">{cta}</Button>
        </Link>
      </div>
    </motion.div>
  );
}

function TransferIllustration() {
  return (
    <svg width="140" height="100" viewBox="0 0 140 100" fill="none">
      <circle cx="30" cy="60" r="14" fill="#fbbf24" />
      <circle cx="30" cy="50" r="14" fill="#f59e0b" />
      <path d="M50 55 L75 55" stroke="#3B0060" strokeWidth="3" strokeLinecap="round" />
      <path d="M70 49 L80 55 L70 61 Z" fill="#3B0060" />
      <rect x="85" y="30" width="50" height="50" rx="8" fill="#3B0060" />
      <circle cx="110" cy="55" r="12" fill="#1a002e" />
      <circle cx="110" cy="55" r="5" fill="#3B0060" />
    </svg>
  );
}

function RecoveryIllustration() {
  return (
    <svg width="140" height="100" viewBox="0 0 140 100" fill="none">
      <rect x="35" y="20" width="55" height="65" rx="6" fill="#3B0060" />
      <rect x="45" y="32" width="35" height="3" rx="1.5" fill="#B06ADD" opacity="0.7" />
      <rect x="45" y="40" width="30" height="3" rx="1.5" fill="#B06ADD" opacity="0.5" />
      <rect x="45" y="48" width="35" height="3" rx="1.5" fill="#B06ADD" opacity="0.7" />
      <rect x="80" y="55" width="30" height="30" rx="5" fill="#1a002e" />
      <rect x="90" y="63" width="10" height="8" rx="1" fill="#3B0060" />
      <path d="M92 63 V 60 a 3 3 0 0 1 6 0 V 63" stroke="#3B0060" strokeWidth="1.5" fill="none" />
    </svg>
  );
}

function ActivityRow({ color, label, time }: { color: string; label: string; time: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <div className="flex items-center gap-3 min-w-0">
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${color}`} />
        <span className="truncate">{label}</span>
      </div>
      <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">{time}</span>
    </div>
  );
}

function OnboardingChecklist({ summary, vaultHasBalance }: { summary: ReturnType<typeof useGetDashboardSummary>["data"]; vaultHasBalance: boolean }) {
  const hasAssets = (summary?.totalAssets ?? 0) > 0 || vaultHasBalance;
  const hasGuardians = (summary?.totalGuardians ?? 0) > 0;
  const hasBeneficiaries = (summary?.totalBeneficiaries ?? 0) > 0;
  const hasCheckedIn = !!summary?.lastCheckIn;

  const steps = [
    {
      icon: Wallet,
      label: "Add your first asset",
      desc: "Connect a wallet or add assets to protect.",
      done: hasAssets,
      href: "/transfer",
      cta: "Add Asset",
      color: "text-orange-400 bg-orange-400/10",
    },
    {
      icon: UserPlus,
      label: "Add guardians",
      desc: "Choose trusted people to authorize recovery.",
      done: hasGuardians,
      href: "/guardians",
      cta: "Add Guardians",
      color: "text-emerald-400 bg-emerald-400/10",
    },
    {
      icon: Users,
      label: "Add a beneficiary",
      desc: "Set who receives your assets when the protocol triggers.",
      done: hasBeneficiaries,
      href: "/transfer",
      cta: "Add Beneficiary",
      color: "text-sky-400 bg-sky-400/10",
    },
    {
      icon: Shield,
      label: "Set guardian threshold",
      desc: "Choose 2-of-3 or 3-of-5 quorum for recovery approval.",
      done: hasGuardians,
      href: "/security",
      cta: "Configure",
      color: "text-violet-400 bg-violet-400/10",
    },
    {
      icon: Zap,
      label: "Complete your first check-in",
      desc: "Confirm you're active to start the inactivity timer.",
      done: hasCheckedIn,
      href: undefined,
      cta: "Check In",
      color: "text-primary bg-primary/10",
    },
  ];

  const completed = steps.filter((s) => s.done).length;
  const allDone = completed === steps.length;
  const pct = Math.round((completed / steps.length) * 100);

  if (allDone) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-8 bg-card border border-border rounded-2xl overflow-hidden"
    >
      {/* Header */}
      <div className="px-6 pt-5 pb-4 border-b border-border">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div>
            <h2 className="text-lg font-bold">Get started with Arkive</h2>
            <p className="text-sm text-muted-foreground">Complete these steps to protect your crypto legacy.</p>
          </div>
          <span className="text-sm font-semibold text-primary">{completed}/{steps.length} done</span>
        </div>
        {/* Progress bar */}
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="h-full bg-primary rounded-full"
          />
        </div>
      </div>

      {/* Steps */}
      <div className="divide-y divide-border">
        {steps.map((step) => (
          <div key={step.label} className={`flex items-center gap-4 px-6 py-4 transition-colors ${step.done ? "opacity-50" : "hover:bg-muted/40"}`}>
            {/* Icon */}
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${step.done ? "bg-emerald-500/10" : step.color}`}>
              {step.done
                ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                : <step.icon className={`w-4 h-4 ${step.color.split(" ")[0]}`} />
              }
            </div>
            {/* Text */}
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-semibold ${step.done ? "line-through text-muted-foreground" : "text-foreground"}`}>{step.label}</p>
              <p className="text-xs text-muted-foreground">{step.desc}</p>
            </div>
            {/* CTA */}
            {!step.done && (
              step.href ? (
                <Link href={step.href}>
                  <Button size="sm" variant="outline" className="rounded-full flex-shrink-0 text-xs h-8 px-3">
                    {step.cta} <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                </Link>
              ) : (
                <Button size="sm" variant="outline" className="rounded-full flex-shrink-0 text-xs h-8 px-3" disabled>
                  {step.cta}
                </Button>
              )
            )}
            {step.done && (
              <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
            )}
          </div>
        ))}
      </div>
    </motion.div>
  );
}
