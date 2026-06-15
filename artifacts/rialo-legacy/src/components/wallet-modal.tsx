import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, CheckCircle2, Copy, Loader2, ExternalLink, AlertCircle,
  Wallet, ArrowRight, RefreshCw, Shield, AlertTriangle, Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ARC_CHAIN, isArcChain, switchToArc } from "@/lib/chain";
import metamaskLogo from "@/assets/wallet-metamask.png";
import trustLogo from "@/assets/wallet-trust.jpg";
import okxLogo from "@/assets/wallet-okx.png";
import phantomLogo from "@/assets/wallet-phantom.png";

type Eip1193Provider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, handler: (...args: any[]) => void) => void;
  removeListener?: (event: string, handler: (...args: any[]) => void) => void;
};

type Eip6963ProviderInfo = { uuid: string; name: string; icon: string; rdns: string };
type Eip6963ProviderDetail = { info: Eip6963ProviderInfo; provider: Eip1193Provider };

type CatalogEntry = {
  rdns: string;
  name: string;
  icon: string;
  installUrl: string;
  popular?: boolean;
  matches?: (provider: any) => boolean;
};

const CATALOG: CatalogEntry[] = [
  {
    rdns: "io.metamask", name: "MetaMask", popular: true,
    icon: metamaskLogo,
    installUrl: "https://metamask.io/download/",
    matches: (p) => !!p?.isMetaMask && !p?.isRabby && !p?.isBraveWallet,
  },
  {
    rdns: "com.coinbase.wallet", name: "Coinbase Wallet", popular: true,
    icon: "https://avatars.githubusercontent.com/u/18060234?s=200&v=4",
    installUrl: "https://www.coinbase.com/wallet/downloads",
    matches: (p) => !!p?.isCoinbaseWallet,
  },
  {
    rdns: "io.rabby", name: "Rabby Wallet", popular: true,
    icon: "https://rabby.io/assets/images/logo-128.png",
    installUrl: "https://rabby.io/",
    matches: (p) => !!p?.isRabby,
  },
  {
    rdns: "app.phantom", name: "Phantom",
    icon: phantomLogo,
    installUrl: "https://phantom.app/download",
    matches: (p) => !!p?.isPhantom,
  },
  {
    rdns: "com.okex.wallet", name: "OKX Wallet",
    icon: okxLogo,
    installUrl: "https://www.okx.com/web3",
    matches: (p) => !!p?.isOkxWallet || !!(window as any).okxwallet,
  },
  {
    rdns: "com.trustwallet.app", name: "Trust Wallet",
    icon: trustLogo,
    installUrl: "https://trustwallet.com/download",
    matches: (p) => !!p?.isTrust || !!p?.isTrustWallet,
  },
];

type DiscoveredWallet = {
  id: string; name: string; icon: string;
  provider?: Eip1193Provider; installUrl?: string; popular?: boolean;
};

type ConnectStep = "select" | "connecting" | "signing" | "connected";

function shortenAddress(a: string) { return `${a.slice(0, 6)}…${a.slice(-4)}`; }

const CHAIN_NAMES: Record<string, string> = {
  "0x1": "Ethereum", "0x89": "Polygon", "0xa": "Optimism",
  "0xa4b1": "Arbitrum", "0x2105": "Base", "0x38": "BNB Chain",
  "0xaa36a7": "Sepolia", [ARC_CHAIN.hex]: ARC_CHAIN.name,
};

function WalletIcon({ wallet }: { wallet: DiscoveredWallet }) {
  const [err, setErr] = useState(false);
  if (err || !wallet.icon) {
    return (
      <span className="text-sm font-bold text-muted-foreground">
        {wallet.name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase()}
      </span>
    );
  }
  return (
    <img
      src={wallet.icon}
      alt={`${wallet.name} logo`}
      className="w-8 h-8 object-contain"
      onError={() => setErr(true)}
    />
  );
}

