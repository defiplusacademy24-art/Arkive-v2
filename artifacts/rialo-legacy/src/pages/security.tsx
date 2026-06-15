import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Settings, Save, Activity, Clock, CheckCircle2, AlertTriangle,
  User, Mail, AtSign, MessageSquare, Hash, Bell, Smartphone, Shield,
  Wallet, Link2, Unlink, Loader2, Server, ExternalLink, X,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetInactivitySettings, useUpdateInactivitySettings, getGetInactivitySettingsQueryKey,
  useGetProfile, useUpdateProfile, useUpdateEmail, getProfileQueryKey,
} from "@/lib/api";
import { useAuth } from "@/components/auth-provider";
import { useNotificationPrefs } from "@/hooks/use-notification-prefs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getApiBase, API_BASE_STORAGE_KEY } from "@/components/auth-wallet-modal";

export function SecurityPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { data, isLoading } = useGetInactivitySettings();
  const { data: profile } = useGetProfile();
  const { prefs, savePrefs } = useNotificationPrefs();

  const update = useUpdateInactivitySettings({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetInactivitySettingsQueryKey() });
        toast.success("Settings saved");
      },
      onError: () => toast.error("Failed to save settings"),
    },
  });

  const updateProfile = useUpdateProfile({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getProfileQueryKey() });
        toast.success("Profile updated");
      },
      onError: () => toast.error("Failed to update profile"),
    },
  });

  const updateEmail = useUpdateEmail({
    mutation: {
      onSuccess: () => toast.success("Confirmation email sent — check your inbox"),
      onError: (e: any) => toast.error(e?.message ?? "Failed to update email"),
    },
  });

  const [profileForm, setProfileForm] = useState({ username: "" });
  const [emailForm, setEmailForm] = useState("");
  const [notifForm, setNotifForm] = useState({ whatsapp: "", telegram: "", discord: "" });
  const [notifSaved, setNotifSaved] = useState(false);

  useEffect(() => {
    if (profile) setProfileForm({ username: profile.username ?? "" });
  }, [profile]);

  useEffect(() => {
    if (user?.email) setEmailForm(user.email);
  }, [user?.email]);

  useEffect(() => {
    setNotifForm({ whatsapp: prefs.whatsapp, telegram: prefs.telegram, discord: prefs.discord });
  }, [prefs.whatsapp, prefs.telegram, prefs.discord]);

  const [form, setForm] = useState({
    inactivityDays: 90, checkIntervalDays: 30, timeDelayDays: 7,
    autoCheckInEnabled: false, multiSignalEnabled: true,
    timeDelayEnabled: true, finalWarningEnabled: true, requiredApprovals: 2,
  });

  useEffect(() => {
    if (data) {
      setForm({
        inactivityDays: data.inactivityDays,
        checkIntervalDays: data.checkIntervalDays,
        timeDelayDays: data.timeDelayDays,
        autoCheckInEnabled: data.autoCheckInEnabled,
        multiSignalEnabled: data.multiSignalEnabled,
        timeDelayEnabled: data.timeDelayEnabled,
        finalWarningEnabled: data.finalWarningEnabled,
        requiredApprovals: data.requiredApprovals,
      });
    }
  }, [data]);

  function saveNotifChannels(e: React.FormEvent) {
    e.preventDefault();
    savePrefs(notifForm);
    setNotifSaved(true);
    toast.success("Notification channels saved");
    setTimeout(() => setNotifSaved(false), 2000);
  }

  function handleThresholdChange(required: number) {
    const next = { ...form, requiredApprovals: required };
    setForm(next);
    update.mutate({ data: next });
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Settings className="w-5 h-5 text-primary" />
          </div>
          <h1 className="text-3xl font-bold">Security Options</h1>
        </div>
        <p className="text-muted-foreground">Tune your dead-man switch, notification channels, and guardian approvals.</p>
      </motion.div>

      {data && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <StatusCard
            icon={data.currentStatus === "active" ? CheckCircle2 : AlertTriangle}
            label="Switch Status"
            value={data.currentStatus === "active" ? "Active" : data.currentStatus}
            color={data.currentStatus === "active" ? "text-emerald-500 bg-emerald-500/10" : "text-amber-500 bg-amber-500/10"}
          />
          <StatusCard
            icon={Clock}
            label="Last Check-In"
            value={data.lastCheckIn ? new Date(data.lastCheckIn).toLocaleDateString() : "Never"}
            color="text-primary bg-primary/10"
          />
          <StatusCard
            icon={Activity}
            label="Inactivity Window"
            value={`${data.inactivityDays} days`}
            color="text-amber-500 bg-amber-500/10"
          />
        </div>
      )}

      {/* Account Profile */}
      <div className="bg-card border border-border rounded-2xl p-6 mb-5">
        <div className="flex items-center gap-2 mb-1">
          <User className="w-4 h-4 text-primary" />
          <h3 className="font-bold">Account Profile</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-5">
          Your username is displayed on your profile in place of your email address.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            updateProfile.mutate({ data: profileForm });
          }}
          className="space-y-4"
        >
          <div className="space-y-2 max-w-sm">
            <Label>Username</Label>
            <div className="relative">
              <AtSign className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="johndoe"
                pattern="[a-zA-Z0-9_]{3,30}"
                title="3 to 30 characters: letters, numbers, and underscores only"
                value={profileForm.username}
                onChange={(e) => setProfileForm({ username: e.target.value })}
              />
            </div>
            <p className="text-xs text-muted-foreground">3-30 characters. Letters, numbers, and underscores only.</p>
          </div>
          <div className="flex justify-start">
            <Button type="submit" size="sm" disabled={updateProfile.isPending} className="rounded-full">
              <Save className="w-4 h-4 mr-1.5" /> Save Username
            </Button>
          </div>
        </form>

        <div className="mt-6 pt-6 border-t border-border">
          <div className="flex items-center gap-2 mb-1">
            <Mail className="w-4 h-4 text-primary" />
            <h4 className="font-semibold">Email Address</h4>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Used for sign-in and recovery notifications. A confirmation email will be sent before any change takes effect.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (emailForm && emailForm !== user?.email) updateEmail.mutate({ email: emailForm });
            }}
            className="flex flex-col sm:flex-row gap-2 max-w-md"
          >
            <Input
              type="email"
              required
              value={emailForm}
              onChange={(e) => setEmailForm(e.target.value)}
              placeholder="you@example.com"
              className="flex-1"
            />
            <Button
              type="submit"
              size="sm"
              disabled={updateEmail.isPending || !emailForm || emailForm === user?.email}
              className="rounded-full"
            >
              Update Email
            </Button>
          </form>
        </div>
      </div>

      {/* Linked Wallet */}
      <LinkedWalletSection user={user} />

      {/* API Server */}
      <ApiServerSection />

      {/* Notification Channels */}
      <div className="bg-card border border-border rounded-2xl p-6 mb-5">
        <div className="flex items-center gap-2 mb-1">
          <Bell className="w-4 h-4 text-primary" />
          <h3 className="font-bold">Notification Channels</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-5">
          Warnings are sent across all configured channels before any transfer. Add all channels you use.
        </p>
        <form onSubmit={saveNotifChannels} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Smartphone className="w-3.5 h-3.5 text-emerald-500" /> WhatsApp Number
              </Label>
              <Input
                type="tel"
                placeholder="+1 555 000 0000"
                value={notifForm.whatsapp}
                onChange={(e) => setNotifForm({ ...notifForm, whatsapp: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">Include country code.</p>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <MessageSquare className="w-3.5 h-3.5 text-sky-500" /> Telegram Username
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm select-none">@</span>
                <Input
                  className="pl-7"
                  placeholder="your_telegram_handle"
                  value={notifForm.telegram.replace(/^@/, "")}
                  onChange={(e) => setNotifForm({ ...notifForm, telegram: e.target.value.replace(/^@/, "") })}
                />
              </div>
            </div>
            <div className="space-y-2 sm:col-span-2 sm:max-w-xs">
              <Label className="flex items-center gap-2">
                <Hash className="w-3.5 h-3.5 text-indigo-500" /> Discord Username
              </Label>
              <Input
                placeholder="username or username#0000"
                value={notifForm.discord}
                onChange={(e) => setNotifForm({ ...notifForm, discord: e.target.value })}
              />
            </div>
          </div>

          <div className="rounded-xl bg-primary/5 border border-primary/20 p-3 text-xs text-muted-foreground">
            <p className="font-medium text-foreground mb-1">How warnings work</p>
            <p>If your wallet, email, WhatsApp, Telegram, and Discord are all inactive beyond your set period, the system enters Warning mode, then Escalation (guardians notified), then Batch Transfer with a panic window at every stage.</p>
          </div>

          <div className="flex justify-start">
            <Button type="submit" size="sm" className="rounded-full" disabled={notifSaved}>
              {notifSaved
                ? <CheckCircle2 className="w-4 h-4 mr-1.5 text-emerald-400" />
                : <Save className="w-4 h-4 mr-1.5" />
              }
              {notifSaved ? "Saved!" : "Save Channels"}
            </Button>
          </div>
        </form>
      </div>

      {/* Dead-man switch settings */}
      {isLoading ? (
        <div className="text-center text-muted-foreground py-12">Loading settings...</div>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); update.mutate({ data: form }); }} className="space-y-5">
          <SettingsCard title="Inactivity Window">
            <p className="text-sm text-muted-foreground -mt-2 mb-2">Define how long the system waits before escalating.</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <SettingsField label="Inactivity Period (days)">
                <Input
                  type="number"
                  min={1}
                  max={365}
                  value={form.inactivityDays}
                  onChange={(e) => setForm({ ...form, inactivityDays: Number(e.target.value) })}
                />
              </SettingsField>
              <SettingsField label="Check Interval (days)">
                <Input
                  type="number"
                  min={1}
                  max={90}
                  value={form.checkIntervalDays}
                  onChange={(e) => setForm({ ...form, checkIntervalDays: Number(e.target.value) })}
                />
              </SettingsField>
              <SettingsField label="Time Delay (days)">
                <Input
                  type="number"
                  min={0}
                  max={30}
                  value={form.timeDelayDays}
                  onChange={(e) => setForm({ ...form, timeDelayDays: Number(e.target.value) })}
                />
              </SettingsField>
            </div>
          </SettingsCard>

          <SettingsCard title="Verification Controls">
            <Toggle
              label="Auto Check-In"
              desc="Automatically detect activity from connected wallets and reset the timer."
              checked={form.autoCheckInEnabled}
              onChange={(v) => setForm({ ...form, autoCheckInEnabled: v })}
            />
            <Toggle
              label="Multi-Signal Verification"
              desc="Require wallet, email, WhatsApp, Telegram, and Discord to all be inactive before triggering."
              checked={form.multiSignalEnabled}
              onChange={(v) => setForm({ ...form, multiSignalEnabled: v })}
            />
            <Toggle
              label="Time-Delay Actions"
              desc="Wait the configured time-delay window before executing any transfers."
              checked={form.timeDelayEnabled}
              onChange={(v) => setForm({ ...form, timeDelayEnabled: v })}
            />
            <Toggle
              label="Final Warning"
              desc="Send a last-chance warning across all channels before executing batch transfers."
              checked={form.finalWarningEnabled}
              onChange={(v) => setForm({ ...form, finalWarningEnabled: v })}
            />
          </SettingsCard>

          <SettingsCard title="Guardian Threshold">
            <p className="text-sm text-muted-foreground -mt-2 mb-4">
              Choose how many guardians must approve before recovery or execution begins. This setting reflects in your Guardians and Recovery tabs.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {([
                { required: 2, total: 3, label: "2 of 3", desc: "Simpler quorum. Ideal for close-knit trust circles.", recommended: true },
                { required: 3, total: 5, label: "3 of 5", desc: "Stronger quorum. Better resilience against key loss.", recommended: false },
              ] as const).map((opt) => {
                const isSelected = form.requiredApprovals === opt.required;
                return (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() => handleThresholdChange(opt.required)}
                    className={`relative rounded-2xl border p-5 text-left transition-all focus:outline-none ${
                      isSelected
                        ? "border-primary bg-primary/10 ring-2 ring-primary/30"
                        : "border-border bg-card hover:border-primary/40 hover:bg-primary/5"
                    }`}
                  >
                    {opt.recommended && (
                      <span className="absolute top-3 right-3 text-[9px] font-bold uppercase tracking-wide bg-primary/15 text-primary px-2 py-0.5 rounded-full">
                        Common
                      </span>
                    )}
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${isSelected ? "bg-primary/20" : "bg-muted"}`}>
                        <Shield className={`w-4 h-4 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                      </div>
                      <span className={`text-xl font-extrabold tracking-tight ${isSelected ? "text-primary" : "text-foreground"}`}>
                        {opt.label}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{opt.desc}</p>
                    <div className="mt-3 flex gap-1.5">
                      {Array.from({ length: opt.total }).map((_, i) => (
                        <div
                          key={i}
                          className={`h-1.5 flex-1 rounded-full transition-colors ${
                            i < opt.required
                              ? isSelected ? "bg-primary" : "bg-muted-foreground/40"
                              : "bg-muted"
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1.5 font-mono">
                      {opt.required} required · {opt.total} total guardians
                    </p>
                  </button>
                );
              })}
            </div>
            {update.isPending && (
              <p className="text-xs text-muted-foreground mt-2 animate-pulse">Saving threshold...</p>
            )}
            {!update.isPending && form.requiredApprovals && (
              <p className="text-xs text-emerald-500 mt-2 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Threshold reflected in Guardians and Recovery tabs
              </p>
            )}
          </SettingsCard>

          <div className="flex justify-end">
            <Button type="submit" disabled={update.isPending} className="rounded-full">
              <Save className="w-4 h-4 mr-1.5" /> Save Settings
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

type Eip1193Provider = { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> };

function LinkedWalletSection({ user }: { user: import("@supabase/supabase-js").User | null }) {
  const linkedAddress = (user?.user_metadata?.["wallet_address"] as string | undefined) ?? null;
  const isWalletUser = user?.email?.endsWith("@wallet.arkive.app") ?? false;

  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<"idle" | "connecting" | "signing">("idle");

  const handleLink = useCallback(async () => {
    const provider = (window as any).ethereum as Eip1193Provider | undefined;
    if (!provider) {
      toast.error("No wallet detected — install MetaMask or OKX Wallet first");
      return;
    }
    setBusy(true);
    setStep("connecting");
    try {
      const accounts = (await provider.request({ method: "eth_requestAccounts" })) as string[];
      if (!accounts?.length) throw new Error("No accounts returned");
      const address = accounts[0].toLowerCase();

      setStep("signing");
      const message = `Link wallet to Arkive\nAddress: ${address}\nUser: ${user?.id ?? "unknown"}`;
      await provider.request({ method: "personal_sign", params: [message, address] });

      const { error } = await supabase.auth.updateUser({
        data: { wallet_address: address },
      });
      if (error) throw error;

      toast.success("Wallet linked successfully");
    } catch (err: any) {
      const msg = err?.code === 4001
        ? "Request rejected — please approve in your wallet"
        : err?.message ?? "Failed to link wallet";
      toast.error(msg);
    } finally {
      setBusy(false);
      setStep("idle");
    }
  }, [user?.id]);

  const handleUnlink = useCallback(async () => {
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { wallet_address: null },
      });
      if (error) throw error;
      toast.success("Wallet unlinked");
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to unlink wallet");
    } finally {
      setBusy(false);
    }
  }, []);

  if (isWalletUser) return null;

  return (
    <div className="bg-card border border-border rounded-2xl p-6 mb-5">
      <div className="flex items-center gap-2 mb-1">
        <Wallet className="w-4 h-4 text-primary" />
        <h3 className="font-bold">Linked Wallet</h3>
      </div>
      <p className="text-sm text-muted-foreground mb-5">
        Link an EVM wallet to interact with the Arc Testnet vault — deposit, withdraw, and enable wallet-based login.
      </p>

      {linkedAddress ? (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-2.5 flex-1 min-w-0 bg-muted/50 border border-border rounded-xl px-4 py-3">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Linked Address</p>
              <p className="text-sm font-mono font-semibold truncate">
                {linkedAddress.slice(0, 10)}…{linkedAddress.slice(-8)}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={handleUnlink}
            className="rounded-full text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive shrink-0"
          >
            {busy ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Unlink className="w-3.5 h-3.5 mr-1.5" />}
            Unlink
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={handleLink}
            className="rounded-full shrink-0"
          >
            {busy
              ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />{step === "signing" ? "Sign in wallet…" : "Connecting…"}</>
              : <><Link2 className="w-3.5 h-3.5 mr-1.5" />Change Wallet</>
            }
          </Button>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0 rounded-xl border border-dashed border-border px-4 py-3 text-muted-foreground text-sm">
            <Wallet className="w-5 h-5 flex-shrink-0 opacity-40" />
            <span>No wallet linked yet</span>
          </div>
          <Button
            size="sm"
            disabled={busy}
            onClick={handleLink}
            className="rounded-full shrink-0"
          >
            {busy
              ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />{step === "signing" ? "Sign in wallet…" : "Connecting…"}</>
              : <><Link2 className="w-3.5 h-3.5 mr-1.5" />Link Wallet</>
            }
          </Button>
        </div>
      )}

      <p className="text-[11px] text-muted-foreground mt-3">
        You'll be asked to sign a message — no transaction or gas required.
      </p>
    </div>
  );
}

function ApiServerSection() {
  const buildTimeUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "";
  const [stored, setStored] = useState(() => {
    try { return localStorage.getItem(API_BASE_STORAGE_KEY) ?? ""; } catch { return ""; }
  });
  const [input, setInput] = useState(stored);
  const [saved, setSaved] = useState(false);

  const effectiveUrl = stored || buildTimeUrl || window.location.origin;
  const source = stored ? "saved" : buildTimeUrl ? "env" : "default";

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    try {
      if (trimmed) {
        localStorage.setItem(API_BASE_STORAGE_KEY, trimmed);
      } else {
        localStorage.removeItem(API_BASE_STORAGE_KEY);
      }
    } catch {}
    setStored(trimmed);
    setSaved(true);
    toast.success(trimmed ? "API server URL saved" : "API URL cleared — using default");
    setTimeout(() => setSaved(false), 2000);
  }

  function handleClear() {
    try { localStorage.removeItem(API_BASE_STORAGE_KEY); } catch {}
    setStored("");
    setInput("");
    toast.success("Cleared — using default API URL");
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-6 mb-5">
      <div className="flex items-center gap-2 mb-1">
        <Server className="w-4 h-4 text-primary" />
        <h3 className="font-bold">API Server</h3>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Set the base URL of your Arkive API server. Required for wallet signup without email confirmation on external deployments like Vercel.
      </p>

      <div className="rounded-xl bg-muted/50 border border-border px-4 py-3 mb-4 space-y-1.5">
        <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground">Currently Using</p>
        <p className="text-sm font-mono break-all text-foreground">{effectiveUrl}</p>
        <div className="flex items-center gap-1.5">
          {source === "saved" && (
            <span className="text-[10px] font-semibold bg-primary/15 text-primary px-2 py-0.5 rounded-full">Saved override</span>
          )}
          {source === "env" && (
            <span className="text-[10px] font-semibold bg-emerald-500/15 text-emerald-500 px-2 py-0.5 rounded-full">Build-time env var</span>
          )}
          {source === "default" && (
            <span className="text-[10px] font-semibold bg-muted text-muted-foreground px-2 py-0.5 rounded-full">Same origin (default)</span>
          )}
        </div>
      </div>

      <div className="rounded-xl bg-amber-500/8 border border-amber-500/25 px-4 py-3 mb-4">
        <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 mb-1">Do you need to set this?</p>
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">No</span> — wallet login and signup now work client-side as a fallback.
          You only need this if you want <span className="font-medium text-foreground">new wallet accounts to skip email confirmation</span>.
          In that case, deploy the Arkive API server separately and paste its URL below.
        </p>
      </div>

      <form onSubmit={handleSave} className="flex flex-col sm:flex-row gap-2">
        <div className="flex-1 relative">
          <Server className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9 font-mono text-sm"
            placeholder="https://your-api.example.com"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            type="url"
          />
        </div>
        <div className="flex gap-2">
          <Button type="submit" size="sm" className="rounded-full" disabled={saved}>
            {saved ? <CheckCircle2 className="w-4 h-4 mr-1.5 text-emerald-400" /> : <Save className="w-4 h-4 mr-1.5" />}
            {saved ? "Saved!" : "Save URL"}
          </Button>
          {stored && (
            <Button type="button" size="sm" variant="outline" className="rounded-full" onClick={handleClear}>
              <X className="w-3.5 h-3.5 mr-1.5" /> Clear
            </Button>
          )}
        </div>
      </form>

      <p className="text-[11px] text-muted-foreground mt-3">
        This is saved in your browser only and takes priority over the <code className="bg-muted px-1 py-0.5 rounded text-[10px]">VITE_API_BASE_URL</code> build-time variable.{" "}
        <a href="https://vercel.com/docs/environment-variables" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-0.5">
          Vercel env vars <ExternalLink className="w-2.5 h-2.5" />
        </a>
      </p>
    </div>
  );
}

function SettingsCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-6">
      <h3 className="font-bold mb-4">{title}</h3>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function SettingsField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function Toggle({ label, desc, checked, onChange }: { label: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-border/50 last:border-0">
      <div className="min-w-0">
        <p className="font-medium text-sm">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} className="flex-shrink-0 mt-0.5" />
    </div>
  );
}

function StatusCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className="text-lg font-bold truncate capitalize">{value}</p>
      </div>
    </div>
  );
}
