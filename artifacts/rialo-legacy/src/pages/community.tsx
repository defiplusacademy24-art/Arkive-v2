import { Link } from "wouter";
import { motion } from "framer-motion";
import { Users, MessageSquare, Twitter, ArrowLeft, Bell } from "lucide-react";
import logoUrl from "@/assets/rialo-logo.jpg";
import { useTheme } from "@/components/theme-provider";
import { Moon, Sun } from "lucide-react";
import { useState } from "react";

const CHANNELS = [
  {
    icon: MessageSquare,
    label: "Telegram",
    desc: "Join the official Arkive community on Telegram for announcements and discussions.",
    color: "text-sky-400",
    bg: "bg-sky-500/10 border-sky-400/20",
    href: "#",
    cta: "Join Telegram",
  },
  {
    icon: Twitter,
    label: "Twitter / X",
    desc: "Follow @ArkiveApp for product updates, ecosystem news, and community spotlights.",
    color: "text-foreground",
    bg: "bg-card border-border",
    href: "#",
    cta: "Follow on X",
  },
  {
    icon: MessageSquare,
    label: "Discord",
    desc: "A dedicated Discord server for builders, guardians, and power users is coming soon.",
    color: "text-violet-400",
    bg: "bg-violet-500/10 border-violet-400/20",
    href: "#",
    cta: "Coming Soon",
    disabled: true,
  },
];

export function CommunityPage() {
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";
  const [notified, setNotified] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <img src={logoUrl} alt="Arkive" className="w-7 h-7 rounded-lg object-cover ring-1 ring-border bg-white" />
              <span className="font-bold text-sm">Arkive</span>
            </Link>
            <span className="text-border">/</span>
            <span className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" /> Community
            </span>
          </div>
          <button
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 pt-24 pb-32 text-center">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Icon */}
          <div className="w-20 h-20 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-8">
            <Users className="w-10 h-10 text-primary" />
          </div>

          {/* Heading */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-400/30 text-xs font-medium text-amber-400 mb-5">
            <Bell className="w-3 h-3" /> Coming Soon
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight mb-4">
            Community is on its way.
          </h1>
          <p className="text-muted-foreground text-base leading-relaxed mb-12 max-w-lg mx-auto">
            We're building a space for Arkive users, builders, and guardians to connect, share feedback, and stay informed. It's almost ready.
          </p>

          {/* Channels */}
          <div className="space-y-4 mb-12 text-left">
            {CHANNELS.map((c) => (
              <div key={c.label} className={`rounded-xl border p-5 flex items-start gap-4 ${c.bg}`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${c.bg}`}>
                  <c.icon className={`w-5 h-5 ${c.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-bold mb-1 ${c.color}`}>{c.label}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{c.desc}</p>
                </div>
                <a
                  href={c.href}
                  className={`flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all ${
                    c.disabled
                      ? "border-border text-muted-foreground opacity-50 cursor-not-allowed pointer-events-none"
                      : `border-primary/40 text-primary hover:bg-primary/10`
                  }`}
                >
                  {c.cta}
                </a>
              </div>
            ))}
          </div>

          {/* Notify form */}
          {!notified ? (
            <div className="bg-card border border-border rounded-2xl p-7">
              <p className="text-sm font-semibold mb-1">Get notified when we launch</p>
              <p className="text-xs text-muted-foreground mb-5">We'll send you one email when the community portal goes live. No spam.</p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setNotified(true);
                }}
                className="flex gap-2 max-w-sm mx-auto"
              >
                <input
                  type="email"
                  required
                  placeholder="your@email.com"
                  className="flex-1 text-sm px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
                <button
                  type="submit"
                  className="bg-primary text-primary-foreground text-sm font-semibold px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
                >
                  Notify me
                </button>
              </form>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-emerald-500/10 border border-emerald-400/20 rounded-2xl p-7"
            >
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-3">
                <Bell className="w-6 h-6 text-emerald-400" />
              </div>
              <p className="text-sm font-bold text-emerald-400 mb-1">You're on the list!</p>
              <p className="text-xs text-muted-foreground">We'll let you know as soon as the community launches.</p>
            </motion.div>
          )}

          {/* Back link */}
          <div className="mt-10">
            <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to home
            </Link>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
