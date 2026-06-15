import { Link, useLocation } from "wouter";
import { useState, useEffect, useCallback } from "react";
import { Moon, Sun, ChevronDown, Wallet, LogOut } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { useAuth } from "@/components/auth-provider";
import { useGetProfile } from "@/lib/api";
import { useDismissable } from "@/hooks/use-dismissable";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import logoUrl from "@/assets/rialo-logo.jpg";
import { Footer } from "@/components/footer";
import { WalletModal } from "@/components/wallet-modal";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/activity", label: "Activity Monitor" },
  { href: "/guardians", label: "Guardians" },
  { href: "/transfer", label: "Auto Transfer" },
  { href: "/recovery", label: "Recovery" },
  { href: "/docs", label: "Docs" },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location, navigate] = useLocation();
  const { theme, setTheme } = useTheme();
  const { user, signOut } = useAuth();
  const { data: profile } = useGetProfile({ query: { enabled: !!user } });
  const [showWallet, setShowWallet] = useState(false);
  const [walletMenuOpen, setWalletMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("rl:wallet");
      if (raw) setWalletAddress(JSON.parse(raw).address ?? null);
      else setWalletAddress(null);
    } catch {}
  }, [showWallet]);

  const closeWalletMenu = useCallback(() => setWalletMenuOpen(false), []);
  const closeUserMenu = useCallback(() => setUserMenuOpen(false), []);
  const walletMenuRef = useDismissable<HTMLDivElement>(walletMenuOpen, closeWalletMenu);
  const userMenuRef = useDismissable<HTMLDivElement>(userMenuOpen, closeUserMenu);

  function disconnectWallet() {
    try { localStorage.removeItem("rl:wallet"); } catch {}
    setWalletAddress(null);
    setWalletMenuOpen(false);
  }
  function copyWallet() {
    if (walletAddress) {
      navigator.clipboard.writeText(walletAddress);
    }
    setWalletMenuOpen(false);
  }

  const isDark = theme === "dark";
  const displayName = profile?.displayName || profile?.username || user?.email?.split("@")[0] || "Guest";
  const initials = (displayName[0] ?? "U").toUpperCase();

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            <Link href="/dashboard" className="flex items-center gap-2 flex-shrink-0">
              <div className="relative">
                <div className="absolute inset-0 bg-primary blur-md opacity-30 rounded-lg" />
                <img src={logoUrl} alt="Arkive" className="w-8 h-8 rounded-lg relative z-10 object-cover ring-1 ring-border bg-white" />
              </div>
              <span className="font-bold text-base tracking-tight">
                <span className="text-foreground">Arkive</span>
              </span>
            </Link>

            <nav className="hidden lg:flex items-center gap-0.5">
              {navItems.map((item) => {
                const isActive = location === item.href;
                return (
                  <Link key={item.href} href={item.href}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      isActive ? "text-primary bg-primary/10 font-semibold" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    }`}>
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="flex items-center gap-1.5">
              <div className="relative" ref={walletMenuRef}>
                <Button variant="outline" size="sm"
                  className={`h-8 px-2.5 sm:px-3 ${walletAddress ? "border-emerald-500/40 text-emerald-500 hover:bg-emerald-500/10" : "border-primary/40 text-primary hover:bg-primary/10"}`}
                  onClick={() => walletAddress ? setWalletMenuOpen(!walletMenuOpen) : setShowWallet(true)}>
                  {walletAddress && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-0.5" />}
                  <Wallet className="w-4 h-4" />
                  <span className="hidden sm:inline ml-1.5 text-xs font-medium font-mono">
                    {walletAddress ? `${walletAddress.slice(0, 6)}…${walletAddress.slice(-4)}` : "Connect Wallet"}
                  </span>
                </Button>
                <AnimatePresence>
                  {walletMenuOpen && walletAddress && (
                    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                      className="absolute right-0 mt-2 w-44 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden">
                      <button onClick={copyWallet} className="w-full text-left px-3 py-2 text-sm hover:bg-muted">Copy address</button>
                      <button onClick={disconnectWallet} className="w-full text-left px-3 py-2 text-sm text-destructive hover:bg-destructive/10">Disconnect</button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <button
                onClick={() => setTheme(isDark ? "light" : "dark")}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                title="Toggle theme"
              >
                {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
              <div className="relative" ref={userMenuRef}>
                <button onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-1.5 pl-1.5 pr-1 py-1 rounded-xl border border-border hover:bg-muted">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">{initials}</div>
                  <span className="text-sm font-medium hidden sm:inline pr-0.5 max-w-[120px] truncate">{displayName}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
                <AnimatePresence>
                  {userMenuOpen && (
                    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                      className="absolute right-0 mt-2 w-48 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden">
                      <div className="p-3 border-b border-border">
                        <p className="text-xs text-muted-foreground">Signed in as</p>
                        <p className="text-sm font-medium truncate">
                          {profile?.username ? `@${profile.username}` : user?.email}
                        </p>
                      </div>
                      <Link href="/security" className="block px-3 py-2 text-sm hover:bg-muted" onClick={() => setUserMenuOpen(false)}>
                        Security Settings
                      </Link>
                      <button
                        onClick={async () => { await signOut(); setUserMenuOpen(false); navigate("/auth"); }}
                        className="w-full text-left px-3 py-2 text-sm text-destructive hover:bg-destructive/10 flex items-center gap-2"
                      >
                        <LogOut className="w-3.5 h-3.5" /> Sign out
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          <div className="flex lg:hidden items-center gap-0.5 pb-2 overflow-x-auto scrollbar-none">
            {navItems.map((item) => {
              const isActive = location === item.href;
              return (
                <Link key={item.href} href={item.href}
                  className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex-shrink-0 ${
                    isActive ? "bg-primary/12 text-primary font-semibold" : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                  }`}>
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      </header>

      <main className="min-h-[calc(100vh-64px)]">{children}</main>

      <Footer />

      <AnimatePresence>{showWallet && <WalletModal onClose={() => setShowWallet(false)} />}</AnimatePresence>
    </div>
  );
}
