import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Coins, Plus, Trash2, Users, ArrowDownToLine, ArrowUpFromLine, Wallet, Eye, RefreshCw, ExternalLink, Siren, AlertTriangle, Bell, Mail, Smartphone, MessageSquare, Hash, ChevronDown } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListAssets, useCreateAsset, useDeleteAsset, getListAssetsQueryKey,
  useListBeneficiaries, useCreateBeneficiary, useDeleteBeneficiary, getListBeneficiariesQueryKey,
  useListTrackedWallets, useCreateTrackedWallet, useUpdateTrackedWallet, useDeleteTrackedWallet, getListTrackedWalletsQueryKey,
  useListVaultDeposits,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { DepositModal } from "@/components/deposit-modal";
import { WithdrawModal } from "@/components/withdraw-modal";
import { ARC_CHAIN } from "@/lib/chain";
import { useVaultBalance } from "@/hooks/use-vault-balance";

export function TransferPage() {
  const qc = useQueryClient();
  const { data: bens } = useListBeneficiaries();
  const { data: assets } = useListAssets();
  const { data: tracked } = useListTrackedWallets();
  const { data: transactions } = useListVaultDeposits();

  const createBen = useCreateBeneficiary({ mutation: { onSuccess: () => { qc.invalidateQueries({ queryKey: getListBeneficiariesQueryKey() }); toast.success("Beneficiary added"); setBenOpen(false); } } });
  const delBen = useDeleteBeneficiary({ mutation: { onSuccess: () => qc.invalidateQueries({ queryKey: getListBeneficiariesQueryKey() }) } });
  const createAsset = useCreateAsset({ mutation: { onSuccess: () => { qc.invalidateQueries({ queryKey: getListAssetsQueryKey() }); toast.success("Asset rule added"); setAssetOpen(false); } } });
  const delAsset = useDeleteAsset({ mutation: { onSuccess: () => qc.invalidateQueries({ queryKey: getListAssetsQueryKey() }) } });
  const createTracked = useCreateTrackedWallet({ mutation: { onSuccess: () => { qc.invalidateQueries({ queryKey: getListTrackedWalletsQueryKey() }); toast.success("Wallet added to tracking"); setTrackedOpen(false); setTrackedForm({ label: "", address: "" }); }, onError: (e: any) => toast.error(e?.message ?? "Failed to add wallet") } });
  const updateTracked = useUpdateTrackedWallet({ mutation: { onSuccess: () => { qc.invalidateQueries({ queryKey: getListTrackedWalletsQueryKey() }); toast.success("Wallet updated"); }, onError: (e: any) => toast.error(e?.message ?? "Update blocked") } });
  const delTracked = useDeleteTrackedWallet({ mutation: { onSuccess: () => qc.invalidateQueries({ queryKey: getListTrackedWalletsQueryKey() }) } });

  const [benOpen, setBenOpen] = useState(false);
  const [assetOpen, setAssetOpen] = useState(false);
  const [trackedOpen, setTrackedOpen] = useState(false);
  const [showDeposit, setShowDeposit] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [editingTracked, setEditingTracked] = useState<string | null>(null);
  const [editAddress, setEditAddress] = useState("");

  const [benForm, setBenForm] = useState({ name: "", email: "", walletAddress: "", allocationPercent: "0" });
  const [assetForm, setAssetForm] = useState({ symbol: "USDC", name: "USD Coin", amount: "", beneficiaryId: "" });
  const [trackedForm, setTrackedForm] = useState({ label: "", address: "" });

  // Use the same vault balance hook as the dashboard — reads from window.ethereum directly
  const vault = useVaultBalance();

  const totalAllocation = (bens ?? []).reduce((s, b) => s + Number(b.allocationPercent || 0), 0);
  const totalAssets = (assets ?? []).length;
  const unassignedAssets = (assets ?? []).filter((a) => !a.beneficiaryId).length;
  const displayBalance = vault.balance ?? "—";

  function canEditTracked(lastUpdatedAt: string) {
    return Date.now() - new Date(lastUpdatedAt).getTime() > 30 * 24 * 60 * 60 * 1000;
  }
  function daysUntilEditable(lastUpdatedAt: string) {
    const ms = 30 * 24 * 60 * 60 * 1000 - (Date.now() - new Date(lastUpdatedAt).getTime());
    return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-10">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Coins className="w-5 h-5 text-primary" />
            </div>
            <h1 className="text-3xl font-bold">Auto Transfer</h1>
          </div>
          <p className="text-muted-foreground">Configure beneficiaries, deposit to the vault, and track external wallets.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="lg" onClick={() => setShowDeposit(true)} className="rounded-full shadow-lg shadow-primary/20">
            <ArrowDownToLine className="w-4 h-4 mr-2" /> Deposit to Vault
          </Button>
          <Button size="lg" variant="outline" onClick={() => setShowWithdraw(true)} className="rounded-full">
            <ArrowUpFromLine className="w-4 h-4 mr-2" /> Withdraw
          </Button>
        </div>
      </motion.div>

      <div className="grid sm:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Vault Balance</p>
            <button
              onClick={vault.refresh}
              disabled={vault.loading || !vault.address || !vault.onArc}
              className="p-1 rounded-lg hover:bg-muted transition-colors disabled:opacity-40"
              title="Refresh balance"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-muted-foreground ${vault.loading ? "animate-spin" : ""}`} />
            </button>
          </div>
          <p className="text-2xl font-bold mt-1">
            {vault.loading && vault.balance === null ? (
              <span className="text-muted-foreground text-base animate-pulse">Loading…</span>
            ) : (
              <>{displayBalance} <span className="text-sm font-normal text-muted-foreground">USDC</span></>
            )}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {vault.address ? (vault.onArc ? "Live · Arc Testnet" : "Switch to Arc Testnet") : "Connect a wallet to see balance"} · {(transactions ?? []).length} tx
          </p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Allocation</p>
          <p className={`text-2xl font-bold mt-1 ${totalAllocation === 100 ? "text-emerald-500" : totalAllocation > 100 ? "text-destructive" : "text-amber-500"}`}>{totalAllocation}%</p>
          <div className="w-full h-1.5 bg-muted rounded-full mt-2 overflow-hidden">
            <div className={`h-full ${totalAllocation === 100 ? "bg-emerald-500" : totalAllocation > 100 ? "bg-destructive" : "bg-amber-500"}`} style={{ width: `${Math.min(100, totalAllocation)}%` }} />
          </div>
        </div>
        <div className="bg-card border border-border rounded-2xl p-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Asset Rules</p>
          <p className="text-2xl font-bold mt-1">{totalAssets}</p>
          <p className={`text-xs mt-1 ${unassignedAssets === 0 ? "text-emerald-500" : "text-amber-500"}`}>{unassignedAssets === 0 ? "All routed" : `${unassignedAssets} unassigned`}</p>
        </div>
      </div>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold flex items-center gap-2"><Users className="w-5 h-5" /> Beneficiaries</h2>
          <Button size="sm" onClick={() => setBenOpen(!benOpen)} className="rounded-full"><Plus className="w-4 h-4 mr-1" /> Add</Button>
        </div>
        {benOpen && (
          <form onSubmit={(e) => { e.preventDefault(); createBen.mutate({ data: benForm }); }}
            className="bg-card border border-border rounded-2xl p-6 mb-4 grid sm:grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Name</Label><Input required value={benForm.name} onChange={(e) => setBenForm({ ...benForm, name: e.target.value })} /></div>
            <div className="space-y-2"><Label>Email</Label><Input required type="email" value={benForm.email} onChange={(e) => setBenForm({ ...benForm, email: e.target.value })} /></div>
            <div className="space-y-2"><Label>Wallet</Label><Input value={benForm.walletAddress} onChange={(e) => setBenForm({ ...benForm, walletAddress: e.target.value })} placeholder="0x..." /></div>
            <div className="space-y-2"><Label>Allocation %</Label><Input type="number" min="0" max="100" value={benForm.allocationPercent} onChange={(e) => setBenForm({ ...benForm, allocationPercent: e.target.value })} /></div>
            <div className="sm:col-span-2 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setBenOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createBen.isPending}>Save</Button>
            </div>
          </form>
        )}
        <div className="bg-card border border-border rounded-2xl divide-y divide-border">
          {(bens ?? []).length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">No beneficiaries yet.</div>
          ) : (bens ?? []).map((b) => (
            <div key={b.id} className="flex items-center gap-4 p-4">
              <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-sm">{b.name[0]?.toUpperCase()}</div>
              <div className="flex-1 min-w-0">
                <p className="font-medium">{b.name}</p>
                <p className="text-xs text-muted-foreground">{b.email} · {b.allocationPercent}%</p>
              </div>
              <button onClick={() => delBen.mutate({ id: b.id })} className="text-muted-foreground hover:text-destructive p-1.5"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold flex items-center gap-2"><Coins className="w-5 h-5" /> Asset Rules</h2>
          <Button size="sm" onClick={() => setAssetOpen(!assetOpen)} className="rounded-full"><Plus className="w-4 h-4 mr-1" /> Add</Button>
        </div>
        {assetOpen && (
          <form onSubmit={(e) => { e.preventDefault(); createAsset.mutate({ data: { ...assetForm, valueUsd: "0", beneficiaryId: assetForm.beneficiaryId || undefined } as any }); }}
            className="bg-card border border-border rounded-2xl p-6 mb-4 grid sm:grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Symbol</Label><Input required value={assetForm.symbol} onChange={(e) => setAssetForm({ ...assetForm, symbol: e.target.value.toUpperCase() })} placeholder="USDC" /></div>
            <div className="space-y-2"><Label>Name</Label><Input required value={assetForm.name} onChange={(e) => setAssetForm({ ...assetForm, name: e.target.value })} placeholder="USD Coin" /></div>
            <div className="space-y-2"><Label>Amount</Label><Input required type="number" step="any" value={assetForm.amount} onChange={(e) => setAssetForm({ ...assetForm, amount: e.target.value })} /></div>
            <div className="space-y-2">
              <Label>Beneficiary</Label>
              <select className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                value={assetForm.beneficiaryId} onChange={(e) => setAssetForm({ ...assetForm, beneficiaryId: e.target.value })}>
                <option value="">— None —</option>
                {(bens ?? []).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setAssetOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createAsset.isPending}>Save</Button>
            </div>
          </form>
        )}
        <div className="bg-card border border-border rounded-2xl divide-y divide-border">
          {(assets ?? []).length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">No transfer rules yet.</div>
          ) : (assets ?? []).map((a) => (
            <div key={a.id} className="flex items-center gap-4 p-4">
              <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">{a.symbol.slice(0, 3)}</div>
              <div className="flex-1 min-w-0">
                <p className="font-medium">{a.amount} {a.symbol}</p>
                <p className="text-xs text-muted-foreground">{a.beneficiaryName ? `to ${a.beneficiaryName}` : "Unassigned"}</p>
              </div>
              <button onClick={() => delAsset.mutate({ id: a.id })} className="text-muted-foreground hover:text-destructive p-1.5"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-bold flex items-center gap-2"><Eye className="w-5 h-5" /> Tracked Wallets</h2>
          <Button size="sm" onClick={() => setTrackedOpen(!trackedOpen)} disabled={(tracked ?? []).length >= 3} className="rounded-full">
            <Plus className="w-4 h-4 mr-1" /> Add ({(tracked ?? []).length}/3)
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Add up to 3 extra wallet addresses to monitor for activity. Each address can be changed once every 30 days.
        </p>
        {trackedOpen && (
          <form onSubmit={(e) => { e.preventDefault(); createTracked.mutate({ data: trackedForm }); }}
            className="bg-card border border-border rounded-2xl p-6 mb-4 grid sm:grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Label (optional)</Label><Input value={trackedForm.label} onChange={(e) => setTrackedForm({ ...trackedForm, label: e.target.value })} placeholder="Cold storage" /></div>
            <div className="space-y-2"><Label>Address</Label><Input required value={trackedForm.address} onChange={(e) => setTrackedForm({ ...trackedForm, address: e.target.value })} placeholder="0x..." className="font-mono text-xs" /></div>
            <div className="sm:col-span-2 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setTrackedOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createTracked.isPending}>Add Wallet</Button>
            </div>
          </form>
        )}
        <div className="bg-card border border-border rounded-2xl divide-y divide-border">
          {(tracked ?? []).length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">No tracked wallets yet.</div>
          ) : (tracked ?? []).map((w) => {
            const editable = canEditTracked(w.lastUpdatedAt);
            const isEditing = editingTracked === w.id;
            return (
              <div key={w.id} className="flex items-center gap-4 p-4">
                <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center"><Wallet className="w-4 h-4" /></div>
                <div className="flex-1 min-w-0">
                  {isEditing ? (
                    <div className="flex gap-2">
                      <Input value={editAddress} onChange={(e) => setEditAddress(e.target.value)} className="font-mono text-xs h-8" />
                      <Button size="sm" className="h-8" onClick={() => { updateTracked.mutate({ id: w.id, data: { address: editAddress } }); setEditingTracked(null); }}>Save</Button>
                      <Button size="sm" variant="outline" className="h-8" onClick={() => setEditingTracked(null)}>Cancel</Button>
                    </div>
                  ) : (
                    <>
                      <p className="font-medium text-sm">{w.label || "Untitled wallet"}</p>
                      <p className="text-xs text-muted-foreground font-mono truncate">{w.address}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {editable ? "Editable now" : `Locked — editable in ${daysUntilEditable(w.lastUpdatedAt)}d`}
                      </p>
                    </>
                  )}
                </div>
                {!isEditing && (
                  <div className="flex items-center gap-1">
                    <button disabled={!editable} onClick={() => { setEditingTracked(w.id); setEditAddress(w.address); }}
                      className="p-1.5 text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed">
                      <RefreshCw className="w-4 h-4" />
                    </button>
                    <button onClick={() => delTracked.mutate({ id: w.id })} className="text-muted-foreground hover:text-destructive p-1.5">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {(transactions ?? []).length > 0 && (
        <section>
          <h2 className="text-xl font-bold flex items-center gap-2 mb-4"><ArrowDownToLine className="w-5 h-5" /> Recent Transactions</h2>
          <div className="bg-card border border-border rounded-2xl divide-y divide-border">
            {(transactions ?? []).slice(0, 8).map((tx) => {
              const isWithdraw = tx.status === "withdraw";
              return (
                <div key={tx.id} className="flex items-center gap-4 p-4">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center ${isWithdraw ? "bg-amber-500/10 text-amber-500" : "bg-emerald-500/10 text-emerald-500"}`}>
                    {isWithdraw ? <ArrowUpFromLine className="w-4 h-4" /> : <ArrowDownToLine className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{isWithdraw ? "−" : "+"}{tx.amount} {tx.token}</p>
                    <p className="text-xs text-muted-foreground">{isWithdraw ? "Withdrawal" : "Deposit"} · {new Date(tx.createdAt).toLocaleString()}</p>
                  </div>
                  <a href={`${ARC_CHAIN.explorer}/tx/${tx.txHash}`} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline inline-flex items-center gap-1">
                    Tx <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section>
        <BatchTransferTimeline inactivityDays={90} />
      </section>

      <AnimatePresence>{showDeposit && <DepositModal onClose={() => { setShowDeposit(false); vault.refresh(); }} />}</AnimatePresence>
      <AnimatePresence>{showWithdraw && <WithdrawModal onClose={() => { setShowWithdraw(false); vault.refresh(); }} />}</AnimatePresence>
    </div>
  );
}

