import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  X, Loader2, AlertTriangle, CheckCircle2, ExternalLink,
  ArrowRight, Users, Wallet, ShieldCheck, Zap, RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import {
  ARC_CHAIN, VAULT_ADDRESS, switchToArc,
  encodeErc20Approve, encodeErc20Allowance, encodeErc20BalanceOf, encodeVaultDeposit,
  parseUnits, isArcChain, waitForReceipt,
} from "@/lib/chain";
import { useRecordVaultDeposit, getListVaultDepositsQueryKey, useListBeneficiaries } from "@/lib/api";

type Eip1193 = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, handler: (...args: any[]) => void) => void;
  removeListener?: (event: string, handler: (...args: any[]) => void) => void;
};

function getInjectedProvider(): Eip1193 | null {
  const eth = (window as any).ethereum as Eip1193 | undefined;
  return eth ?? null;
}

const QUICK_AMOUNTS = ["10", "50", "100", "500", "1000"];

type BusyState = "idle" | "switching" | "approving" | "waiting_approval" | "depositing" | "waiting_deposit";

function busyLabel(busy: BusyState): React.ReactNode {
  if (busy === "approving") return <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Approve in wallet…</>;
  if (busy === "waiting_approval") return <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Confirming approval…</>;
  if (busy === "depositing") return <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Confirm deposit in wallet…</>;
  if (busy === "waiting_deposit") return <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Confirming deposit…</>;
  return null;
}

function formatUsdc(raw: bigint): string {
  const dec = ARC_CHAIN.usdc.decimals;
  const divisor = 10n ** BigInt(dec);
  const whole = raw / divisor;
  const frac = raw % divisor;
  const fracStr = frac.toString().padStart(dec, "0").replace(/0+$/, "");
  return fracStr ? `${whole}.${fracStr}` : whole.toString();
}

