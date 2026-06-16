import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Loader2, ExternalLink, AlertCircle, CheckCircle2,
  Wallet, Shield, Zap, ArrowRight, Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import metamaskLogo from "@/assets/wallet-metamask.png";
import okxLogo from "@/assets/wallet-okx.png";
import phantomLogo from "@/assets/wallet-phantom.png";
import trustLogo from "@/assets/wallet-trust.jpg";

type Eip1193Provider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
};

type Eip6963ProviderInfo = { uuid: string; name: string; icon: string; rdns: string };
type Eip6963ProviderDetail = { info: Eip6963ProviderInfo; provider: Eip1193Provider };

type CatalogEntry = {
  rdns: string; name: string; icon: string; installUrl: string;
  matches?: (p: any) => boolean;
};

const CATALOG: CatalogEntry[] = [
  { rdns: "io.metamask", name: "MetaMask", icon: metamaskLogo, installUrl: "https://metamask.io/download/", matches: (p) => !!p?.isMetaMask && !p?.isRabby },
  { rdns: "com.okex.wallet", name: "OKX Wallet", icon: okxLogo, installUrl: "https://www.okx.com/web3", matches: (p) => !!p?.isOkxWallet || !!(window as any).okxwallet },
  { rdns: "io.rabby", name: "Rabby Wallet", icon: "https://rabby.io/assets/images/logo-128.png", installUrl: "https://rabby.io/", matches: (p) => !!p?.isRabby },
  { rdns: "app.phantom", name: "Phantom", icon: phantomLogo, installUrl: "https://phantom.app/download", matches: (p) => !!p?.isPhantom },
  { rdns: "com.trustwallet.app", name: "Trust Wallet", icon: trustLogo, installUrl: "https://trustwallet.com/download", matches: (p) => !!p?.isTrust || !!p?.isTrustWallet },
  { rdns: "com.coinbase.wallet", name: "Coinbase Wallet", icon: "https://avatars.githubusercontent.com/u/18060234?s=200&v=4", installUrl: "https://www.coinbase.com/wallet/downloads", matches: (p) => !!p?.isCoinbaseWallet },
];

type DiscoveredWallet = { id: string; name: string; icon: string; provider?: Eip1193Provider; installUrl?: string };
type Step = "select" | "connecting" | "signing" | "email" | "success";

function walletCredentials(normalAddress: string) {
  const hex = normalAddress.slice(2);
  const email = `wk${hex}@arkive.app`;
  const password = `wk_${hex}`;
  return { email, password };
}

export const API_BASE_STORAGE_KEY = "rl:api_base_url";

export function getApiBase(): string {
  try {
    const stored = localStorage.getItem(API_BASE_STORAGE_KEY);
    if (stored) return stored.replace(/\/$/, "");
  } catch {}
  const explicit = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "";
  if (explicit) return explicit.replace(/\/$/, "");
  return (import.meta.env.BASE_URL ?? "").replace(/\/$/, "");
}