export function WalletModal({ onClose }: { onClose: () => void }) {
  const [wallets, setWallets] = useState<DiscoveredWallet[]>([]);
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [step, setStep] = useState<ConnectStep>("select");
  const [account, setAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<string | null>(null);
  const [connectedWallet, setConnectedWallet] = useState<DiscoveredWallet | null>(null);
  const [connectedProvider, setConnectedProvider] = useState<Eip1193Provider | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [switching, setSwitching] = useState(false);

  const onArc = isArcChain(chainId);

  useEffect(() => {
    const found = new Map<string, DiscoveredWallet>();
    function onAnnounce(event: Event) {
      const detail = (event as CustomEvent<Eip6963ProviderDetail>).detail;
      if (!detail?.info) return;
      const cat = CATALOG.find((c) => c.rdns === detail.info.rdns);
      found.set(detail.info.rdns, {
        id: detail.info.rdns, name: detail.info.name,
        icon: detail.info.icon, provider: detail.provider, popular: cat?.popular,
      });
      flush();
    }
    function flush() {
      const detected = Array.from(found.values());
      const detectedRdns = new Set(detected.map((d) => d.id));
      const fallback: DiscoveredWallet[] = CATALOG.filter((c) => !detectedRdns.has(c.rdns)).map((c) => {
        const eth = (window as any).ethereum as Eip1193Provider | undefined;
        const installed = eth && c.matches?.(eth as any);
        return { id: c.rdns, name: c.name, icon: c.icon, provider: installed ? eth : undefined, installUrl: c.installUrl, popular: c.popular };
      });
      setWallets([...detected, ...fallback]);
    }
    window.addEventListener("eip6963:announceProvider", onAnnounce as EventListener);
    window.dispatchEvent(new Event("eip6963:requestProvider"));
    flush();
    return () => { window.removeEventListener("eip6963:announceProvider", onAnnounce as EventListener); };
  }, []);

  const connect = useCallback(async (w: DiscoveredWallet) => {
    setError(null);
    if (!w.provider) { window.open(w.installUrl, "_blank", "noopener,noreferrer"); return; }
    setConnectingId(w.id);
    setStep("connecting");
    try {
      const accounts = (await w.provider.request({ method: "eth_requestAccounts" })) as string[];
      if (!accounts?.length) throw new Error("No accounts returned");
      setStep("signing");
      await new Promise((r) => setTimeout(r, 400));
      const cid = (await w.provider.request({ method: "eth_chainId" })) as string;
      setAccount(accounts[0]);
      setChainId(cid);
      setConnectedWallet(w);
      setConnectedProvider(w.provider);
      setStep("connected");
      try { localStorage.setItem("rl:wallet", JSON.stringify({ id: w.id, address: accounts[0], chainId: cid })); } catch {}
      toast.success(`${w.name} connected`, { description: shortenAddress(accounts[0]) });
      w.provider.on?.("accountsChanged", (accs: string[]) => {
        if (!accs.length) { setAccount(null); setStep("select"); localStorage.removeItem("rl:wallet"); }
        else setAccount(accs[0]);
      });
      w.provider.on?.("chainChanged", (id: string) => setChainId(id));
    } catch (err: any) {
      const msg = err?.code === 4001 ? "Request rejected by user" : err?.message || "Could not connect wallet";
      setError(msg);
      setStep("select");
      toast.error(msg);
    } finally {
      setConnectingId(null);
    }
  }, []);

  async function handleSwitchToArc() {
    if (!connectedProvider) return;
    setSwitching(true);
    try {
      await switchToArc(connectedProvider);
      const cid = (await connectedProvider.request({ method: "eth_chainId" })) as string;
      setChainId(cid);
      toast.success("Switched to Arc Testnet");
    } catch (err: any) {
      toast.error(err?.code === 4001 ? "Rejected by user" : "Could not switch network");
    } finally {
      setSwitching(false);
    }
  }

  function copyAddress() {
    if (!account) return;
    navigator.clipboard.writeText(account);
    toast.success("Address copied to clipboard");
  }

  function disconnect() {
    setAccount(null); setChainId(null); setConnectedWallet(null);
    setConnectedProvider(null); setStep("select");
    try { localStorage.removeItem("rl:wallet"); } catch {}
  }

  const chainName = chainId ? (CHAIN_NAMES[chainId] ?? `Chain ${parseInt(chainId, 16)}`) : null;
  const installed = wallets.filter((w) => !!w.provider);
  const notInstalled = wallets.filter((w) => !w.provider);
  const filtered = (list: DiscoveredWallet[]) => search.trim() ? list.filter((w) => w.name.toLowerCase().includes(search.toLowerCase())) : list;

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/65 backdrop-blur-sm" />
      <motion.div
        initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
        transition={{ type: "spring", stiffness: 350, damping: 32 }}
        className="relative z-10 bg-card border border-border rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-sm overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
              <Wallet className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-bold leading-tight">Connect Wallet</h2>
              <p className="text-[11px] text-muted-foreground">Sign to verify your identity</p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground w-7 h-7 flex items-center justify-center rounded-lg hover:bg-muted transition-colors" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        <AnimatePresence mode="wait">
          {/* Connected state */}
          {step === "connected" && account ? (
            <motion.div key="connected" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="px-5 pb-6 pt-4 space-y-3">
              <div className="flex flex-col items-center text-center py-2">
                <div className="relative mb-3">
                  <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center ring-4 ring-emerald-500/20 overflow-hidden">
                    {connectedWallet && <WalletIcon wallet={connectedWallet} />}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
                    <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                  </div>
                </div>
                <p className="font-bold text-lg">Connected</p>
                {chainName && (
                  <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium mt-1 ${
                    onArc ? "bg-primary/10 text-primary" : "bg-amber-500/10 text-amber-500"
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${onArc ? "bg-emerald-500" : "bg-amber-400"}`} />
                    {chainName}
                  </span>
                )}
              </div>

              {/* Wrong network banner */}
              {!onArc && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/8 p-3.5 space-y-2.5">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold text-amber-500">Wrong Network</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Arkive requires the <span className="font-semibold text-foreground">{ARC_CHAIN.name}</span> network for vault operations. Please switch to continue.
                      </p>
                    </div>
                  </div>
                  <Button size="sm" className="w-full h-9 bg-amber-500 hover:bg-amber-600 text-white gap-1.5"
                    onClick={handleSwitchToArc} disabled={switching}>
                    {switching
                      ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Switching…</>
                      : <><Zap className="w-3.5 h-3.5" /> Switch to {ARC_CHAIN.name}</>}
                  </Button>
                </div>
              )}

              {onArc && (
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400">
                  <Shield className="w-3.5 h-3.5 flex-shrink-0" /> Your wallet is verified for vault deposits
                </div>
              )}

              <button onClick={copyAddress} className="w-full bg-muted/70 hover:bg-muted rounded-xl p-3 flex items-center justify-between gap-2 transition-colors group">
                <span className="font-mono text-sm text-foreground">{shortenAddress(account)}</span>
                <Copy className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </button>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 h-10" onClick={disconnect}>
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Switch
                </Button>
                <Button className="flex-1 h-10" onClick={onClose}>
                  Done <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                </Button>
              </div>
            </motion.div>
          ) : step === "connecting" || step === "signing" ? (
            /* Connecting animation */
            <motion.div key="connecting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="px-5 pb-6 pt-4">
              <div className="flex flex-col items-center py-8 text-center">
                <div className="relative w-16 h-16 mb-4">
                  <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center overflow-hidden">
                    {connectingId && wallets.find((w) => w.id === connectingId) && (
                      <WalletIcon wallet={wallets.find((w) => w.id === connectingId)!} />
                    )}
                  </div>
                  <div className="absolute inset-0 rounded-2xl border-2 border-primary/30 animate-ping" />
                </div>
                <p className="font-bold text-base">
                  {step === "signing" ? "Confirm in wallet" : "Requesting access…"}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {step === "signing" ? "Sign the message to authenticate" : "Open your wallet and approve the connection"}
                </p>
                <Loader2 className="w-5 h-5 animate-spin text-primary mt-4" />
              </div>
            </motion.div>
          ) : (
            /* Wallet list */
            <motion.div key="select" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="px-4 pb-5 pt-3 max-h-[72vh] overflow-y-auto">
              {error && (
                <div className="flex items-start gap-2 p-3 mb-3 rounded-xl bg-destructive/10 text-destructive text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /><span>{error}</span>
                </div>
              )}

              {/* ARC network info pill */}
              <div className="flex items-center gap-1.5 px-3 py-2 mb-3 rounded-xl bg-primary/6 border border-primary/15 text-[11px] text-primary font-medium">
                <Zap className="w-3 h-3 flex-shrink-0" />
                Connect on <span className="font-semibold">{ARC_CHAIN.name}</span> for vault deposits
              </div>

              {/* Search */}
              <div className="relative mb-3">
                <input
                  type="text" placeholder="Search wallets…"
                  value={search} onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-muted/60 border border-border rounded-xl pl-3 pr-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground"
                />
              </div>

              {wallets.length === 0 ? (
                <div className="flex flex-col items-center py-8 text-center text-sm text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin mb-3 text-primary" /> Detecting wallets…
                </div>
              ) : (
                <>
                  {filtered(installed).length > 0 && (
                    <div className="mb-2">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1.5 px-1">Detected</p>
                      {filtered(installed).map((w) => (
                        <WalletRow key={w.id} wallet={w} installed onClick={() => connect(w)} disabled={!!connectingId} />
                      ))}
                    </div>
                  )}
                  {filtered(notInstalled).length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1.5 px-1">Popular Wallets</p>
                      {filtered(notInstalled).map((w) => (
                        <WalletRow key={w.id} wallet={w} installed={false} onClick={() => connect(w)} disabled={!!connectingId} />
                      ))}
                    </div>
                  )}
                  {filtered(installed).length === 0 && filtered(notInstalled).length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-6">No wallets match "{search}"</p>
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

function WalletRow({ wallet, installed, onClick, disabled }: {
  wallet: DiscoveredWallet; installed: boolean; onClick: () => void; disabled: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted/70 active:scale-[0.98] transition-all text-left disabled:opacity-50 group mb-0.5"
    >
      <div className="w-10 h-10 rounded-xl bg-muted/80 flex items-center justify-center overflow-hidden ring-1 ring-border group-hover:ring-primary/40 transition-all flex-shrink-0">
        <WalletIcon wallet={wallet} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm">{wallet.name}</p>
        <p className="text-xs text-muted-foreground">
          {installed ? "Detected · ready to connect" : "Click to install"}
        </p>
      </div>
      {installed ? (
        <span className="text-[9px] font-bold tracking-wide text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded-md flex-shrink-0">
          READY
        </span>
      ) : (
        <ExternalLink className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0" />
      )}
    </button>
  );
}