export function DepositModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState<BusyState>("idle");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [approvalSkipped, setApprovalSkipped] = useState(false);
  const [walletBalance, setWalletBalance] = useState<string | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(false);

  const { data: beneficiaries = [] } = useListBeneficiaries();

  const record = useRecordVaultDeposit({
    mutation: { onSuccess: () => qc.invalidateQueries({ queryKey: getListVaultDepositsQueryKey() }) },
  });

  const fetchWalletBalance = useCallback(async (addr: string) => {
    const provider = getInjectedProvider();
    if (!provider) return;
    setLoadingBalance(true);
    try {
      const data = encodeErc20BalanceOf(addr);
      const result = (await provider.request({
        method: "eth_call",
        params: [{ to: ARC_CHAIN.usdc.address, data }, "latest"],
      })) as string;
      setWalletBalance(result && result !== "0x" ? formatUsdc(BigInt(result)) : "0");
    } catch {
      setWalletBalance(null);
    } finally {
      setLoadingBalance(false);
    }
  }, []);

  useEffect(() => {
    const provider = getInjectedProvider();
    if (!provider) return;
    let stored: { address?: string } | null = null;
    try { stored = JSON.parse(localStorage.getItem("rl:wallet") ?? "null"); } catch {}
    if (stored?.address) setAddress(stored.address);

    (async () => {
      try {
        const accs = (await provider.request({ method: "eth_accounts" })) as string[];
        const addr = accs?.[0] ?? null;
        if (addr) setAddress(addr);
        const cid = (await provider.request({ method: "eth_chainId" })) as string;
        setChainId(cid);
        if (addr && isArcChain(cid)) fetchWalletBalance(addr);
      } catch {}
    })();

    const onChain = (id: string) => {
      setChainId(id);
      setAddress((prev) => { if (prev && isArcChain(id)) fetchWalletBalance(prev); else setWalletBalance(null); return prev; });
    };
    const onAccs = (a: string[]) => {
      const addr = a?.[0] ?? null;
      setAddress(addr);
      if (!addr) setWalletBalance(null);
    };
    provider.on?.("chainChanged", onChain);
    provider.on?.("accountsChanged", onAccs);
    return () => {
      provider.removeListener?.("chainChanged", onChain);
      provider.removeListener?.("accountsChanged", onAccs);
    };
  }, [fetchWalletBalance]);

  // Re-fetch balance when address+chain are both valid
  useEffect(() => {
    if (address && isArcChain(chainId)) fetchWalletBalance(address);
    else setWalletBalance(null);
  }, [address, chainId, fetchWalletBalance]);

  const onArc = useMemo(() => isArcChain(chainId), [chainId]);
  const amountNum = parseFloat(amount) || 0;
  const hasAllocation = beneficiaries.length > 0;
  const totalAllocation = beneficiaries.reduce((s, b) => s + Number(b.allocationPercent || 0), 0);
  const isBusy = busy !== "idle";

  async function handleSwitch() {
    const provider = getInjectedProvider();
    if (!provider) { toast.error("No wallet detected"); return; }
    setBusy("switching");
    try {
      await switchToArc(provider);
      const cid = (await provider.request({ method: "eth_chainId" })) as string;
      setChainId(cid);
      toast.success(`Switched to ${ARC_CHAIN.name}`);
    } catch (e: any) {
      toast.error(e?.code === 4001 ? "Rejected by user" : (e?.message ?? "Could not switch network"));
    } finally {
      setBusy("idle");
    }
  }

  async function handleDeposit() {
    const provider = getInjectedProvider();
    if (!provider || !address) { toast.error("Connect a wallet first"); return; }
    if (!onArc) { toast.error(`Switch to ${ARC_CHAIN.name} first`); return; }
    if (!amountNum || amountNum <= 0) { toast.error("Enter a valid amount"); return; }

    const value = parseUnits(amount, ARC_CHAIN.usdc.decimals);

    try {
      // ── Step 1: Check allowance ──────────────────────────────────────────
      let needsApproval = true;
      try {
        const allowanceData = encodeErc20Allowance(address, VAULT_ADDRESS);
        const result = (await provider.request({
          method: "eth_call",
          params: [{ to: ARC_CHAIN.usdc.address, data: allowanceData }, "latest"],
        })) as string;
        const currentAllowance = result && result !== "0x" ? BigInt(result) : 0n;
        needsApproval = currentAllowance < value;
      } catch {}

      // ── Step 2: Approve if needed ────────────────────────────────────────
      if (needsApproval) {
        setBusy("approving");
        const approveData = encodeErc20Approve(VAULT_ADDRESS, value);
        const approveTx = (await provider.request({
          method: "eth_sendTransaction",
          params: [{ from: address, to: ARC_CHAIN.usdc.address, data: approveData }],
        })) as string;

        toast.info("Approval submitted — waiting for confirmation…");
        setBusy("waiting_approval");
        await waitForReceipt(provider, approveTx);
        setApprovalSkipped(false);
        toast.success("USDC approved ✓");
      } else {
        setApprovalSkipped(true);
      }

      // ── Step 3: Deposit ──────────────────────────────────────────────────
      setBusy("depositing");
      const depositData = encodeVaultDeposit(value);
      const depositTx = (await provider.request({
        method: "eth_sendTransaction",
        params: [{ from: address, to: VAULT_ADDRESS, data: depositData }],
      })) as string;

      toast.info("Deposit submitted — waiting for confirmation…");
      setBusy("waiting_deposit");
      await waitForReceipt(provider, depositTx);

      setTxHash(depositTx);
      record.mutate({
        data: { fromAddress: address, amount, token: "USDC", chainId: ARC_CHAIN.id, txHash: depositTx },
      });
      toast.success("Deposit confirmed on-chain ✓");
    } catch (e: any) {
      const msg = e?.code === 4001 ? "Rejected by user" : (e?.message ?? "Deposit failed");
      toast.error(msg);
    } finally {
      setBusy("idle");
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 12 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ type: "spring", damping: 24, stiffness: 300 }}
        className="relative z-10 bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Wallet className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">Deposit to Vault</h2>
              <p className="text-xs text-muted-foreground">USDC on {ARC_CHAIN.name}</p>
            </div>
          </div>
          <button onClick={onClose} disabled={isBusy}
            className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-muted transition-colors disabled:opacity-40"
            aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-5 space-y-4">

          {/* Step indicators */}
          {!txHash && (
            <div className="flex items-center gap-1.5 text-xs">
              <StepBadge n={1} done={!!address} label="Connect wallet" />
              <div className="flex-1 h-px bg-border" />
              <StepBadge n={2} done={onArc} label="Arc Network" disabled={!address} />
              <div className="flex-1 h-px bg-border" />
              <StepBadge n={3}
                done={busy === "waiting_deposit" || busy === "depositing" || !!txHash}
                active={busy === "approving" || busy === "waiting_approval"}
                label="Approve USDC"
                disabled={!onArc} />
              <div className="flex-1 h-px bg-border" />
              <StepBadge n={4} done={!!txHash}
                active={busy === "depositing" || busy === "waiting_deposit"}
                label="Deposit"
                disabled={!onArc} />
            </div>
          )}

          {/* In-progress banner */}
          {isBusy && busy !== "switching" && (
            <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-primary/8 border border-primary/20 text-sm font-medium text-primary">
              <Zap className="w-4 h-4 flex-shrink-0" />
              <span className="flex items-center gap-1.5">{busyLabel(busy)}</span>
            </div>
          )}

          {/* No wallet */}
          {!address && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>Connect a wallet from the header bar to continue. Look for the wallet icon at the top right.</span>
            </div>
          )}

          {/* Wrong network */}
          {address && !onArc && (
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4">
              <div className="flex items-start gap-2.5 mb-3">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-amber-600 dark:text-amber-400 text-sm">Wrong network</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Deposits require <span className="font-semibold text-foreground">{ARC_CHAIN.name}</span> (chain {ARC_CHAIN.id}).
                    You're currently on chain {chainId ? parseInt(chainId, 16) : "?"}.
                  </p>
                </div>
              </div>
              <Button onClick={handleSwitch} disabled={busy === "switching"} className="w-full rounded-xl">
                {busy === "switching"
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Switching…</>
                  : <><ArrowRight className="w-4 h-4 mr-2" /> Switch to {ARC_CHAIN.name}</>}
              </Button>
            </div>
          )}

          {/* Connected + correct network */}
          {address && onArc && !txHash && (
            <>
              {/* Wallet / vault info */}
              <div className="bg-muted/50 border border-border rounded-xl p-3 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-1.5"><Wallet className="w-3 h-3" /> From</span>
                  <span className="font-mono font-medium">{address.slice(0, 6)}…{address.slice(-4)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-1.5"><ShieldCheck className="w-3 h-3" /> Vault</span>
                  <a
                    href={`${ARC_CHAIN.explorer}/address/${VAULT_ADDRESS}`}
                    target="_blank" rel="noopener noreferrer"
                    className="font-mono hover:text-primary transition-colors flex items-center gap-1"
                  >
                    {VAULT_ADDRESS.slice(0, 6)}…{VAULT_ADDRESS.slice(-4)}
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Network</span>
                  <span className="text-emerald-500 font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                    {ARC_CHAIN.name}
                  </span>
                </div>
                <div className="h-px bg-border" />
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Wallet USDC</span>
                  <div className="flex items-center gap-1.5">
                    {loadingBalance ? (
                      <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
                    ) : walletBalance !== null ? (
                      <span className="font-semibold tabular-nums text-foreground">{walletBalance} USDC</span>
                    ) : (
                      <button onClick={() => address && fetchWalletBalance(address)}
                        className="text-primary hover:underline flex items-center gap-1">
                        <RefreshCw className="w-3 h-3" /> Refresh
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Amount input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="amount" className="text-sm font-semibold">Amount</Label>
                  {walletBalance !== null && !loadingBalance && (
                    <button
                      type="button"
                      disabled={isBusy || walletBalance === "0"}
                      onClick={() => setAmount(walletBalance)}
                      className="text-[11px] font-semibold text-primary hover:text-primary/80 transition-colors disabled:opacity-40 flex items-center gap-1"
                    >
                      Bal: {walletBalance} USDC
                      <span className="bg-primary/10 text-primary rounded px-1 py-0.5 text-[9px] font-bold tracking-wide">MAX</span>
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Input
                    id="amount" type="number" inputMode="decimal" step="any" min="0"
                    placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)}
                    disabled={isBusy}
                    className="pr-16 text-xl font-bold h-12 rounded-xl"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-semibold">USDC</span>
                </div>
                <div className="flex gap-1.5">
                  {QUICK_AMOUNTS.map((v) => {
                    const exceedsBalance = walletBalance !== null && parseFloat(v) > parseFloat(walletBalance || "0");
                    return (
                      <button key={v} type="button" onClick={() => setAmount(v)} disabled={isBusy || exceedsBalance}
                        className={`flex-1 text-xs py-1.5 rounded-lg border transition-colors disabled:opacity-30 ${
                          amount === v ? "border-primary bg-primary/10 text-primary font-semibold" : "border-border hover:bg-muted"
                        }`}>
                        ${v}
                      </button>
                    );
                  })}
                </div>
                {walletBalance !== null && amountNum > parseFloat(walletBalance) && (
                  <p className="text-xs text-destructive flex items-center gap-1.5">
                    <AlertTriangle className="w-3 h-3" /> Amount exceeds your wallet balance of {walletBalance} USDC
                  </p>
                )}
              </div>

              {/* How it works note */}
              <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-muted/40 border border-border text-[11px] text-muted-foreground">
                <Zap className="w-3 h-3 text-primary flex-shrink-0 mt-0.5" />
                <span>Two wallet prompts: first to <span className="font-medium text-foreground">approve</span> USDC, then to <span className="font-medium text-foreground">deposit</span> into the vault.</span>
              </div>

              {/* Beneficiary allocation breakdown */}
              {amountNum > 0 && hasAllocation && (
                <div className="rounded-xl border border-border bg-muted/30 overflow-hidden">
                  <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-border">
                    <Users className="w-3.5 h-3.5 text-primary" />
                    <p className="text-xs font-semibold">Beneficiary Allocation</p>
                    {totalAllocation !== 100 && (
                      <span className="ml-auto text-[10px] text-amber-500 font-medium">⚠ {totalAllocation}% allocated</span>
                    )}
                  </div>
                  <div className="divide-y divide-border">
                    {beneficiaries.map((b) => {
                      const pct = Number(b.allocationPercent || 0);
                      const share = (amountNum * pct) / 100;
                      return (
                        <div key={b.id} className="flex items-center gap-3 px-3.5 py-2.5">
                          <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0">
                            {b.name[0]?.toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold truncate">{b.name}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                                <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                              </div>
                              <span className="text-[10px] text-muted-foreground font-medium">{pct}%</span>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-xs font-bold">{share.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                            <p className="text-[10px] text-muted-foreground">USDC</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {totalAllocation === 100 && (
                    <div className="px-3.5 py-2 bg-emerald-500/5 border-t border-emerald-500/20 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                      <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                        {amountNum.toLocaleString(undefined, { maximumFractionDigits: 2 })} USDC fully distributed across {beneficiaries.length} beneficiar{beneficiaries.length === 1 ? "y" : "ies"}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {amountNum > 0 && !hasAllocation && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-muted/50 border border-border text-xs text-muted-foreground">
                  <Users className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>Add beneficiaries in the Guardians tab to see how this deposit will be distributed.</span>
                </div>
              )}

              <Button
                onClick={handleDeposit}
                disabled={isBusy || !amount || amountNum <= 0 || (walletBalance !== null && amountNum > parseFloat(walletBalance))}
                className="w-full h-11 rounded-xl font-semibold text-sm shadow-lg shadow-primary/20"
              >
                {isBusy && busy !== "switching"
                  ? busyLabel(busy)
                  : <>Deposit {amountNum > 0 ? `${amountNum.toLocaleString(undefined, { maximumFractionDigits: 2 })} USDC` : "to Vault"}</>}
              </Button>
            </>
          )}

          {/* Success state */}
          {txHash && (
            <div className="text-center py-4 space-y-4">
              <motion.div
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", damping: 14, stiffness: 200 }}
                className="w-16 h-16 rounded-full bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-center mx-auto"
              >
                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
              </motion.div>
              <div>
                <p className="text-lg font-bold">Deposit confirmed!</p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {amountNum > 0 ? `${amountNum.toLocaleString(undefined, { maximumFractionDigits: 2 })} USDC` : "Funds"} are now in your vault.
                </p>
                {approvalSkipped && (
                  <p className="text-xs text-muted-foreground mt-1">Existing USDC approval reused — only one transaction needed.</p>
                )}
              </div>
              <a
                href={`${ARC_CHAIN.explorer}/tx/${txHash}`}
                target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
              >
                View on Arcscan <ExternalLink className="w-3 h-3" />
              </a>
              {hasAllocation && amountNum > 0 && (
                <div className="rounded-xl border border-border bg-muted/30 text-left">
                  <div className="px-3.5 py-2 border-b border-border">
                    <p className="text-xs font-semibold text-muted-foreground">Distribution plan</p>
                  </div>
                  {beneficiaries.map((b) => {
                    const pct = Number(b.allocationPercent || 0);
                    const share = (amountNum * pct) / 100;
                    return (
                      <div key={b.id} className="flex items-center justify-between px-3.5 py-2 text-xs border-b border-border last:border-0">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">
                            {b.name[0]?.toUpperCase()}
                          </span>
                          <span className="font-medium">{b.name}</span>
                        </div>
                        <span className="font-semibold tabular-nums">
                          {share.toLocaleString(undefined, { maximumFractionDigits: 2 })} USDC
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
              <Button onClick={onClose} className="w-full rounded-xl">Done</Button>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function StepBadge({
  n, done, active, label, disabled,
}: {
  n: number; done: boolean; active?: boolean; label: string; disabled?: boolean;
}) {
  return (
    <div className={`flex items-center gap-1 ${disabled ? "opacity-40" : ""}`}>
      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 transition-colors ${
        done ? "bg-emerald-500 text-white"
        : active ? "bg-primary text-primary-foreground"
        : "bg-muted text-muted-foreground border border-border"
      }`}>
        {done ? <CheckCircle2 className="w-3 h-3" /> : active ? <Loader2 className="w-3 h-3 animate-spin" /> : n}
      </div>
      <span className={`text-[10px] whitespace-nowrap ${
        done ? "text-emerald-600 dark:text-emerald-400 font-medium"
        : active ? "text-primary font-medium"
        : "text-muted-foreground"
      }`}>{label}</span>
    </div>
  );
}
