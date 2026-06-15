import { useState } from "react";
import { motion } from "framer-motion";
import {
  Shield, UserPlus, Trash2, Mail, Wallet, Users,
  MessageSquare, Smartphone, Hash, ChevronRight, CheckCircle2, Pencil,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListGuardians, useCreateGuardian, useUpdateGuardian, useDeleteGuardian, getListGuardiansQueryKey,
  useListBeneficiaries, useCreateBeneficiary, useUpdateBeneficiary, useDeleteBeneficiary, getListBeneficiariesQueryKey,
  useGetInactivitySettings,
  type Guardian, type Beneficiary,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Link } from "wouter";
import { toast } from "sonner";

export function GuardiansPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"guardians" | "beneficiaries">("guardians");

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="text-2xl sm:text-4xl font-bold tracking-tight">Trust Network</h1>
        <p className="text-muted-foreground mt-1 text-sm sm:text-base">
          Manage your guardians and beneficiaries. Guardians are notified via email, WhatsApp, and Telegram when the protocol triggers.
        </p>
      </motion.div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList className="bg-muted/60 rounded-full p-1 h-auto">
          <TabsTrigger value="guardians" className="rounded-full px-5 sm:px-6 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-sm">
            Guardians
          </TabsTrigger>
          <TabsTrigger value="beneficiaries" className="rounded-full px-5 sm:px-6 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-sm">
            Beneficiaries
          </TabsTrigger>
        </TabsList>

        <TabsContent value="guardians" className="mt-8">
          <GuardiansTab qc={qc} />
        </TabsContent>
        <TabsContent value="beneficiaries" className="mt-8">
          <BeneficiariesTab qc={qc} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

const EMPTY_GUARDIAN = { name: "", email: "", walletAddress: "", whatsapp: "", telegram: "", discord: "" };

