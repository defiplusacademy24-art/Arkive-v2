import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  X, Loader2, AlertTriangle, CheckCircle2, ExternalLink,
  ArrowDownToLine, Wallet, ShieldCheck, RefreshCw, Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import {
  ARC_CHAIN, VAULT_ADDRESS, switchToArc,
  encodeGetVaultBalance, encodeVaultWithdraw,
  isArcChain, waitForReceipt,
} from "@/lib/chain";
import { useRecordVaultWithdrawal, getListVaultDepositsQueryKey } from "@/lib/api";

type Eip1193 = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, handler: (...args: any[]) => void) => void;
  removeListener?: (event: string, handler: (...args: any[]) => void) => void;
};

function getInjectedProvider(): Eip1193 | null {
  const eth = (window as any).ethereum as Eip1193 | undefined;
  return eth ?? null;
}

type BusyState = "idle" | "switching" | "withdrawing" | "waiting";

function formatUsdc(raw: bigint): string {
  const dec = ARC_CHAIN.usdc.decimals;
  const divisor = 10n ** BigInt(dec);
  const whole = raw / divisor;
  const frac = raw % divisor;
  const fracStr = frac.toString().padStart(dec, "0").replace(/0+$/, "");
  return fracStr ? `${whole}.${fracStr}` : whole.toString();
}

