import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  BookOpen, ChevronRight, ChevronDown, Menu, X, Search,
  Shield, Users, Activity, RefreshCw, Zap, KeyRound, Eye,
  Fingerprint, Cpu, MessageSquare, Clock, Lock,
  AlertTriangle, Ban, Bell, ArrowRight, ExternalLink,
} from "lucide-react";
import logoUrl from "@/assets/rialo-logo.jpg";
import { useTheme } from "@/components/theme-provider";
import { Moon, Sun } from "lucide-react";

// ─── Sidebar structure ───────────────────────────────────────────────────────

type DocSection = {
  id: string;
  label: string;
  icon?: React.ElementType;
  children?: { id: string; label: string }[];
};

const SECTIONS: DocSection[] = [
  { id: "quick-start", label: "Quick Start", icon: Zap },
  {
    id: "introduction",
    label: "Introduction",
    icon: BookOpen,
    children: [
      { id: "what-is-arkive", label: "What is Arkive?" },
      { id: "why-arkive", label: "Why Arkive?" },
      { id: "the-problem", label: "The Problem We Solve" },
    ],
  },
  {
    id: "core-concepts",
    label: "Core Concepts",
    icon: Shield,
    children: [
      { id: "dead-man-switch", label: "Dead-Man Switch" },
      { id: "guardian-system", label: "Guardian System" },
      { id: "threshold-quorum", label: "Threshold Quorum" },
      { id: "staged-execution", label: "Staged Batch Execution" },
      { id: "panic-abort", label: "Panic Abort" },
      { id: "multichannel-checkin", label: "Multi-Channel Check-ins" },
    ],
  },
  {
    id: "rialo-infrastructure",
    label: "Rialo Infrastructure",
    icon: Cpu,
    children: [
      { id: "rialo-overview", label: "Overview" },
      { id: "async-transactions", label: "Async Transactions" },
      { id: "reactive-transactions", label: "Reactive Transactions" },
      { id: "threshold-mpc", label: "Threshold MPC" },
      { id: "native-automation", label: "Native Automation" },
      { id: "rialo-edge", label: "Rialo Edge" },
      { id: "rialo-ipc", label: "Rialo IPC" },
      { id: "confidential-computation", label: "Confidential Computation" },
      { id: "native-messaging", label: "Native Messaging" },
      { id: "conditional-transactions", label: "Conditional Transactions" },
      { id: "time-based-execution", label: "Time-Based Execution" },
    ],
  },
  {
    id: "user-guide",
    label: "User Guide",
    icon: Users,
    children: [
      { id: "create-account", label: "Create an Account" },
      { id: "connect-wallet", label: "Connect Your Wallet" },
      { id: "add-beneficiaries", label: "Add Beneficiaries" },
      { id: "setup-guardians", label: "Set Up Guardians" },
      { id: "configure-inactivity", label: "Configure Inactivity" },
      { id: "deposit-vault", label: "Deposit to Vault" },
      { id: "recovery-flow", label: "Recovery Flow" },
    ],
  },
  {
    id: "smart-contract",
    label: "Smart Contract",
    icon: KeyRound,
    children: [
      { id: "arkivevault-overview", label: "ArkiveVault Overview" },
      { id: "contract-deposit", label: "Deposit" },
      { id: "contract-recovery", label: "Recovery Execution" },
    ],
  },
  {
    id: "security",
    label: "Security",
    icon: Lock,
    children: [
      { id: "non-custodial", label: "Non-Custodial Design" },
      { id: "encryption", label: "Encryption" },
      { id: "privacy-guarantees", label: "Privacy Guarantees" },
    ],
  },
  { id: "faq", label: "FAQ", icon: Activity },
];

// ─── Content blocks ───────────────────────────────────────────────────────────

function Badge({ children, color = "primary" }: { children: React.ReactNode; color?: string }) {
  const map: Record<string, string> = {
    primary: "bg-primary/10 text-primary border-primary/30",
    amber: "bg-amber-500/10 text-amber-400 border-amber-400/30",
    emerald: "bg-emerald-500/10 text-emerald-400 border-emerald-400/30",
    sky: "bg-sky-500/10 text-sky-400 border-sky-400/30",
    violet: "bg-violet-500/10 text-violet-400 border-violet-400/30",
    rose: "bg-rose-500/10 text-rose-400 border-rose-400/30",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${map[color] ?? map.primary}`}>
      {children}
    </span>
  );
}

function InfoBox({ children, color = "primary" }: { children: React.ReactNode; color?: string }) {
  const map: Record<string, string> = {
    primary: "bg-primary/8 border-primary/30 text-primary",
    amber: "bg-amber-500/8 border-amber-400/30 text-amber-400",
    emerald: "bg-emerald-500/8 border-emerald-400/30 text-emerald-400",
  };
  return (
    <div className={`rounded-xl border p-4 text-sm leading-relaxed mb-6 ${map[color] ?? map.primary}`}>
      {children}
    </div>
  );
}

function SectionHeading({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="text-2xl font-bold tracking-tight mt-12 mb-4 scroll-mt-24 border-b border-border pb-3">
      {children}
    </h2>
  );
}

function SubHeading({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h3 id={id} className="text-lg font-semibold tracking-tight mt-10 mb-3 scroll-mt-24">
      {children}
    </h3>
  );
}

function Prose({ children }: { children: React.ReactNode }) {
  return <div className="text-sm text-muted-foreground leading-relaxed space-y-3 mb-4">{children}</div>;
}

function InfraCard({ icon: Icon, label, sub, desc, color, bg }: {
  icon: React.ElementType; label: string; sub: string; desc: string; color: string; bg: string;
}) {
  return (
    <div className={`rounded-xl border p-5 ${bg} mb-4`}>
      <div className="flex items-start gap-3 mb-2">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${bg}`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
        <div>
          <p className={`font-bold text-sm ${color}`}>{label}</p>
          <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wide">{sub}</p>
        </div>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
    </div>
  );
}

