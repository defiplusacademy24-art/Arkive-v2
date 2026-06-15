import { Link } from "wouter";
import { ShieldHalf, Mail, Github, Twitter, Heart } from "lucide-react";
import logoUrl from "@/assets/rialo-logo.jpg";
import { useAuth } from "@/components/auth-provider";

const productLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/transfer", label: "Auto Transfer" },
  { href: "/guardians", label: "Guardians" },
  { href: "/recovery", label: "Recovery Package" },
  { href: "/docs", label: "Documentation" },
];

export function Footer() {
  const { user } = useAuth();
  const accountLinks = [
    { href: "/security", label: "Security Settings" },
    { href: "/activity", label: "Activity Monitor" },
    user
      ? { href: "/dashboard", label: "Dashboard" }
      : { href: "/auth", label: "Sign In" },
  ] as const;

  return (
    <footer className="border-t border-border bg-card/40 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-1">
            <Link href="/dashboard" className="flex items-center gap-2 mb-4">
              <img
                src={logoUrl}
                alt="Arkive"
                className="w-8 h-8 rounded-lg object-cover ring-1 ring-border bg-white"
              />
              <span className="font-bold text-base tracking-tight">
                <span className="text-foreground">Arkive</span>
              </span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Secure your crypto legacy. Automatically pass your digital assets to
              loved ones with guardian-approved, time-delayed inheritance.
            </p>
            <div className="flex items-center gap-3 mt-5">
              <a href="#" aria-label="Twitter" className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/50 transition-colors">
                <Twitter className="w-4 h-4" />
              </a>
              <a href="#" aria-label="GitHub" className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/50 transition-colors">
                <Github className="w-4 h-4" />
              </a>
              <a href="mailto:hello@arkive.app" aria-label="Email" className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/50 transition-colors">
                <Mail className="w-4 h-4" />
              </a>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-4">Product</h4>
            <ul className="space-y-2.5">
              {productLinks.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-4">Account</h4>
            <ul className="space-y-2.5">
              {accountLinks.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-4">Trust & Safety</h4>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <ShieldHalf className="w-3.5 h-3.5 text-primary" /> MPC Encryption
              </li>
              <li>End-to-end encrypted backups</li>
              <li>Guardian threshold approvals</li>
              <li>Time-delayed asset transfers</li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} Arkive. All rights reserved.</p>
          <p className="flex items-center gap-1.5">
            Built with <Heart className="w-3 h-3 text-primary fill-primary" /> for the next generation of crypto holders.
          </p>
          <div className="flex gap-4">
            <a href="#" className="hover:text-primary transition-colors">Privacy</a>
            <a href="#" className="hover:text-primary transition-colors">Terms</a>
            <a href="#" className="hover:text-primary transition-colors">Security</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
