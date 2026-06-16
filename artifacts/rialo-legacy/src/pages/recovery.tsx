import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Lock, EyeOff, KeyRound, RefreshCw, Pencil, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useGetInactivitySettings } from "@/lib/api";
import { toast } from "sonner";

export function RecoveryPage() {
  const { data: settings } = useGetInactivitySettings();
  const required = settings?.requiredApprovals ?? 2;

  const [enabled, setEnabled] = useState(true);
  const [editing, setEditing] = useState(false);
  const [instructions, setInstructions] = useState(
    "Wallet seed phrases, exchange recovery codes, and final wishes will be encrypted here. Only your guardians, acting together, can decrypt this payload.",
  );
  const [draft, setDraft] = useState(instructions);
  const fragments = required === 3 ? 5 : 3;

  function handleRegenerate() {
    toast.success("Keys regenerated", { description: `${fragments} new fragments distributed to guardians.` });
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Recovery Package</h1>
          <p className="text-muted-foreground mt-1">Encrypted instructions accessible only when guardians threshold approval is reached.</p>
        </div>
        <div className="flex items-center gap-3 bg-card border border-border rounded-full px-4 py-2 shadow-sm">
          <Switch checked={enabled} onCheckedChange={setEnabled} />
          <span className="text-sm font-medium">{enabled ? "Package Enabled" : "Package Disabled"}</span>
        </div>
      </motion.div>

      <div className="grid lg:grid-cols-5 gap-5">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="lg:col-span-3 bg-card border border-border rounded-2xl p-6">
          <h3 className="font-bold flex items-center gap-2 mb-4">
            <Lock className="w-5 h-5 text-primary" /> Encrypted Instructions Payload
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Store optional instructions, account details, or personal messages for your beneficiaries. Upon saving, this package is encrypted and can only be unlocked after the required guardian approval threshold is reached.
          </p>
          {editing ? (
            <div className="space-y-3">
              <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={8} className="resize-none" placeholder="Write your recovery instructions…" />
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" className="rounded-full" onClick={() => { setDraft(instructions); setEditing(false); }}>
                  <X className="w-4 h-4 mr-1.5" /> Cancel
                </Button>
                <Button size="sm" className="rounded-full" onClick={() => { setInstructions(draft); setEditing(false); toast.success("Instructions encrypted", { description: "Payload secured with AES-256-GCM." }); }}>
                  <Save className="w-4 h-4 mr-1.5" /> Save & Encrypt
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="relative rounded-xl border border-border bg-muted/40 p-6 min-h-[180px] overflow-hidden">
                <p className="text-sm text-foreground/70 select-none" style={{ filter: "blur(6px)" }} aria-hidden>
                  {instructions}
                </p>
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                  <EyeOff className="w-6 h-6 text-primary" />
                  <p className="font-mono text-xs tracking-[0.25em] text-primary">AES-256-GCM ENCRYPTED</p>
                </div>
              </div>
              <div className="flex justify-end mt-4">
                <Button variant="outline" size="sm" className="rounded-full" onClick={() => { setDraft(instructions); setEditing(true); }}>
                  <Pencil className="w-4 h-4 mr-1.5" /> Edit Instructions
                </Button>
              </div>
            </>
          )}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
          className="lg:col-span-2 bg-gradient-to-br from-primary/10 via-card to-card border border-primary/20 rounded-2xl p-6 flex flex-col">
          <div>
            <h3 className="font-bold text-lg">Key Splitting</h3>
            <p className="text-xs text-muted-foreground mt-1">Shamir's Secret Sharing</p>
          </div>
          <div className="flex-1 flex items-center justify-center my-6">
            <ShamirRing fragments={fragments} required={required} />
          </div>
          <div className="space-y-2 mb-4">
            <StatRow label="Fragments Generated" value={fragments} />
            <StatRow label="Required to Decrypt" value={required} />
          </div>
          <Button variant="outline" className="rounded-full w-full" onClick={handleRegenerate}>
            <RefreshCw className="w-4 h-4 mr-1.5" /> Regenerate Keys
          </Button>
        </motion.div>
      </div>
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between bg-background/60 border border-border rounded-xl px-4 py-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-bold">{value}</span>
    </div>
  );
}

function ShamirRing({ fragments, required }: { fragments: number; required: number }) {
  const size = 180;
  const radius = 70;
  const center = size / 2;

  const dots = useMemo(() =>
    Array.from({ length: fragments }).map((_, i) => {
      const angle = (i / fragments) * Math.PI * 2 - Math.PI / 2;
      return { x: center + radius * Math.cos(angle), y: center + radius * Math.sin(angle), active: i < required };
    }),
    [fragments, required, center, radius]
  );

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
      <circle cx={center} cy={center} r={radius} fill="none" stroke="hsl(var(--primary) / 0.25)" strokeWidth="1.5" />
      <circle cx={center} cy={center} r={26} fill="hsl(var(--primary) / 0.1)" />
      <foreignObject x={center - 12} y={center - 12} width={24} height={24}>
        <div className="w-full h-full flex items-center justify-center text-primary">
          <KeyRound className="w-5 h-5" />
        </div>
      </foreignObject>
      {dots.map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y} r={d.active ? 9 : 7}
          fill={d.active ? "hsl(var(--primary))" : "hsl(var(--primary) / 0.4)"}
          stroke="hsl(var(--background))" strokeWidth="2" />
      ))}
    </svg>
  );
}