export function WithdrawModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<string | null>(null);
  const [busy, setBusy] = useState<BusyState>("idle");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [txSuccess, setTxSuccess] = useState(false);
  const [vaultBalance, setVaultBalance] = useState<string | null>(null);
  const [loadingVaultBalance, setLoadingVaultBalance] = useState(false);

  const record = useRecordVaultWithdrawal({
    mutation: { onSuccess: () => qc.invalidateQueries({ queryKey: getListVaultDepositsQueryKey() }) },
  });

  const isBusy = busy !== "idle";
  const onArc = isArcChain(chainId);

  const fetchVaultBalance = useCallback(async (addr: string) => {
    const provider = getInjectedProvider();
    if (!provider) return;
    setLoadingVaultBalance(true);
    try {
      const data = encodeGetVaultBalance(addr);
      const result = (await provider.request({
        method: "eth_call",
        params: [{ to: VAULT_ADDRESS, data }, "latest"],
      })) as string;
      setVaultBalance(result && result !== "0x" ? formatUsdc(BigInt(result)) : "0");
    } catch {
      setVaultBalance(null);
    } finally {
      setLoadingVaultBalance(false);
    }
  }, []);

  useEffect(() => {
    const provider = getInjectedProvider();
    if (!provider) return;

    async function init() {
      try {
        const accounts = (await provider!.request({ method: "eth_accounts" })) as string[];
        const addr = accounts?.[0]?.toLowerCase() ?? null;
        const cid = (await provider!.request({ method: "eth_chainId" })) as string | null;
        setAddress(addr);
        setChainId(cid);
        if (addr && isArcChain(cid)) fetchVaultBalance(addr);
      } catch {}
    }
    init();

    const onAccounts = (accounts: string[]) => {
      const addr = accounts?.[0]?.toLowerCase() ?? null;
      setAddress(addr);
      if (addr && isArcChain(chainId)) fetchVaultBalance(addr);
    };
    const onChain = (cid: string) => {
      setChainId(cid);
      if (address && isArcChain(cid)) fetchVaultBalance(address);
    };
    provider.on?.("accountsChanged", onAccounts);
    provider.on?.("chainChanged", onChain);
    return () => {
      provider.removeListener?.("accountsChanged", onAccounts);
      provider.removeListener?.("chainChanged", onChain);
    };
  }, [fetchVaultBalance, address, chainId]);

  async function handleConnect() {
    const provider = getInjectedProvider();
    if (!provider) { toast.error("No wallet detected", { description: "Install MetaMask, OKX, or another EIP-1193 wallet." }); return; }
    try {
      const accounts = (await provider.request({ method: "eth_requestAccounts" })) as string[];
      const addr = accounts?.[0]?.toLowerCase() ?? null;
      setAddress(addr);
      const cid = (await provider.request({ method: "eth_chainId" })) as string;
      setChainId(cid);
      if (addr && isArcChain(cid)) fetchVaultBalance(addr);
    } catch (err: any) {
      toast.error(err?.message ?? "Could not connect wallet");
    }
  }

  async function handleSwitchNetwork() {
    const provider = getInjectedProvider();
    if (!provider) return;
    setBusy("switching");
    try {
      await switchToArc(provider);
      const cid = (await provider.request({ method: "eth_chainId" })) as string;
      setChainId(cid);
      if (address && isArcChain(cid)) fetchVaultBalance(address);
    } catch (err: any) {
      toast.error(err?.message ?? "Could not switch network");
    } finally {
      setBusy("idle");
    }
  }

  async function handleWithdrawAll() {
    const provider = getInjectedProvider();
    if (!provider || !address) return;
    if (!vaultBalance || vaultBalance === "0") {
      toast.error("Your vault balance is 0");
      return;
    }

    try {
      setBusy("withdrawing");
      const txHashRaw = (await provider.request({
        method: "eth_sendTransaction",
        params: [{
          from: address,
          to: VAULT_ADDRESS,
          data: encodeVaultWithdraw(),
          gas: "0x493E0",
        }],
      })) as string;
      setTxHash(txHashRaw);

      setBusy("waiting");
      await waitForReceipt(provider, txHashRaw);

      setTxSuccess(true);
      toast.success("Withdrawal successful", { description: `${vaultBalance} USDC returned to your wallet` });

      record.mutate({
        data: { fromAddress: address, amount: vaultBalance ?? "0", token: "USDC", chainId: ARC_CHAIN.id, txHash: txHashRaw },
      });

      fetchVaultBalance(address);
      setBusy("idle");
    } catch (err: any) {
      setTxHash(null);
      setTxSuccess(false);
      toast.error(err?.message ?? "Withdrawal failed");
      setBusy("idle");
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={(e) => { if (e.target === e.currentTarget && !isBusy) onClose(); }}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 40, scale: 0.97 }}
        transition={{ type: "spring", stiffness: 380, damping: 32 }}
        className="relative z-10 w-full sm:max-w-md bg-card border border-border rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-card/95 backdrop-blur-sm border-b border-border px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <ArrowDownToLine className="w-4 h-4 text-amber-500" />
            </div>
            <div>
              <h2 className="font-bold text-base leading-tight">Withdraw from Vault</h2>
              <p className="text-xs text-muted-foreground">Return all USDC to your wallet</p>
            </div>
          </div>
          <button onClick={onClose} disabled={isBusy}
            className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-muted transition-colors disabled:opacity-40">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">

          {/* Success state */}
          {txHash && txSuccess && busy === "idle" && (
            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
              className="text-center py-4 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
              </div>
              <div>
                <p className="font-bold text-lg">Withdrawal complete!</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {vaultBalance ? `${vaultBalance} USDC` : "Funds"} returned to your wallet
                </p>
              </div>
              <a href={`${ARC_CHAIN.explorer}/tx/${txHash}`} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
                View on explorer <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <Button onClick={onClose} className="w-full rounded-xl">Done</Button>
            </motion.div>
          )}

          {/* Waiting state */}
          {txHash && !txSuccess && busy === "waiting" && (
            <div className="text-center py-6 space-y-3">
              <Loader2 className="w-10 h-10 animate-spin text-amber-500 mx-auto" />
              <p className="font-semibold">Confirming on-chain…</p>
              <a href={`${ARC_CHAIN.explorer}/tx/${txHash}`} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
                View transaction <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}

          {/* No wallet */}
          {!txSuccess && !txHash && !address && (
            <div className="space-y-4">
              <div className="text-center py-4">
                <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
                  <Wallet className="w-6 h-6 text-muted-foreground" />
                </div>
                <p className="font-semibold mb-1">Connect your wallet</p>
                <p className="text-sm text-muted-foreground">Your wallet must match the one used to deposit.</p>
              </div>
              <Button onClick={handleConnect} className="w-full h-11 rounded-xl">
                <Wallet className="w-4 h-4 mr-2" /> Connect Wallet
              </Button>
            </div>
          )}

          {/* Wrong network */}
          {!txSuccess && !txHash && address && !onArc && (
            <div className="space-y-4">
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-center">
                <AlertTriangle className="w-6 h-6 text-amber-500 mx-auto mb-2" />
                <p className="font-semibold text-sm">Wrong network</p>
                <p className="text-xs text-muted-foreground mt-1">Switch to Arc Testnet to withdraw</p>
              </div>
              <Button onClick={handleSwitchNetwork} disabled={busy === "switching"} className="w-full h-11 rounded-xl">
                {busy === "switching" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Switch to Arc Testnet
              </Button>
            </div>
          )}

          {/* Connected + correct network */}
          {!txSuccess && address && onArc && !txHash && busy !== "waiting" && (
            <>
              {/* Testnet notice */}
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 flex gap-2.5">
                <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <div className="text-xs text-blue-300">
                  <p className="font-semibold mb-0.5">Testnet — No withdrawal fee</p>
                  <p className="text-blue-400/80">On mainnet, a small percentage fee will apply to early withdrawals to fund protocol operations.</p>
                </div>
              </div>

              {/* Wallet / vault info */}
              <div className="bg-muted/50 border border-border rounded-xl p-3 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-1.5"><Wallet className="w-3 h-3" /> Wallet</span>
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
                <div className="h-px bg-border" />
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Vault Balance</span>
                  <div className="flex items-center gap-1.5">
                    {loadingVaultBalance ? (
                      <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
                    ) : vaultBalance !== null ? (
                      <span className="font-semibold tabular-nums text-foreground">{vaultBalance} USDC</span>
                    ) : (
                      <button onClick={() => address && fetchVaultBalance(address)}
                        className="text-primary hover:underline flex items-center gap-1">
                        <RefreshCw className="w-3 h-3" /> Refresh
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Withdraw-all notice */}
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex gap-2.5">
                <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-300">
                  The vault contract withdraws your <strong>full balance</strong> in one transaction. Partial withdrawals are not supported on this version.
                </p>
              </div>

              {vaultBalance === "0" && (
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Info className="w-3 h-3" /> Your vault balance is currently 0 USDC
                </p>
              )}

              <Button
                onClick={handleWithdrawAll}
                disabled={isBusy || !vaultBalance || vaultBalance === "0"}
                className="w-full h-11 rounded-xl font-semibold text-sm bg-amber-600 hover:bg-amber-700 text-white shadow-lg shadow-amber-900/20"
              >
                {isBusy && busy !== "switching" ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{busy === "withdrawing" ? "Confirm in wallet…" : "Confirming withdrawal…"}</>
                ) : (
                  <>
                    <ArrowDownToLine className="w-4 h-4 mr-2" />
                    Withdraw All{vaultBalance && vaultBalance !== "0" ? ` — ${vaultBalance} USDC` : ""}
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