function StepList({ steps }: { steps: { n: number; title: string; desc: string }[] }) {
  return (
    <ol className="space-y-4 mb-6">
      {steps.map((s) => (
        <li key={s.n} className="flex gap-4">
          <div className="w-7 h-7 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0 mt-0.5">
            {s.n}
          </div>
          <div>
            <p className="text-sm font-semibold mb-0.5">{s.title}</p>
            <p className="text-xs text-muted-foreground leading-relaxed">{s.desc}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

// ─── FAQ ─────────────────────────────────────────────────────────────────────

const FAQS = [
  {
    q: "Is Arkive custodial?",
    a: "No. Arkive is fully non-custodial. Your private keys never leave your device. The smart contract holds assets on-chain and only releases them after the complete guardian approval threshold is reached.",
  },
  {
    q: "What happens if a guardian is unresponsive?",
    a: "The quorum model handles this. With a 2-of-3 setup, only 2 out of your 3 guardians need to approve. You can choose 3-of-5 for more redundancy. A single unresponsive or compromised guardian cannot block or trigger recovery.",
  },
  {
    q: "Can a guardian steal my assets?",
    a: "No. Guardians hold no keys to your wallet. Their role is to vote on whether the recovery workflow should proceed. A single guardian vote is never sufficient — the threshold quorum is always required.",
  },
  {
    q: "What is Panic Abort?",
    a: "Panic Abort is a one-tap emergency stop. If recovery has started but you're still alive and in control, you can instantly halt and reset the entire workflow from your dashboard at any time before all batches complete.",
  },
  {
    q: "What chains does Arkive support?",
    a: "Arkive is built on the ARC network (Rialo's chain). The ArkiveVault smart contract is deployed on ARC. Multi-chain support is on the roadmap.",
  },
  {
    q: "What assets can I protect?",
    a: "Currently USDC and native ARC tokens are supported via the vault deposit flow. Additional ERC-20 compatible tokens will be added in future releases.",
  },
  {
    q: "How does the inactivity timer work?",
    a: "You set your own inactivity window (default: 90 days) and check-in interval (default: 30 days). After the window expires, the system sends a check-in prompt via email, Telegram, or WhatsApp. If you don't respond within 48 hours, guardians are notified. Only after quorum approval does execution begin.",
  },
  {
    q: "Is my data private?",
    a: "Yes. Sensitive recovery logic runs through the REX Engine (Rialo's confidential computation layer), which executes privately without exposing your personal data. Guardian identities and wallet addresses are encrypted at rest using AES-256-GCM.",
  },
];

// ─── Main docs content ────────────────────────────────────────────────────────

function DocsContent({ activeId }: { activeId: string }) {
  return (
    <div className="max-w-3xl">

      {/* QUICK START */}
      <SectionHeading id="quick-start">Quick Start</SectionHeading>
      <Prose>
        <p>Get Arkive protecting your digital assets in under 5 minutes. Follow these four steps to set up your full inheritance plan.</p>
      </Prose>
      <StepList steps={[
        { n: 1, title: "Create an account", desc: "Sign up with your email at arkive.app. Verify your email to activate your account." },
        { n: 2, title: "Connect your wallet", desc: "Click 'Connect Wallet' in the top bar and connect your ARC-compatible wallet (MetaMask, WalletConnect, etc.)." },
        { n: 3, title: "Add guardians & beneficiaries", desc: "Go to Guardians and add 3 or 5 trusted contacts. Then go to Auto Transfer and assign your assets to beneficiaries with percentage allocations." },
        { n: 4, title: "Configure your inactivity window", desc: "In Security Settings, set your inactivity period (default 90 days) and choose which check-in channels to use: email, Telegram, WhatsApp, or Discord." },
      ]} />
      <InfoBox color="emerald">
        <strong>You're protected.</strong> Once setup is complete, Arkive monitors your activity silently in the background. The staged workflow only begins if you go unresponsive and your guardians reach quorum.
      </InfoBox>

      {/* INTRODUCTION */}
      <SectionHeading id="introduction">Introduction</SectionHeading>

      <SubHeading id="what-is-arkive">What is Arkive?</SubHeading>
      <Prose>
        <p>
          Arkive is a non-custodial crypto inheritance and recovery platform built on the ARC network (powered by Rialo infrastructure). It allows you to securely pass on your digital assets to designated beneficiaries if you become permanently incapacitated or unresponsive.
        </p>
        <p>
          Unlike traditional crypto wills or simple multi-sig setups, Arkive uses a <strong>staged, guardian-gated workflow</strong> — meaning assets are never transferred automatically or unilaterally. Every step is verified, every batch is announced, and you retain an emergency abort right until the very last moment.
        </p>
      </Prose>
      <div className="flex flex-wrap gap-2 mb-6">
        <Badge color="primary">Non-Custodial</Badge>
        <Badge color="emerald">Guardian-Protected</Badge>
        <Badge color="sky">Dead-Man Switch</Badge>
        <Badge color="violet">Built on Rialo</Badge>
        <Badge color="amber">ARC Network</Badge>
      </div>

      <SubHeading id="why-arkive">Why Arkive?</SubHeading>
      <Prose>
        <p>
          Traditional estate planning doesn't cover crypto. Seed phrases are a single point of failure — lose the paper and your family loses everything. Multi-sig wallets are technical and require all signers online. Centralised custodians hold your keys and can freeze, restrict, or lose access to funds.
        </p>
        <p>
          Arkive solves this with a system that is:
        </p>
      </Prose>
      <ul className="space-y-2 mb-6">
        {[
          ["Non-custodial", "Your keys never leave your device"],
          ["Threshold-gated", "Multiple guardians required, no single point of failure"],
          ["User-reversible", "You can stop everything with one tap at any time"],
          ["Automated", "No manual intervention needed after setup"],
          ["Multi-channel", "Check-ins via email, Telegram, WhatsApp, Discord, or wallet activity"],
        ].map(([title, desc]) => (
          <li key={title} className="flex gap-2 text-sm">
            <ChevronRight className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
            <span><strong>{title}</strong> — {desc}</span>
          </li>
        ))}
      </ul>

      <SubHeading id="the-problem">The Problem We Solve</SubHeading>
      <Prose>
        <p>
          Over <strong>$140 billion</strong> in crypto assets are currently locked in inaccessible wallets. More than <strong>4 million Bitcoin</strong> are estimated to be permanently lost. In every case, the cause is the same: there was no plan.
        </p>
        <p>
          When a wallet holder passes away or becomes incapacitated without leaving access instructions, their digital assets are gone forever. Arkive exists to make sure that never has to happen to your family.
        </p>
      </Prose>
      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        {[
          { value: "$140B+", label: "Lost in inaccessible wallets", color: "text-rose-400", bg: "bg-rose-500/10 border-rose-500/20" },
          { value: "4M+", label: "Bitcoin permanently lost", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
          { value: "0", label: "Recovery options without a plan", color: "text-primary", bg: "bg-primary/10 border-primary/20" },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl border p-5 text-center ${s.bg}`}>
            <p className={`text-2xl font-extrabold mb-1 ${s.color}`}>{s.value}</p>
            <p className="text-xs text-foreground/80 font-medium leading-snug">{s.label}</p>
          </div>
        ))}
      </div>

      {/* CORE CONCEPTS */}
      <SectionHeading id="core-concepts">Core Concepts</SectionHeading>

      <SubHeading id="dead-man-switch">Dead-Man Switch</SubHeading>
      <Prose>
        <p>
          A dead-man switch is a safety mechanism originally used in industrial equipment — if an operator stops interacting, the machine halts to prevent accidents. Arkive applies the same principle to crypto custody.
        </p>
        <p>
          You configure an <strong>inactivity window</strong> (how many days of silence triggers a check) and a <strong>check-in interval</strong> (how often you receive reminders). If you miss every check-in across the configured window, the system begins the recovery workflow.
        </p>
      </Prose>
      <InfoBox color="amber">
        <strong>Important:</strong> The dead-man switch does not transfer anything on its own. It only <em>initiates</em> the workflow — guardians must still approve before any asset moves.
      </InfoBox>
      <Prose>
        <p><strong>Key parameters you control:</strong></p>
      </Prose>
      <ul className="space-y-1.5 mb-6 text-sm">
        {[
          ["Inactivity period", "90 days default — how long of silence triggers the process"],
          ["Check-in interval", "30 days default — how often you are reminded to check in"],
          ["Time delay", "7 days default — grace period after guardians are notified, before execution begins"],
          ["Final warning", "A last-chance alert sent to you before the vault is unlocked"],
        ].map(([k, v]) => (
          <li key={k} className="flex gap-2">
            <span className="text-primary font-mono text-xs mt-0.5">▸</span>
            <span><strong className="text-foreground">{k}:</strong> <span className="text-muted-foreground">{v}</span></span>
          </li>
        ))}
      </ul>

      <SubHeading id="guardian-system">Guardian System</SubHeading>
      <Prose>
        <p>
          Guardians are trusted individuals you appoint to verify your status and approve the recovery workflow. They could be family members, close friends, a lawyer, or any trusted contact.
        </p>
        <p>
          You can add up to <strong>5 guardians</strong> with configurable quorum thresholds. Guardians are notified only after you have gone unresponsive across all your configured check-in channels.
        </p>
        <p>
          <strong>Each guardian provides:</strong> their name, email address, and optionally their wallet address (for on-chain approval) and Telegram/WhatsApp handle (for messaging-based alerts).
        </p>
      </Prose>
      <InfoBox>
        Guardians hold <strong>no custody</strong> over your assets. They only cast approval votes. Even if a guardian is compromised, a single vote cannot trigger anything.
      </InfoBox>

      <SubHeading id="threshold-quorum">Threshold Quorum</SubHeading>
      <Prose>
        <p>
          The quorum is the minimum number of guardian approvals required before the recovery workflow can proceed. Arkive uses two quorum options:
        </p>
      </Prose>
      <div className="grid sm:grid-cols-2 gap-4 mb-6">
        {[
          { q: "2-of-3", desc: "Add 3 guardians. Any 2 must approve. Best for smaller families or fewer trusted contacts.", color: "text-primary", bg: "bg-primary/10 border-primary/20" },
          { q: "3-of-5", desc: "Add 5 guardians. Any 3 must approve. Best for larger estates or when maximum security is needed.", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-400/20" },
        ].map((q) => (
          <div key={q.q} className={`rounded-xl border p-5 ${q.bg}`}>
            <p className={`text-2xl font-extrabold mb-2 ${q.color}`}>{q.q}</p>
            <p className="text-xs text-muted-foreground leading-relaxed">{q.desc}</p>
          </div>
        ))}
      </div>
      <Prose>
        <p>
          This threshold model — derived from Rialo's native <strong>Threshold MPC</strong> primitive — ensures that no single guardian can unilaterally trigger or block recovery. It eliminates collusion risk and single points of failure simultaneously.
        </p>
      </Prose>

      <SubHeading id="staged-execution">Staged Batch Execution</SubHeading>
      <Prose>
        <p>
          Once guardian quorum is reached, assets do not transfer all at once. Arkive executes transfers in <strong>staged batches</strong>, with a configurable delay between each batch. This serves two purposes:
        </p>
      </Prose>
      <ul className="space-y-2 mb-4 text-sm">
        {[
          "It gives you more time to trigger Panic Abort if you're still alive",
          "It reduces the impact of any single batch failure or network issue",
          "Continuous notifications are sent to you and your beneficiaries at every stage",
        ].map((item) => (
          <li key={item} className="flex gap-2">
            <ChevronRight className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
            <span className="text-muted-foreground">{item}</span>
          </li>
        ))}
      </ul>
      <Prose>
        <p>
          This is powered by Rialo's <strong>Async Transactions</strong> — long-running on-chain workflows that can pause, await external signals (like the absence of a panic abort), and resume automatically.
        </p>
      </Prose>

      <SubHeading id="panic-abort">Panic Abort</SubHeading>
      <Prose>
        <p>
          Panic Abort is your emergency override. At any point during the recovery workflow — from guardian notification right through to the final batch — you can press Panic Abort from your dashboard to <strong>instantly halt and reset the entire process</strong>.
        </p>
        <p>
          This is the most important safety feature in Arkive. No recovery can ever fully complete without your silence. As long as you are alive and can access the app, you are always in control.
        </p>
      </Prose>
      <InfoBox color="rose">
        <AlertTriangle className="w-4 h-4 inline mr-1.5 mb-0.5" />
        <strong>Panic Abort is permanent per session.</strong> After pressing it, the inactivity timer resets fully and all guardian votes are cleared.
      </InfoBox>

      <SubHeading id="multichannel-checkin">Multi-Channel Check-ins</SubHeading>
      <Prose>
        <p>
          Arkive monitors your activity across multiple signals to avoid false positives. A single missed email should never trigger a recovery. The system uses a <strong>multi-signal detection layer</strong> powered by Rialo Edge and Native Messaging:
        </p>
      </Prose>
      <div className="grid sm:grid-cols-2 gap-3 mb-6">
        {[
          { label: "Wallet activity", desc: "Any on-chain transaction from your tracked wallets counts as a check-in", color: "text-primary", bg: "bg-primary/8 border-primary/20" },
          { label: "Email", desc: "A one-click check-in link is sent to your registered email address", color: "text-sky-400", bg: "bg-sky-500/8 border-sky-400/20" },
          { label: "Telegram", desc: "A bot message with a one-tap confirm button is sent to your Telegram handle", color: "text-cyan-400", bg: "bg-cyan-500/8 border-cyan-400/20" },
          { label: "WhatsApp", desc: "An automated check-in message is sent via WhatsApp with a response link", color: "text-emerald-400", bg: "bg-emerald-500/8 border-emerald-400/20" },
          { label: "Discord", desc: "A bot DM is sent to your Discord account with a one-click confirm", color: "text-violet-400", bg: "bg-violet-500/8 border-violet-400/20" },
        ].map((c) => (
          <div key={c.label} className={`rounded-xl border p-4 ${c.bg}`}>
            <p className={`text-sm font-bold mb-1 ${c.color}`}>{c.label}</p>
            <p className="text-xs text-muted-foreground leading-relaxed">{c.desc}</p>
          </div>
        ))}
      </div>

      {/* RIALO INFRASTRUCTURE */}
      <SectionHeading id="rialo-infrastructure">Rialo Infrastructure</SectionHeading>

      <SubHeading id="rialo-overview">Overview</SubHeading>
      <Prose>
        <p>
          Arkive is <strong>built on Rialo</strong> — a high-throughput blockchain network designed specifically for real-world financial automation. Rialo is built by Subzero Labs (founded by ex-Mysten Labs / Sui engineers) and backed by Pantera Capital, Coinbase Ventures, Variant, Hashed, and Mysten Labs.
        </p>
        <p>
          What makes Rialo unique is that it bakes automation, privacy, identity, and messaging primitives <strong>directly into the base layer</strong> — no external oracles, bridges, or middleware required. This is what enables Arkive to run complex, long-running inheritance workflows on-chain without relying on bots or centralised servers.
        </p>
      </Prose>
      <InfoBox>
        Rialo describes itself as <em>"the only high-throughput network with configurable privacy built for real-world finance."</em> For Arkive, this means every check-in, guardian vote, and asset transfer is executed with native chain-level guarantees.
      </InfoBox>

      <SubHeading id="async-transactions">Async Transactions</SubHeading>
      <InfraCard
        icon={RefreshCw}
        label="Async Transactions"
        sub="Long-Running Workflows"
        desc="Pause, resume, and automate inheritance workflows across inactivity checks, guardian approvals, and staged execution."
        color="text-amber-400"
        bg="bg-amber-400/10 border-amber-400/20"
      />
      <Prose>
        <p>
          Traditional blockchains are synchronous — every transaction executes in a single block and either completes or fails atomically. This makes them unsuitable for multi-day, multi-step workflows like inheritance.
        </p>
        <p>
          Rialo's <strong>Async Transactions</strong> break this limitation. They allow on-chain workflows to pause at a checkpoint, wait for an external signal (a guardian vote, a check-in response, or the absence of a panic abort), and automatically resume when conditions are met. For Arkive, this means the entire inheritance workflow — from inactivity detection through to the final transfer batch — runs as a single, continuous, verifiable on-chain workflow.
        </p>
      </Prose>

      <SubHeading id="reactive-transactions">Reactive Transactions</SubHeading>
      <InfraCard
        icon={Zap}
        label="Reactive Transactions"
        sub="Event-Driven Automation"
        desc="Automatically executes workflows when inactivity conditions and guardian approval thresholds are satisfied."
        color="text-sky-400"
        bg="bg-sky-400/10 border-sky-400/20"
      />
      <Prose>
        <p>
          Reactive Transactions allow on-chain code to respond to external events without a user submitting a transaction. In Arkive, this enables the system to:
        </p>
      </Prose>
      <ul className="space-y-1.5 text-sm mb-6">
        {[
          "Automatically trigger a check-in prompt when the inactivity window expires",
          "Advance the workflow to guardian notification when check-in is missed",
          "Begin the execution phase automatically when quorum threshold is reached",
          "Halt execution immediately when a Panic Abort event is detected",
        ].map((item) => (
          <li key={item} className="flex gap-2">
            <span className="text-sky-400 font-mono text-xs mt-0.5">▸</span>
            <span className="text-muted-foreground">{item}</span>
          </li>
        ))}
      </ul>

      <SubHeading id="threshold-mpc">Threshold MPC</SubHeading>
      <InfraCard
        icon={KeyRound}
        label="Threshold MPC"
        sub="Multi-Party Computation"
        desc="Recovery authorization is distributed across multiple guardians to eliminate single points of failure."
        color="text-violet-400"
        bg="bg-violet-400/10 border-violet-400/20"
      />
      <Prose>
        <p>
          Multi-Party Computation (MPC) allows a cryptographic operation (in this case, authorising a vault release) to be split across multiple parties so that <strong>no single party holds enough information to act alone</strong>.
        </p>
        <p>
          In Arkive, the vault recovery signature is a threshold MPC key shared among your guardians. Only when the required quorum submits their partial signatures can the combined signature be assembled and the vault contract executed. This is enforced at the cryptographic level — not just at the application level.
        </p>
      </Prose>

      <SubHeading id="native-automation">Native Automation</SubHeading>
      <InfraCard
        icon={Cpu}
        label="Native Automation"
        sub="Automated Workflow Orchestration"
        desc="Inheritance workflows progress automatically through verification, notifications, approvals, and batch execution."
        color="text-emerald-400"
        bg="bg-emerald-400/10 border-emerald-400/20"
      />
      <Prose>
        <p>
          Rialo's Native Automation layer is the orchestrator that ties together all other primitives. It defines the workflow state machine: idle → inactivity detected → check-in sent → guardians notified → quorum reached → batch 1 → batch 2 → complete (or aborted).
        </p>
        <p>
          Each state transition is an on-chain event, meaning the full audit trail of your estate's execution is permanently recorded and verifiable by anyone with the vault address.
        </p>
      </Prose>

      <SubHeading id="rialo-edge">Rialo Edge</SubHeading>
      <InfraCard
        icon={Eye}
        label="Rialo Edge"
        sub="Native API Calls"
        desc="Securely interacts with external APIs and real-world activity signals directly within automated workflows."
        color="text-rose-400"
        bg="bg-rose-400/10 border-rose-400/20"
      />
      <Prose>
        <p>
          Rialo Edge enables smart contracts to make <strong>native HTTP calls to external APIs</strong> without oracles. For Arkive, this is used to:
        </p>
      </Prose>
      <ul className="space-y-1.5 text-sm mb-6">
        {[
          "Query wallet activity on external chains for multi-signal inactivity detection",
          "Verify check-in responses from Telegram, WhatsApp, and Discord APIs",
          "Pull real-time token prices for vault valuations",
          "Trigger outbound notifications to guardian email and messaging services",
        ].map((item) => (
          <li key={item} className="flex gap-2">
            <span className="text-rose-400 font-mono text-xs mt-0.5">▸</span>
            <span className="text-muted-foreground">{item}</span>
          </li>
        ))}
      </ul>

      <SubHeading id="rialo-ipc">Rialo IPC</SubHeading>
      <InfraCard
        icon={Fingerprint}
        label="Rialo IPC"
        sub="Identity, Privacy & Compliance"
        desc="Identity-aware infrastructure designed for privacy-preserving workflows and secure guardian coordination."
        color="text-cyan-400"
        bg="bg-cyan-400/10 border-cyan-400/20"
      />
      <Prose>
        <p>
          IPC is Rialo's unified protocol primitive for identity, privacy, and compliance. It allows Arkive to handle sensitive user data (guardian identities, wallet addresses, beneficiary allocations) in a <strong>privacy-preserving</strong> way.
        </p>
        <p>
          Rather than storing raw PII on-chain, Arkive uses IPC to ensure that only the authorised parties (the user and their guardians) can ever read or act on the sensitive configuration. Compliance requirements — such as KYC attestation or jurisdiction-specific rules — can be enforced at the IPC layer without exposing the underlying data.
        </p>
      </Prose>

      <SubHeading id="confidential-computation">Confidential Computation (REX Engine)</SubHeading>
      <InfraCard
        icon={Shield}
        label="Confidential Computation"
        sub="REX Engine"
        desc="Sensitive recovery logic and encrypted inheritance workflows execute privately without exposing confidential user data."
        color="text-indigo-400"
        bg="bg-indigo-400/10 border-indigo-400/20"
      />
      <Prose>
        <p>
          The REX Engine (Rialo's confidential execution runtime) enables smart contract logic to run inside a <strong>trusted execution environment (TEE)</strong>. For Arkive, this is used for the recovery threshold computation — the MPC key assembly and vault release authorisation happen inside the REX Engine, meaning the process is verifiable but the inputs (guardian key shares) are never exposed on-chain.
        </p>
      </Prose>

      <SubHeading id="native-messaging">Native Messaging</SubHeading>
      <InfraCard
        icon={MessageSquare}
        label="Native Messaging"
        sub="Multi-Channel Notifications"
        desc="Automated check-ins, warnings, guardian alerts, and recovery notifications are delivered throughout every stage of execution."
        color="text-teal-400"
        bg="bg-teal-400/10 border-teal-400/20"
      />
      <Prose>
        <p>
          Native Messaging means that Rialo's base layer natively supports sending messages to external services without Arkive operating its own notification server. All alerts — check-in prompts, guardian notifications, batch execution warnings, and final confirmations — are dispatched from the on-chain workflow itself, ensuring they cannot be suppressed or tampered with by any third party.
        </p>
      </Prose>

      <SubHeading id="conditional-transactions">Conditional Transactions</SubHeading>
      <InfraCard
        icon={Activity}
        label="Conditional Transactions"
        sub="Rule-Based Execution"
        desc="Transfers and recovery actions only execute when inactivity conditions and guardian approval thresholds are satisfied."
        color="text-orange-400"
        bg="bg-orange-400/10 border-orange-400/20"
      />
      <Prose>
        <p>
          Conditional Transactions let you encode real-world rules directly into on-chain execution logic. In Arkive, asset transfers are conditioned on: <em>(1) inactivity window elapsed</em>, <em>(2) check-in missed</em>, <em>(3) guardian quorum reached</em>, and <em>(4) panic abort not triggered within the time-delay window</em>. All four conditions must be true simultaneously for any transfer to execute.
        </p>
      </Prose>

      <SubHeading id="time-based-execution">Time-Based Execution</SubHeading>
      <InfraCard
        icon={Clock}
        label="Time-Based Execution"
        sub="Scheduled Security Flows"
        desc="Supports delayed execution, staged warnings, inactivity timers, and batch-based transfer scheduling for safer inheritance automation."
        color="text-pink-400"
        bg="bg-pink-400/10 border-pink-400/20"
      />
      <Prose>
        <p>
          Time-Based Execution allows workflows to be scheduled ahead of time or triggered after a specific duration. For Arkive this powers: the inactivity counter, the check-in reminder cadence, the post-quorum time delay (grace period), and the interval between staged transfer batches.
        </p>
      </Prose>

      {/* USER GUIDE */}
      <SectionHeading id="user-guide">User Guide</SectionHeading>

      <SubHeading id="create-account">Create an Account</SubHeading>
      <StepList steps={[
        { n: 1, title: "Go to the app", desc: "Open Arkive in your browser and click 'Get Started' on the landing page." },
        { n: 2, title: "Enter your email and password", desc: "Choose a strong password. You'll use this to log in alongside your connected wallet." },
        { n: 3, title: "Verify your email", desc: "Check your inbox for a verification email and click the link to activate your account." },
        { n: 4, title: "Set a username", desc: "On first login you'll be prompted to set a display name. This is shown in your dashboard and to your guardians." },
      ]} />

      <SubHeading id="connect-wallet">Connect Your Wallet</SubHeading>
      <Prose>
        <p>Arkive supports ARC-compatible wallets. You can connect via MetaMask or any WalletConnect-compatible wallet.</p>
      </Prose>
      <StepList steps={[
        { n: 1, title: "Click 'Connect Wallet'", desc: "Find the wallet button in the top navigation bar." },
        { n: 2, title: "Select your wallet", desc: "Choose MetaMask, WalletConnect, or another supported provider." },
        { n: 3, title: "Switch to ARC network", desc: "Your wallet will prompt you to add or switch to the ARC network. Approve this." },
        { n: 4, title: "Sign the connection message", desc: "Sign a gasless message to prove wallet ownership. This is not a transaction and costs nothing." },
      ]} />
      <InfoBox color="amber">
        <strong>Tracked wallets:</strong> You can also add up to 3 external wallet addresses for activity monitoring in Security Settings. Any on-chain activity from these addresses counts as a check-in.
      </InfoBox>

      <SubHeading id="add-beneficiaries">Add Beneficiaries</SubHeading>
      <Prose>
        <p>Beneficiaries are the people who will receive your assets. Go to <strong>Auto Transfer</strong> from the sidebar to manage them.</p>
      </Prose>
      <StepList steps={[
        { n: 1, title: "Click 'Add Beneficiary'", desc: "Enter their name, email, and wallet address. A phone number is optional." },
        { n: 2, title: "Assign assets", desc: "For each asset in your vault, assign it to a beneficiary with an allocation percentage. Allocations must sum to 100%." },
        { n: 3, title: "Save and confirm", desc: "Review the allocations and save. You can edit or remove beneficiaries at any time before the recovery workflow has started." },
      ]} />

      <SubHeading id="setup-guardians">Set Up Guardians</SubHeading>
      <Prose>
        <p>Guardians are managed from the <strong>Guardians</strong> page. You can choose between a 2-of-3 or 3-of-5 quorum.</p>
      </Prose>
      <StepList steps={[
        { n: 1, title: "Click 'Add Guardian'", desc: "Enter their name, email, and optionally their wallet address and Telegram/WhatsApp handle." },
        { n: 2, title: "Choose your quorum", desc: "With 3 guardians, you get 2-of-3. Add a 4th and 5th to upgrade to 3-of-5." },
        { n: 3, title: "Notify your guardians", desc: "Let your guardians know they have been added. They will receive notifications by email or messaging app when the time comes." },
      ]} />

      <SubHeading id="configure-inactivity">Configure Inactivity</SubHeading>
      <Prose>
        <p>Go to <strong>Security Settings</strong> to customise your inactivity and check-in parameters.</p>
      </Prose>
      <ul className="space-y-2 mb-6 text-sm">
        {[
          ["Inactivity period", "The number of days of silence that triggers a check-in (default: 90 days)"],
          ["Check-in interval", "How often you receive reminders (default: 30 days)"],
          ["Time delay", "Grace period after guardian notification before execution begins (default: 7 days)"],
          ["Auto check-in", "Enable to automatically register wallet activity as a check-in"],
          ["Multi-signal mode", "Require inactivity across all channels, not just one"],
        ].map(([k, v]) => (
          <li key={k} className="flex gap-2">
            <span className="text-primary font-mono text-xs mt-0.5">▸</span>
            <span><strong>{k}:</strong> <span className="text-muted-foreground">{v}</span></span>
          </li>
        ))}
      </ul>

      <SubHeading id="deposit-vault">Deposit to Vault</SubHeading>
      <Prose>
        <p>
          The Arkive vault is an on-chain smart contract (<code className="text-primary text-xs bg-primary/10 px-1.5 py-0.5 rounded">ArkiveVault</code>) deployed on the ARC network. Depositing assets into the vault places them under the protection of the inheritance smart contract.
        </p>
      </Prose>
      <StepList steps={[
        { n: 1, title: "Click 'Deposit' on your Dashboard", desc: "Select the asset (USDC or ARC) and enter the amount to deposit." },
        { n: 2, title: "Approve the contract", desc: "Your wallet will ask you to approve the ArkiveVault contract to spend the token amount. This is a standard ERC-20 approval." },
        { n: 3, title: "Confirm the deposit transaction", desc: "Sign and broadcast the deposit transaction. It will be recorded on-chain and appear in your vault balance." },
        { n: 4, title: "Assign to a beneficiary", desc: "After depositing, go to Auto Transfer to assign this asset to a beneficiary with an allocation percentage." },
      ]} />
      <InfoBox color="primary">
        ArkiveVault is deployed on Arc Testnet at{" "}
        <a
          href="https://testnet.arcscan.app/address/0x86c5dFdA52AA8C7912fAf02b6393BD434d817059"
          target="_blank" rel="noopener noreferrer"
          className="font-mono underline underline-offset-2 break-all"
        >
          0x86c5dFdA52AA8C7912fAf02b6393BD434d817059
        </a>. Verify the contract source on Arcscan.
      </InfoBox>

      <SubHeading id="recovery-flow">Recovery Flow</SubHeading>
      <Prose>
        <p>This is the full lifecycle of a recovery, from inactivity detection to final transfer:</p>
      </Prose>
      <StepList steps={[
        { n: 1, title: "Inactivity detected", desc: "After your configured inactivity period, the system detects no wallet activity, email response, or messaging check-in." },
        { n: 2, title: "Check-in prompt sent", desc: "A check-in alert is sent to you across all your enabled channels. You have 48 hours to respond." },
        { n: 3, title: "Guardian notification", desc: "If no response is received, your guardians are notified via email and messaging apps and asked to vote on the recovery." },
        { n: 4, title: "Quorum reached", desc: "Once the required threshold of guardians approves (e.g. 2-of-3), the time-delay period begins (default: 7 days)." },
        { n: 5, title: "Final warning", desc: "A final warning is sent to you during the time-delay window. This is your last opportunity to trigger Panic Abort." },
        { n: 6, title: "Batch execution", desc: "Assets are transferred in staged batches to beneficiaries according to your allocation settings. Notifications continue at each batch." },
        { n: 7, title: "Completion", desc: "Once all batches complete, the recovery workflow ends and the vault is emptied per your instructions." },
      ]} />

      {/* SMART CONTRACT */}
      <SectionHeading id="smart-contract">Smart Contract</SectionHeading>

      <SubHeading id="arkivevault-overview">ArkiveVault Overview</SubHeading>
      <Prose>
        <p>
          <code className="text-primary text-xs bg-primary/10 px-1.5 py-0.5 rounded">ArkiveVault.sol</code> is the core smart contract that holds user assets on the ARC network. It enforces all the security guarantees described in this documentation at the cryptographic and contract level.
        </p>
        <p>Key properties of the contract:</p>
      </Prose>
      <ul className="space-y-1.5 text-sm mb-6">
        {[
          "Non-custodial — the contract owner has no ability to withdraw user funds",
          "Guardian-gated — releases only after threshold MPC signature assembly",
          "User-reversible — the original depositor can always cancel at any time before final batch",
          "Auditable — all state transitions are emitted as on-chain events",
          "Deduplication — duplicate deposits (same tx_hash + chain_id) are rejected",
        ].map((item) => (
          <li key={item} className="flex gap-2">
            <ChevronRight className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
            <span className="text-muted-foreground">{item}</span>
          </li>
        ))}
      </ul>

      <SubHeading id="contract-deposit">Deposit</SubHeading>
      <Prose>
        <p>
          The <code className="text-primary text-xs bg-primary/10 px-1.5 py-0.5 rounded">deposit()</code> function accepts USDC or ARC tokens and records the deposit against the caller's address. Each deposit is recorded in the <code className="text-primary text-xs bg-primary/10 px-1.5 py-0.5 rounded">vault_deposits</code> table via Supabase and on-chain in the contract event log.
        </p>
      </Prose>
      <div className="bg-card border border-border rounded-xl overflow-hidden mb-6">
        <div className="bg-muted/60 border-b border-border px-4 py-2 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-rose-400" />
          <div className="w-2 h-2 rounded-full bg-amber-400" />
          <div className="w-2 h-2 rounded-full bg-emerald-400" />
          <span className="text-xs font-mono text-muted-foreground ml-2">ArkiveVault.sol</span>
        </div>
        <pre className="p-4 text-xs font-mono text-muted-foreground overflow-x-auto leading-relaxed">{`function deposit(
  address token,
  uint256 amount
) external nonReentrant {
  require(amount > 0, "Zero amount");
  IERC20(token).transferFrom(msg.sender, address(this), amount);
  emit Deposited(msg.sender, token, amount, block.timestamp);
}`}</pre>
      </div>

      <SubHeading id="contract-recovery">Recovery Execution</SubHeading>
      <Prose>
        <p>
          The <code className="text-primary text-xs bg-primary/10 px-1.5 py-0.5 rounded">executeRecovery()</code> function can only be called once the threshold MPC signature is assembled by the REX Engine. It validates the combined guardian signature and releases assets to the designated beneficiaries in accordance with the stored allocation map.
        </p>
        <p>
          ArkiveVault is live on Arc Testnet —{" "}
          <a
            href="https://testnet.arcscan.app/address/0x86c5dFdA52AA8C7912fAf02b6393BD434d817059"
            target="_blank" rel="noopener noreferrer"
            className="text-primary underline underline-offset-2 font-mono text-xs break-all"
          >
            0x86c5dFdA52AA8C7912fAf02b6393BD434d817059
          </a>. The source is available for verification on Arcscan.
        </p>
      </Prose>

      {/* SECURITY */}
      <SectionHeading id="security">Security</SectionHeading>

      <SubHeading id="non-custodial">Non-Custodial Design</SubHeading>
      <Prose>
        <p>
          Arkive will never hold, ask for, or store your private keys. The application connects to your wallet via standard Web3 signing interfaces. Every sensitive operation — deposits, approvals, threshold signatures — requires explicit wallet confirmation from you.
        </p>
        <p>
          The ArkiveVault smart contract is designed so that even the contract deployer cannot withdraw user funds. Control flows only through the guardian threshold mechanism or the user's own wallet.
        </p>
      </Prose>

      <SubHeading id="encryption">Encryption</SubHeading>
      <Prose>
        <p>All sensitive data at rest (guardian emails, wallet addresses, beneficiary allocations) is encrypted using <strong>AES-256-GCM</strong> before being stored in the database. Data in transit uses TLS 1.3.</p>
        <p>Guardian key shares (used in the threshold MPC) are encrypted using each guardian's public key and stored separately from the vault configuration. No single record in the database contains enough information to reconstruct the full recovery key.</p>
      </Prose>

      <SubHeading id="privacy-guarantees">Privacy Guarantees</SubHeading>
      <Prose>
        <p>The REX Engine executes the most sensitive recovery logic inside a Trusted Execution Environment (TEE). This means:</p>
      </Prose>
      <ul className="space-y-2 mb-6 text-sm">
        {[
          "Guardian key shares are never exposed on-chain or to any third party",
          "The assembled recovery signature is generated inside the TEE and broadcast directly — never passing through an application server",
          "Beneficiary allocation details remain private until the recovery is fully executed",
          "Arkive employees and engineers have no technical ability to view your guardian configuration or asset allocations",
        ].map((item) => (
          <li key={item} className="flex gap-2">
            <ChevronRight className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
            <span className="text-muted-foreground">{item}</span>
          </li>
        ))}
      </ul>

      {/* FAQ */}
      <SectionHeading id="faq">FAQ</SectionHeading>
      <div className="space-y-4 mb-12">
        {FAQS.map((faq) => (
          <FaqItem key={faq.q} q={faq.q} a={faq.a} />
        ))}
      </div>

      {/* Footer CTA */}
      <div className="border border-primary/20 bg-primary/5 rounded-2xl p-8 text-center mb-8">
        <p className="text-lg font-bold mb-2">Ready to protect your digital legacy?</p>
        <p className="text-sm text-muted-foreground mb-5">Set up your inheritance plan in under 5 minutes. Non-custodial, guardian-protected, and always reversible.</p>
        <Link href="/auth">
          <button className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity">
            Get Started Free <ArrowRight className="w-4 h-4" />
          </button>
        </Link>
      </div>

    </div>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full text-left px-5 py-4 flex items-center justify-between gap-3 hover:bg-muted/40 transition-colors"
      >
        <span className="text-sm font-semibold">{q}</span>
        {open ? <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
      </button>
      {open && (
        <div className="px-5 pb-4 text-sm text-muted-foreground leading-relaxed border-t border-border pt-3">
          {a}
        </div>
      )}
    </div>
  );
}

// ─── Sidebar ─────────────────────────────────────────────────────────────────

function Sidebar({
  active,
  onSelect,
  onClose,
}: {
  active: string;
  onSelect: (id: string) => void;
  onClose?: () => void;
}) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    introduction: true,
    "core-concepts": true,
    "rialo-infrastructure": true,
    "user-guide": true,
    "smart-contract": true,
    security: true,
  });

  function toggleSection(id: string) {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function handleSelect(id: string) {
    onSelect(id);
    onClose?.();
    const el = document.getElementById(id);
    if (el) {
      setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    }
  }

  return (
    <nav className="w-full">
      <div className="space-y-0.5">
        {SECTIONS.map((section) => (
          <div key={section.id}>
            {section.children ? (
              <>
                <button
                  onClick={() => toggleSection(section.id)}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted/50"
                >
                  <span className="flex items-center gap-2">
                    {section.icon && <section.icon className="w-3.5 h-3.5" />}
                    {section.label}
                  </span>
                  {expanded[section.id] ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                </button>
                {expanded[section.id] && (
                  <div className="ml-5 mt-0.5 space-y-0.5 border-l border-border pl-3">
                    {section.children.map((child) => (
                      <button
                        key={child.id}
                        onClick={() => handleSelect(child.id)}
                        className={`w-full text-left px-2 py-1.5 text-xs rounded-lg transition-colors ${
                          active === child.id
                            ? "text-primary font-semibold bg-primary/10"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                        }`}
                      >
                        {child.label}
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <button
                onClick={() => handleSelect(section.id)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors ${
                  active === section.id
                    ? "text-primary font-semibold bg-primary/10"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                {section.icon && <section.icon className="w-3.5 h-3.5" />}
                {section.label}
              </button>
            )}
          </div>
        ))}
      </div>
    </nav>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function DocsPage() {
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";
  const [activeId, setActiveId] = useState("quick-start");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const allIds: string[] = [];
    SECTIONS.forEach((s) => {
      allIds.push(s.id);
      s.children?.forEach((c) => allIds.push(c.id));
    });
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length > 0) {
          const top = visible.reduce((a, b) =>
            a.boundingClientRect.top < b.boundingClientRect.top ? a : b
          );
          setActiveId(top.target.id);
        }
      },
      { rootMargin: "-20% 0px -70% 0px", threshold: 0 }
    );
    allIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── Top nav ── */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden p-1.5 text-muted-foreground hover:text-foreground"
              onClick={() => setMobileSidebarOpen((v) => !v)}
            >
              {mobileSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <Link href="/" className="flex items-center gap-2">
              <img src={logoUrl} alt="Arkive" className="w-7 h-7 rounded-lg object-cover ring-1 ring-border bg-white" />
              <span className="font-bold text-sm">Arkive</span>
            </Link>
            <span className="text-border">/</span>
            <span className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5" /> Docs
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5 bg-muted/50 border border-border rounded-lg px-3 py-1.5 text-xs text-muted-foreground">
              <Search className="w-3 h-3" />
              <span>Search docs…</span>
              <span className="ml-2 px-1.5 py-0.5 rounded bg-border/60 text-[10px] font-mono">⌘K</span>
            </div>
            <button
              onClick={() => setTheme(isDark ? "light" : "dark")}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <a
              href="https://rialo.io"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Rialo <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </header>

      {/* ── Mobile sidebar overlay ── */}
      {mobileSidebarOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="lg:hidden fixed inset-0 z-30 bg-background/80 backdrop-blur-sm"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}
      {mobileSidebarOpen && (
        <motion.aside
          initial={{ x: -280 }}
          animate={{ x: 0 }}
          exit={{ x: -280 }}
          transition={{ type: "spring", damping: 30, stiffness: 300 }}
          className="lg:hidden fixed top-14 left-0 bottom-0 w-72 bg-background border-r border-border z-40 overflow-y-auto p-4"
        >
          <Sidebar active={activeId} onSelect={setActiveId} onClose={() => setMobileSidebarOpen(false)} />
        </motion.aside>
      )}

      {/* ── Body ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex gap-8 pt-8 pb-20">
        {/* Desktop sidebar */}
        <aside className="hidden lg:block w-56 flex-shrink-0 sticky top-24 self-start max-h-[calc(100vh-6rem)] overflow-y-auto pr-2">
          <Sidebar active={activeId} onSelect={setActiveId} />
        </aside>

        {/* Main content */}
        <main ref={contentRef} className="flex-1 min-w-0">
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-medium text-primary mb-4">
              <BookOpen className="w-3 h-3" /> Documentation
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight mb-2">Arkive Docs</h1>
            <p className="text-muted-foreground text-base leading-relaxed max-w-2xl">
              Everything you need to understand, set up, and get the most out of your Arkive inheritance plan. Built on Rialo infrastructure — the real-world blockchain.
            </p>
          </div>
          <DocsContent activeId={activeId} />
        </main>

        {/* Right TOC (desktop only, large screens) */}
        <aside className="hidden xl:block w-48 flex-shrink-0 sticky top-24 self-start max-h-[calc(100vh-6rem)] overflow-y-auto">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">On this page</p>
          <nav className="space-y-1">
            {SECTIONS.map((s) => (
              <div key={s.id}>
                <button
                  onClick={() => {
                    const el = document.getElementById(s.id);
                    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                    setActiveId(s.id);
                  }}
                  className={`block text-xs py-1 transition-colors ${
                    activeId === s.id ? "text-primary font-semibold" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {s.label}
                </button>
              </div>
            ))}
          </nav>
        </aside>
      </div>
    </div>
  );
}