const BATCH_STAGES = [
  {
    percent: 25, label: "Batch 1 — 25% of assets",
    warning: "Initial warning sent across email, WhatsApp, Telegram, and Discord to you and all guardians.",
    panicWindow: "72-hour panic window",
    channels: ["email", "whatsapp", "telegram", "discord"],
    bg: "bg-amber-500/8 border-amber-500/40", dot: "bg-amber-400",
    labelColor: "text-amber-500",
  },
  {
    percent: 50, label: "Batch 2 — 50% of assets",
    warning: "Second escalation sent. Guardian voting period begins — required approvals must be met.",
    panicWindow: "48-hour panic window",
    channels: ["email", "whatsapp", "telegram", "discord"],
    bg: "bg-orange-500/8 border-orange-500/40", dot: "bg-orange-400",
    labelColor: "text-orange-500",
  },
  {
    percent: 75, label: "Batch 3 — 75% of assets",
    warning: "Final warning on all channels. Guardians must provide final confirmation before execution.",
    panicWindow: "24-hour panic window",
    channels: ["email", "whatsapp", "telegram", "discord"],
    bg: "bg-red-500/8 border-red-500/40", dot: "bg-red-500",
    labelColor: "text-red-500",
  },
  {
    percent: 100, label: "Batch 4 — 100% transfer complete",
    warning: "All assets transferred. Recovery package sent to guardians. System archived.",
    panicWindow: "No abort available",
    channels: [],
    bg: "bg-red-900/10 border-red-900/40", dot: "bg-red-800",
    labelColor: "text-red-700 dark:text-red-400",
  },
];