function GuardiansTab({ qc }: { qc: ReturnType<typeof useQueryClient> }) {
  const { data: guardians = [], isLoading } = useListGuardians();
  const { data: settings } = useGetInactivitySettings();
  const create = useCreateGuardian({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListGuardiansQueryKey() });
        toast.success("Guardian added successfully");
        closeDialog();
      },
      onError: () => toast.error("Failed to add guardian"),
    },
  });
  const update = useUpdateGuardian({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListGuardiansQueryKey() });
        toast.success("Guardian updated");
        closeDialog();
      },
      onError: () => toast.error("Failed to update guardian"),
    },
  });
  const del = useDeleteGuardian({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListGuardiansQueryKey() });
        toast.success("Guardian removed");
      },
      onError: () => toast.error("Failed to remove guardian"),
    },
  });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_GUARDIAN);
  const [editingGuardian, setEditingGuardian] = useState<Guardian | null>(null);

  function openAdd() { setEditingGuardian(null); setForm(EMPTY_GUARDIAN); setOpen(true); }
  function openEdit(g: Guardian) {
    setEditingGuardian(g);
    setForm({ name: g.name, email: g.email, walletAddress: g.walletAddress ?? "", whatsapp: g.phone ?? "", telegram: g.telegramUsername ?? "", discord: "" });
    setOpen(true);
  }
  function closeDialog() { setOpen(false); setForm(EMPTY_GUARDIAN); setEditingGuardian(null); }

  const total = guardians.length;
  const required = settings?.requiredApprovals ?? 2;
  const totalTarget = required >= 3 ? 5 : 3;
  const quorumMet = total >= totalTarget;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold">Guardians</h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-md">
            Trusted individuals who can unlock your recovery package or authorize execution.
            They receive warnings via email, WhatsApp, and Telegram.
          </p>
        </div>
        <Button onClick={openAdd} className="rounded-full">
          <UserPlus className="w-4 h-4 mr-1.5" /> Add Guardian
        </Button>
      </div>

      {/* Voting Threshold display */}
      <div className="bg-accent/40 border border-primary/20 rounded-2xl p-5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 mb-3 w-full">
            <Shield className="w-4 h-4 text-primary" />
            <h3 className="font-semibold">Voting Threshold</h3>
            <Link href="/security">
              <span className="ml-auto text-xs text-primary hover:underline flex items-center gap-0.5 cursor-pointer">
                Change <ChevronRight className="w-3 h-3" />
              </span>
            </Link>
          </div>
          <div className="flex items-center gap-5 w-full flex-wrap">
            <div className="flex items-baseline gap-1.5">
              <span className="text-4xl font-extrabold text-primary">{required}</span>
              <span className="text-lg text-muted-foreground font-medium">of {totalTarget}</span>
            </div>
            <div className="flex-1 min-w-[140px]">
              <p className="text-sm font-semibold text-foreground mb-2">
                {required} required out of {totalTarget} guardians
              </p>
              <div className="flex gap-1.5">
                {Array.from({ length: totalTarget }).map((_, i) => (
                  <div
                    key={i}
                    className={`h-2 flex-1 rounded-full transition-colors ${
                      i < total ? "bg-primary" : "bg-muted"
                    }`}
                  />
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1.5">
                {total} of {totalTarget} guardians added
                {!quorumMet && ` — add ${totalTarget - total} more to reach quorum`}
                {quorumMet && <span className="text-emerald-500 ml-1">· Quorum target met</span>}
              </p>
            </div>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center text-muted-foreground py-12">Loading...</div>
      ) : guardians.length === 0 ? (
        <div className="text-center py-16 bg-card border border-dashed border-border rounded-2xl">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Users className="w-6 h-6 text-primary/50" />
          </div>
          <p className="font-semibold text-foreground mb-1">No guardians yet</p>
          <p className="text-sm text-muted-foreground mb-4">Add trusted contacts who can approve recovery on your behalf.</p>
          <Button onClick={openAdd} variant="outline" className="rounded-full">
            <UserPlus className="w-4 h-4 mr-1.5" /> Add your first guardian
          </Button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {guardians.map((g) => (
            <GuardianCard
              key={g.id}
              name={g.name}
              email={g.email}
              wallet={g.walletAddress}
              phone={g.phone}
              telegram={g.telegramUsername ?? ""}
              status={g.status}
              onEdit={() => openEdit(g)}
              onDelete={() => del.mutate({ id: g.id })}
            />
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={(v) => { if (!v) closeDialog(); }}>
        <DialogContent className="max-w-lg w-full">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editingGuardian
                ? <><Pencil className="w-5 h-5 text-primary" /> Edit Guardian</>
                : <><UserPlus className="w-5 h-5 text-primary" /> Add Guardian</>}
            </DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!form.name.trim() || !form.email.trim()) return;
              if (editingGuardian) {
                update.mutate({
                  id: editingGuardian.id,
                  data: {
                    name: form.name.trim(),
                    email: form.email.trim(),
                    walletAddress: form.walletAddress.trim() || undefined,
                    phone: form.whatsapp.trim() || undefined,
                    telegramUsername: form.telegram.trim() || undefined,
                  },
                });
              } else {
                create.mutate({
                  data: {
                    name: form.name.trim(),
                    email: form.email.trim(),
                    walletAddress: form.walletAddress.trim() || undefined,
                    phone: form.whatsapp.trim() || undefined,
                    telegramUsername: form.telegram.trim() || undefined,
                  },
                });
              }
            }}
            className="space-y-5 mt-1"
          >
            {/* Identity */}
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Identity</p>
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Full Name <span className="text-red-400">*</span></Label>
                  <Input
                    required
                    placeholder="Jane Smith"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email Address <span className="text-red-400">*</span></Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input
                      required
                      type="email"
                      className="pl-8"
                      placeholder="jane@example.com"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Wallet */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Wallet</p>
              <Label className="flex items-center gap-1.5 font-normal">
                <Wallet className="w-3.5 h-3.5 text-muted-foreground" /> Wallet Address
                <span className="text-[10px] text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Input
                value={form.walletAddress}
                onChange={(e) => setForm({ ...form, walletAddress: e.target.value })}
                placeholder="0x..."
                className="font-mono text-sm"
              />
            </div>

            {/* Notification channels */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Notification Channels</p>
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5 font-normal">
                    <Smartphone className="w-3.5 h-3.5 text-emerald-500" /> WhatsApp
                  </Label>
                  <Input
                    type="tel"
                    placeholder="+1 555 000 0000"
                    value={form.whatsapp}
                    onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5 font-normal">
                    <MessageSquare className="w-3.5 h-3.5 text-sky-500" /> Telegram
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm select-none">@</span>
                    <Input
                      className="pl-7"
                      placeholder="telegram_handle"
                      value={form.telegram.replace(/^@/, "")}
                      onChange={(e) => setForm({ ...form, telegram: e.target.value.replace(/^@/, "") })}
                    />
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={closeDialog}>
                Cancel
              </Button>
              <Button type="submit" disabled={create.isPending || update.isPending}>
                {editingGuardian
                  ? (update.isPending ? "Saving..." : "Save Changes")
                  : (create.isPending ? "Adding..." : "Add Guardian")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const EMPTY_BEN = { name: "", email: "", walletAddress: "", whatsapp: "", allocationPercent: "" };

function BeneficiariesTab({ qc }: { qc: ReturnType<typeof useQueryClient> }) {
  const { data: beneficiaries = [], isLoading } = useListBeneficiaries();
  const create = useCreateBeneficiary({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListBeneficiariesQueryKey() });
        toast.success("Beneficiary added successfully");
        closeDialog();
      },
      onError: () => toast.error("Failed to add beneficiary"),
    },
  });
  const update = useUpdateBeneficiary({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListBeneficiariesQueryKey() });
        toast.success("Beneficiary updated");
        closeDialog();
      },
      onError: () => toast.error("Failed to update beneficiary"),
    },
  });
  const del = useDeleteBeneficiary({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListBeneficiariesQueryKey() });
        toast.success("Beneficiary removed");
      },
      onError: () => toast.error("Failed to remove beneficiary"),
    },
  });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_BEN);
  const [editingBeneficiary, setEditingBeneficiary] = useState<Beneficiary | null>(null);

  function openAdd() { setEditingBeneficiary(null); setForm(EMPTY_BEN); setOpen(true); }
  function openEdit(b: Beneficiary) {
    setEditingBeneficiary(b);
    setForm({ name: b.name, email: b.email, walletAddress: b.walletAddress ?? "", whatsapp: b.phone ?? "", allocationPercent: b.allocationPercent });
    setOpen(true);
  }
  function closeDialog() { setOpen(false); setForm(EMPTY_BEN); setEditingBeneficiary(null); }
  const totalAllocation = beneficiaries.reduce((s, b) => s + Number(b.allocationPercent || 0), 0);
  const allocationOk = totalAllocation === 100;
  const remaining = 100 - totalAllocation;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold">Beneficiaries</h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-md">
            People or wallets that receive your assets when the protocol triggers. Total allocation must equal 100%.
          </p>
        </div>
        <Button onClick={openAdd} className="rounded-full">
          <UserPlus className="w-4 h-4 mr-1.5" /> Add Beneficiary
        </Button>
      </div>

      {/* Allocation bar */}
      <div className="bg-accent/40 border border-primary/20 rounded-2xl p-5">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <p className="font-semibold">Total Allocation</p>
            <p className="text-xs text-muted-foreground">Distribute 100% across all beneficiaries.</p>
          </div>
          <p className={`text-3xl font-bold ${allocationOk ? "text-emerald-500" : totalAllocation > 100 ? "text-red-400" : "text-amber-500"}`}>
            {totalAllocation}%
          </p>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${allocationOk ? "bg-emerald-500" : totalAllocation > 100 ? "bg-red-400" : "bg-primary"}`}
            style={{ width: `${Math.min(totalAllocation, 100)}%` }}
          />
        </div>
        {!allocationOk && beneficiaries.length > 0 && (
          <p className="text-xs text-amber-500 mt-2">
            {totalAllocation > 100
              ? `Over-allocated by ${totalAllocation - 100}%. Reduce some percentages.`
              : `${remaining}% remaining to allocate.`
            }
          </p>
        )}
        {allocationOk && beneficiaries.length > 0 && (
          <p className="text-xs text-emerald-500 mt-2 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Fully allocated
          </p>
        )}
      </div>

      {isLoading ? (
        <div className="text-center text-muted-foreground py-12">Loading...</div>
      ) : beneficiaries.length === 0 ? (
        <div className="text-center py-16 bg-card border border-dashed border-border rounded-2xl">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Users className="w-6 h-6 text-primary/50" />
          </div>
          <p className="font-semibold text-foreground mb-1">No beneficiaries yet</p>
          <p className="text-sm text-muted-foreground mb-4">Add the people or wallets that should receive your assets.</p>
          <Button onClick={openAdd} variant="outline" className="rounded-full">
            <UserPlus className="w-4 h-4 mr-1.5" /> Add your first beneficiary
          </Button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {beneficiaries.map((b) => (
            <PersonCard
              key={b.id}
              name={b.name}
              email={b.email}
              wallet={b.walletAddress}
              status={`${b.allocationPercent}%`}
              statusTone="primary"
              onEdit={() => openEdit(b)}
              onDelete={() => del.mutate({ id: b.id })}
            />
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={(v) => { if (!v) closeDialog(); }}>
        <DialogContent className="max-w-lg w-full">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editingBeneficiary
                ? <><Pencil className="w-5 h-5 text-primary" /> Edit Beneficiary</>
                : <><UserPlus className="w-5 h-5 text-primary" /> Add Beneficiary</>}
            </DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!form.name.trim() || !form.email.trim()) return;
              const pct = Number(form.allocationPercent);
              if (isNaN(pct) || pct <= 0 || pct > 100) {
                toast.error("Allocation must be between 1 and 100");
                return;
              }
              if (editingBeneficiary) {
                update.mutate({
                  id: editingBeneficiary.id,
                  data: {
                    name: form.name.trim(),
                    email: form.email.trim(),
                    walletAddress: form.walletAddress.trim() || undefined,
                    phone: form.whatsapp.trim() || undefined,
                    allocationPercent: form.allocationPercent,
                  },
                });
              } else {
                create.mutate({
                  data: {
                    name: form.name.trim(),
                    email: form.email.trim(),
                    walletAddress: form.walletAddress.trim(),
                    phone: form.whatsapp.trim() || undefined,
                    allocationPercent: form.allocationPercent,
                  },
                });
              }
            }}
            className="space-y-5 mt-1"
          >
            {/* Identity */}
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Identity</p>
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Full Name <span className="text-red-400">*</span></Label>
                  <Input
                    required
                    placeholder="John Smith"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Allocation <span className="text-red-400">*</span></Label>
                  <div className="relative">
                    <Input
                      required
                      type="number"
                      min={1}
                      max={100}
                      placeholder={remaining > 0 ? `Up to ${remaining}%` : "0"}
                      value={form.allocationPercent}
                      onChange={(e) => setForm({ ...form, allocationPercent: e.target.value })}
                      className="pr-8"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Contact</p>
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5 font-normal">
                  <Mail className="w-3.5 h-3.5" /> Email Address <span className="text-red-400">*</span>
                </Label>
                <Input
                  required
                  type="email"
                  placeholder="john@example.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5 font-normal">
                  <Wallet className="w-3.5 h-3.5" /> Wallet Address <span className="text-red-400">*</span>
                </Label>
                <Input
                  required
                  placeholder="0x..."
                  className="font-mono text-sm"
                  value={form.walletAddress}
                  onChange={(e) => setForm({ ...form, walletAddress: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">The wallet that will receive the allocated assets.</p>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5 font-normal">
                  <Smartphone className="w-3.5 h-3.5 text-emerald-500" /> WhatsApp
                  <span className="text-[10px] text-muted-foreground">(optional)</span>
                </Label>
                <Input
                  type="tel"
                  placeholder="+1 555 000 0000"
                  value={form.whatsapp}
                  onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={closeDialog}>
                Cancel
              </Button>
              <Button type="submit" disabled={create.isPending || update.isPending}>
                {editingBeneficiary
                  ? (update.isPending ? "Saving..." : "Save Changes")
                  : (create.isPending ? "Adding..." : "Add Beneficiary")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function GuardianCard({
  name, email, wallet, phone, telegram, status, onEdit, onDelete,
}: {
  name: string; email: string; wallet: string | null; phone: string | null; telegram: string; status: string; onEdit: () => void; onDelete: () => void;
}) {
  const isConfirmed = status === "active" || status === "confirmed";
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-2xl p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-base flex-shrink-0">
            {name[0]?.toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="font-semibold truncate">{name}</p>
            <p className={`text-xs flex items-center gap-1.5 mt-0.5 ${isConfirmed ? "text-emerald-500" : "text-amber-500"}`}>
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isConfirmed ? "bg-emerald-500" : "bg-amber-500"}`} />
              {isConfirmed ? "Confirmed" : status.charAt(0).toUpperCase() + status.slice(1)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={onEdit}
            className="text-muted-foreground hover:text-primary p-1.5 rounded-lg hover:bg-primary/10 transition-colors"
            aria-label="Edit guardian"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onDelete}
            className="text-muted-foreground hover:text-destructive p-1.5 rounded-lg hover:bg-destructive/10 transition-colors"
            aria-label="Remove guardian"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="bg-muted/50 rounded-xl p-3 space-y-1.5 text-xs">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Mail className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="truncate">{email}</span>
        </div>
        {wallet && (
          <div className="flex items-center gap-2 text-muted-foreground font-mono">
            <Wallet className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">{wallet.length > 16 ? `${wallet.slice(0, 6)}...${wallet.slice(-4)}` : wallet}</span>
          </div>
        )}
        {phone && (
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
            <Smartphone className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{phone}</span>
          </div>
        )}
        {telegram && (
          <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400">
            <MessageSquare className="w-3.5 h-3.5 flex-shrink-0" />
            <span>@{telegram}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function PersonCard({
  name, email, wallet, status, statusTone = "auto", onEdit, onDelete,
}: {
  name: string; email: string; wallet: string | null;
  status: string; statusTone?: "auto" | "primary"; onEdit: () => void; onDelete: () => void;
}) {
  const isPrimary = statusTone === "primary";
  const isConfirmed = status === "active" || status === "confirmed";
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-2xl p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-base flex-shrink-0">
            {name[0]?.toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="font-semibold truncate">{name}</p>
            <p className={`text-xs flex items-center gap-1.5 mt-0.5 ${isPrimary ? "text-primary" : isConfirmed ? "text-emerald-500" : "text-amber-500"}`}>
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isPrimary ? "bg-primary" : isConfirmed ? "bg-emerald-500" : "bg-amber-500"}`} />
              {isPrimary ? status : (isConfirmed ? "Confirmed" : status.charAt(0).toUpperCase() + status.slice(1))}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={onEdit}
            className="text-muted-foreground hover:text-primary p-1.5 rounded-lg hover:bg-primary/10 transition-colors"
            aria-label="Edit beneficiary"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onDelete}
            className="text-muted-foreground hover:text-destructive p-1.5 rounded-lg hover:bg-destructive/10 transition-colors"
            aria-label="Remove beneficiary"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="bg-muted/50 rounded-xl p-3 space-y-1.5 text-xs">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Mail className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="truncate">{email}</span>
        </div>
        {wallet && (
          <div className="flex items-center gap-2 text-muted-foreground font-mono">
            <Wallet className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">{wallet.length > 16 ? `${wallet.slice(0, 6)}...${wallet.slice(-4)}` : wallet}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