async function apiFetch(path: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const res = await fetch(`${getApiBase()}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    throw new Error(
      "Cannot reach the Arkive API server. If you're on an external deployment, set VITE_API_BASE_URL to your API server URL.",
    );
  }
  const data = (await res.json()) as Record<string, unknown>;
  if (!res.ok) throw new Error((data["error"] as string | undefined) ?? `Request failed (${res.status})`);
  return data;
}

async function apiFetchOrNull(path: string, body: Record<string, unknown>): Promise<Record<string, unknown> | null> {
  const res = await fetch(`${getApiBase()}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (res.status === 404) return null;
  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return null;
  const data = (await res.json()) as Record<string, unknown>;
  if (!res.ok) throw new Error((data["error"] as string | undefined) ?? `Request failed (${res.status})`);
  return data;
}

function WalletIcon({ icon, name }: { icon: string; name: string }) {
  const [err, setErr] = useState(false);
  if (err || !icon) return <span className="text-sm font-bold text-muted-foreground">{name.slice(0, 2).toUpperCase()}</span>;
  return <img src={icon} alt={name} className="w-8 h-8 object-contain" onError={() => setErr(true)} />;
}

type Props = { onClose: () => void; onSuccess: (address: string) => void };

export function AuthWalletModal({ onClose, onSuccess }: Props) {
  const [wallets, setWallets] = useState<DiscoveredWallet[]>([]);
  const [step, setStep] = useState<Step>("select");
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connectedAddress, setConnectedAddress] = useState<string | null>(null);
  const [activeWallet, setActiveWallet] = useState<DiscoveredWallet | null>(null);

  const [pendingAddress, setPendingAddress] = useState<string | null>(null);
  const [emailInput, setEmailInput] = useState("");
  const [busySignup, setBusySignup] = useState(false);

  useEffect(() => {
    const found = new Map<string, DiscoveredWallet>();
    function flush() {
      const detected = Array.from(found.values());
      const detectedRdns = new Set(detected.map((d) => d.id));
      const eth = (window as any).ethereum as Eip1193Provider | undefined;
      const fallback: DiscoveredWallet[] = CATALOG.filter((c) => !detectedRdns.has(c.rdns)).map((c) => {
        const installed = eth && c.matches?.(eth as any);
        return { id: c.rdns, name: c.name, icon: c.icon, provider: installed ? eth : undefined, installUrl: c.installUrl };
      });
      setWallets([...detected, ...fallback]);
    }
    function onAnnounce(e: Event) {
      const d = (e as CustomEvent<Eip6963ProviderDetail>).detail;
      if (!d?.info) return;
      const cat = CATALOG.find((c) => c.rdns === d.info.rdns);
      found.set(d.info.rdns, { id: d.info.rdns, name: d.info.name, icon: cat?.icon ?? d.info.icon, provider: d.provider });
      flush();
    }
    window.addEventListener("eip6963:announceProvider", onAnnounce as EventListener);
    window.dispatchEvent(new Event("eip6963:requestProvider"));
    flush();
    return () => window.removeEventListener("eip6963:announceProvider", onAnnounce as EventListener);
  }, []);

  const handleConnect = useCallback(async (w: DiscoveredWallet) => {
    if (!w.provider) { window.open(w.installUrl, "_blank", "noopener,noreferrer"); return; }
    setError(null);
    setConnectingId(w.id);
    setActiveWallet(w);
    setStep("connecting");

    try {
      const accounts = (await w.provider.request({ method: "eth_requestAccounts" })) as string[];
      if (!accounts?.length) throw new Error("No accounts returned");
      const normalAddress = accounts[0].toLowerCase();

      setStep("signing");
      const message = `Sign in to Arkive\nAddress: ${normalAddress}\nNonce: ${normalAddress.slice(2, 10)}`;
      await w.provider.request({ method: "personal_sign", params: [message, normalAddress] });

      const { email, password } = walletCredentials(normalAddress);

      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });

      if (signInData.session) {
        setConnectedAddress(normalAddress);
        setStep("success");
        try { localStorage.setItem("rl:wallet", JSON.stringify({ id: w.id, address: normalAddress })); } catch {}
        setTimeout(() => { onSuccess(normalAddress); }, 1400);
        return;
      }

      const isNotFound =
        signInError?.message?.toLowerCase().includes("invalid login credentials") ||
        signInError?.message?.toLowerCase().includes("invalid credentials") ||
        signInError?.status === 400;

      if (isNotFound) {
        // Check if an email/Google account has this wallet linked before prompting signup
        const linked = await apiFetchOrNull("/api/auth/wallet/linked-signin", { address: normalAddress });
        if (linked) {
          const tokenHash = linked["token_hash"] as string;
          const { error: otpError } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "magiclink" });
          if (!otpError) {
            setConnectedAddress(normalAddress);
            setStep("success");
            try { localStorage.setItem("rl:wallet", JSON.stringify({ id: w.id, address: normalAddress })); } catch {}
            setTimeout(() => { onSuccess(normalAddress); }, 1400);
            return;
          }
        }
        // No linked account found — prompt to create a new one
        setPendingAddress(normalAddress);
        setConnectedAddress(normalAddress);
        setStep("email");
      } else {
        throw signInError ?? new Error("Authentication failed");
      }
    } catch (err: any) {
      const msg = err?.code === 4001
        ? "Request rejected — please approve in your wallet"
        : err?.message ?? "Authentication failed";
      setError(msg);
      setStep("select");
      toast.error(msg);
    } finally {
      setConnectingId(null);
    }
  }, [onSuccess]);

  const handleEmailSignup = useCallback(async (email?: string) => {
    if (!pendingAddress) return;
    setError(null);
    setBusySignup(true);
    try {
      const { email: walletEmail, password } = walletCredentials(pendingAddress);

      // Try API server first (bypasses email confirmation, sets metadata cleanly).
      // Fall back to client-side signUp when API is unreachable (e.g. Vercel deployment).
      try {
        await apiFetch("/api/auth/wallet/signup", {
          address: pendingAddress,
          ...(email ? { email } : {}),
        });
      } catch (apiErr: any) {
        if (!apiErr?.message?.includes("Cannot reach the Arkive API")) throw apiErr;
        // API unreachable — create the account directly via Supabase client
        const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
          email: walletEmail,
          password,
          options: {
            data: {
              wallet_address: pendingAddress,
              display_name: `${pendingAddress.slice(0, 6)}…${pendingAddress.slice(-4)}`,
              ...(email ? { contact_email: email } : {}),
            },
          },
        });
        const errMsg = signUpErr?.message?.toLowerCase() ?? "";
        const isAlready = errMsg.includes("already");
        const isRateLimit = errMsg.includes("rate") || errMsg.includes("email_send") || errMsg.includes("over_");
        if (signUpErr && !isAlready && !isRateLimit) throw signUpErr;
        // If Supabase returned a session immediately (email confirm disabled), use it
        if (signUpData?.session) {
          setStep("success");
          try {
            if (activeWallet) localStorage.setItem("rl:wallet", JSON.stringify({ id: activeWallet.id, address: pendingAddress }));
          } catch {}
          setTimeout(() => { if (pendingAddress) onSuccess(pendingAddress); }, 1400);
          return;
        }
        // Rate-limited or already-registered: fall through and attempt signIn anyway
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: walletEmail,
        password,
      });
      if (signInError) {
        const signinMsg = signInError.message.toLowerCase();
        if (signinMsg.includes("email not confirmed")) {
          throw new Error("Almost there — check your email and click the confirmation link, then try connecting your wallet again.");
        }
        if (signinMsg.includes("invalid") || signinMsg.includes("credentials")) {
          throw new Error(
            "Supabase email rate limit reached — new wallet accounts can't be created right now (~3/hour limit). " +
            "Try again in a few minutes, or go to Security Settings → API Server and enter your API server URL for instant signup.",
          );
        }
        throw signInError;
      }

      setStep("success");
      try {
        if (activeWallet) localStorage.setItem("rl:wallet", JSON.stringify({ id: activeWallet.id, address: pendingAddress }));
      } catch {}
      setTimeout(() => { if (pendingAddress) onSuccess(pendingAddress); }, 1400);
    } catch (err: any) {
      const msg = err?.message ?? "Account creation failed";
      setError(msg);
      toast.error(msg);
    } finally {
      setBusySignup(false);
    }
  }, [pendingAddress, activeWallet, onSuccess]);

  const installed = wallets.filter((w) => !!w.provider);
  const notInstalled = wallets.filter((w) => !w.provider);

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={(e) => { if (e.target === e.currentTarget && step === "select") onClose(); }}
    >
      <div className="absolute inset-0 bg-black/65 backdrop-blur-sm" />
      <motion.div
        initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
        transition={{ type: "spring", stiffness: 350, damping: 32 }}
        className="relative z-10 bg-card border border-border rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-sm overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
              <Wallet className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-bold leading-tight">Connect Wallet</h2>
              <p className="text-[11px] text-muted-foreground">Sign to authenticate — no transaction needed</p>
            </div>
          </div>
          <button onClick={onClose} disabled={step === "signing" || step === "connecting" || busySignup}
            className="text-muted-foreground hover:text-foreground w-7 h-7 flex items-center justify-center rounded-lg hover:bg-muted transition-colors disabled:opacity-30" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        <AnimatePresence mode="wait">
          {step === "success" && connectedAddress ? (
            <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="px-5 pb-6 pt-4 text-center space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto ring-4 ring-emerald-500/20 overflow-hidden">
                {activeWallet && <WalletIcon icon={activeWallet.icon} name={activeWallet.name} />}
              </div>
              <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center mx-auto -mt-2">
                <CheckCircle2 className="w-4 h-4 text-white" />
              </div>
              <p className="font-bold text-lg">Wallet Verified</p>
              <p className="text-sm font-mono text-muted-foreground bg-muted/50 rounded-xl py-2 px-3">
                {connectedAddress.slice(0, 8)}…{connectedAddress.slice(-6)}
              </p>
              <p className="text-xs text-muted-foreground">Redirecting to your dashboard…</p>
              <Loader2 className="w-5 h-5 animate-spin text-primary mx-auto" />
            </motion.div>

          ) : step === "connecting" || step === "signing" ? (
            <motion.div key="connecting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="px-5 pb-6 pt-4">
              <div className="flex flex-col items-center py-8 text-center">
                <div className="relative w-16 h-16 mb-4">
                  <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center overflow-hidden">
                    {activeWallet && <WalletIcon icon={activeWallet.icon} name={activeWallet.name} />}
                  </div>
                  <div className="absolute inset-0 rounded-2xl border-2 border-primary/30 animate-ping" />
                </div>
                <p className="font-bold text-base">
                  {step === "signing" ? "Sign the message" : "Requesting access…"}
                </p>
                <p className="text-sm text-muted-foreground mt-1 max-w-[220px]">
                  {step === "signing"
                    ? "Open your wallet and sign to prove ownership — no gas needed"
                    : "Approve the connection request in your wallet"}
                </p>
                <Loader2 className="w-5 h-5 animate-spin text-primary mt-4" />
              </div>
            </motion.div>

          ) : step === "email" ? (
            <motion.div key="email" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="px-5 pb-6 pt-4 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                  {activeWallet && <WalletIcon icon={activeWallet.icon} name={activeWallet.name} />}
                </div>
                <div>
                  <p className="font-semibold text-sm">Create your account</p>
                  <p className="text-xs text-muted-foreground font-mono">{connectedAddress?.slice(0, 8)}…{connectedAddress?.slice(-6)}</p>
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-destructive/10 text-destructive text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /><span>{error}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="wallet-signup-email" className="text-xs font-semibold flex items-center gap-1.5">
                  <Mail className="w-3 h-3" /> Recovery Email <span className="text-muted-foreground font-normal">(optional)</span>
                </Label>
                <Input
                  id="wallet-signup-email"
                  type="email"
                  placeholder="you@example.com"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  disabled={busySignup}
                  className="h-10 rounded-xl"
                  onKeyDown={(e) => { if (e.key === "Enter") handleEmailSignup(emailInput || undefined); }}
                />
                <p className="text-[11px] text-muted-foreground">
                  Used for account recovery only. Your wallet is your primary login.
                </p>
              </div>

              <Button
                onClick={() => handleEmailSignup(emailInput || undefined)}
                disabled={busySignup}
                className="w-full h-11 rounded-xl"
              >
                {busySignup
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating account…</>
                  : <><ArrowRight className="w-4 h-4 mr-2" /> Create Account</>}
              </Button>

              {!busySignup && (
                <button
                  onClick={() => handleEmailSignup(undefined)}
                  className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
                >
                  Skip — create without recovery email
                </button>
              )}
            </motion.div>

          ) : (
            <motion.div key="select" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="px-4 pb-5 pt-3 max-h-[72vh] overflow-y-auto">
              {error && (
                <div className="flex items-start gap-2 p-3 mb-3 rounded-xl bg-destructive/10 text-destructive text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /><span>{error}</span>
                </div>
              )}

              <div className="flex items-center gap-1.5 px-3 py-2 mb-3 rounded-xl bg-primary/6 border border-primary/15 text-[11px] text-primary font-medium">
                <Zap className="w-3 h-3 flex-shrink-0" /> Connect on Arc Testnet for vault deposits
              </div>

              {wallets.length === 0 ? (
                <div className="flex flex-col items-center py-8 text-center text-sm text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin mb-3 text-primary" /> Detecting wallets…
                </div>
              ) : (
                <>
                  {installed.length > 0 && (
                    <div className="mb-2">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1.5 px-1">Detected</p>
                      {installed.map((w) => (
                        <WalletRow key={w.id} wallet={w} installed onClick={() => handleConnect(w)} disabled={!!connectingId} />
                      ))}
                    </div>
                  )}
                  {notInstalled.length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1.5 px-1">Popular Wallets</p>
                      {notInstalled.map((w) => (
                        <WalletRow key={w.id} wallet={w} installed={false} onClick={() => handleConnect(w)} disabled={!!connectingId} />
                      ))}
                    </div>
                  )}
                </>
              )}

              <div className="flex items-center gap-1.5 justify-center mt-4 text-[11px] text-muted-foreground px-2">
                <Shield className="w-3 h-3 text-primary flex-shrink-0" />
                <span>We never request private keys or initiate transactions</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}

function WalletRow({ wallet, installed, onClick, disabled }: { wallet: DiscoveredWallet; installed: boolean; onClick: () => void; disabled: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted/70 active:scale-[0.98] transition-all text-left disabled:opacity-50 group mb-0.5">
      <div className="w-10 h-10 rounded-xl bg-muted/80 flex items-center justify-center overflow-hidden ring-1 ring-border group-hover:ring-primary/40 transition-all flex-shrink-0">
        <WalletIcon icon={wallet.icon} name={wallet.name} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm">{wallet.name}</p>
        <p className="text-xs text-muted-foreground">{installed ? "Detected · ready to connect" : "Click to install"}</p>
      </div>
      {installed ? (
        <span className="text-[9px] font-bold tracking-wide text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded-md flex-shrink-0">READY</span>
      ) : (
        <ExternalLink className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0" />
      )}
    </button>
  );
}