const CHANNEL_ICONS: Record<string, any> = { email: Mail, whatsapp: Smartphone, telegram: MessageSquare, discord: Hash };
const CHANNEL_COLORS: Record<string, string> = { email: "text-blue-500", whatsapp: "text-emerald-500", telegram: "text-sky-500", discord: "text-indigo-500" };
const CHANNEL_LABELS: Record<string, string> = { email: "Email", whatsapp: "WhatsApp", telegram: "Telegram", discord: "Discord" };

function BatchTransferTimeline({ inactivityDays }: { inactivityDays: number }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Siren className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="font-bold text-sm">Batch Transfer Warning System</p>
            <p className="text-xs text-muted-foreground">4 batches · warnings sent at each stage · panic button always available</p>
          </div>
        </div>
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform flex-shrink-0 ${open ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-border"
          >
            <div className="p-5 space-y-4">
              <div className="flex items-start gap-2 text-sm text-muted-foreground bg-muted/50 rounded-xl px-4 py-3">
                <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <p>
                  Once the {inactivityDays}-day inactivity window closes, assets transfer in 4 batches over several days.
                  A <span className="font-semibold text-foreground">Panic Reset</span> button appears on your dashboard the moment any batch is triggered — press it to abort instantly.
                </p>
              </div>

              <div className="space-y-3 relative">
                <div className="absolute left-4 top-5 bottom-5 w-px bg-border/60" />

                {BATCH_STAGES.map((stage, i) => (
                  <div key={i} className={`relative ml-10 border ${stage.bg} rounded-xl p-4`}>
                    <div className={`absolute -left-6 top-4 w-3 h-3 rounded-full border-2 border-background ${stage.dot}`} />
                    <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
                      <p className={`font-semibold text-sm ${stage.labelColor}`}>{stage.label}</p>
                      <span className="text-[10px] font-mono border border-current opacity-70 px-2 py-0.5 rounded text-muted-foreground whitespace-nowrap">
                        {stage.panicWindow}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">{stage.warning}</p>
                    {stage.channels.length > 0 && (
                      <div className="flex items-center gap-2 flex-wrap mt-1">
                        <Bell className="w-3 h-3 text-muted-foreground" />
                        {stage.channels.map((ch) => {
                          const Icon = CHANNEL_ICONS[ch];
                          return (
                            <span key={ch} className={`inline-flex items-center gap-1 text-[10px] font-medium ${CHANNEL_COLORS[ch]} bg-current/5 px-1.5 py-0.5 rounded`}>
                              <Icon className="w-2.5 h-2.5" /> {CHANNEL_LABELS[ch]}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="rounded-xl bg-primary/5 border border-primary/20 p-3.5 flex items-start gap-2.5">
                <Siren className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                <div className="text-xs text-muted-foreground">
                  <p className="font-semibold text-foreground mb-0.5">Panic Button — always accessible</p>
                  Log into your dashboard at any point during the batch sequence and press <span className="font-semibold">Panic Reset</span> to immediately abort all transfers, notify your guardians, and restore your system to active status.
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
