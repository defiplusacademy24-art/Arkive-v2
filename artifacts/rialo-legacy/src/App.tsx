import { Switch, Route, Redirect, Router as WouterRouter, useLocation } from "wouter";
import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider, useAuth } from "@/components/auth-provider";
import { Layout } from "@/components/layout";
import { LandingPage } from "@/pages/landing";
import { AuthPage } from "@/pages/auth";
import { DashboardPage } from "@/pages/dashboard";
import { TransferPage } from "@/pages/transfer";
import { GuardiansPage } from "@/pages/guardians";
import { RecoveryPage } from "@/pages/recovery";
import { SecurityPage } from "@/pages/security";
import { ActivityPage } from "@/pages/activity";
import { ResetPasswordPage } from "@/pages/reset-password";
import { DocsPage } from "@/pages/docs";
import { CommunityPage } from "@/pages/community";
import { AuthCallbackPage } from "@/pages/auth-callback";
import NotFound from "@/pages/not-found";

function ScrollToTop() {
  const [location] = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [location]);
  return null;
}

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 1000 * 60, retry: 1 } },
});

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="text-muted-foreground text-sm">Loading…</span>
      </div>
    );
  }
  if (!user) return <Redirect to="/auth" />;
  return (
    <Layout>
      <Component />
    </Layout>
  );
}

function AppRoutes() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/reset-password" component={ResetPasswordPage} />
      <Route path="/dashboard">
        {() => <ProtectedRoute component={DashboardPage} />}
      </Route>
      <Route path="/transfer">
        {() => <ProtectedRoute component={TransferPage} />}
      </Route>
      <Route path="/guardians">
        {() => <ProtectedRoute component={GuardiansPage} />}
      </Route>
      <Route path="/recovery">
        {() => <ProtectedRoute component={RecoveryPage} />}
      </Route>
      <Route path="/security">
        {() => <ProtectedRoute component={SecurityPage} />}
      </Route>
      <Route path="/activity">
        {() => <ProtectedRoute component={ActivityPage} />}
      </Route>
      <Route path="/auth/callback" component={AuthCallbackPage} />
      <Route path="/docs" component={DocsPage} />
      <Route path="/community" component={CommunityPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark">
        <AuthProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <ScrollToTop />
            <AppRoutes />
          </WouterRouter>
          <Toaster richColors position="top-right" />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
