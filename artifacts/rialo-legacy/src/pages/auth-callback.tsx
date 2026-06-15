import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export function AuthCallbackPage() {
  const [, navigate] = useLocation();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    async function handleCallback() {
      try {
        const hash = window.location.hash;
        const search = window.location.search;

        if (hash && hash.includes("access_token")) {
          const params = new URLSearchParams(hash.replace(/^#/, ""));
          const accessToken = params.get("access_token");
          const refreshToken = params.get("refresh_token");
          const type = params.get("type");

          if (accessToken && refreshToken) {
            const { error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            if (error) throw error;
          }

          if (type === "recovery") {
            setStatus("success");
            setTimeout(() => navigate("/reset-password"), 1500);
            return;
          }
        }

        if (search && search.includes("code=")) {
          const params = new URLSearchParams(search);
          const code = params.get("code");
          if (code) {
            const { error } = await supabase.auth.exchangeCodeForSession(code);
            if (error) throw error;
          }
        }

        const { data } = await supabase.auth.getSession();
        if (data.session) {
          setStatus("success");
          setTimeout(() => navigate("/dashboard"), 1200);
        } else {
          setStatus("error");
          setErrorMsg("No valid session found. The link may have expired.");
        }
      } catch (err: any) {
        setStatus("error");
        setErrorMsg(err?.message ?? "Verification failed. Please try signing in again.");
      }
    }

    handleCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center space-y-4 max-w-sm w-full">
        {status === "loading" && (
          <>
            <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
            <p className="font-semibold text-lg">Verifying your email…</p>
            <p className="text-sm text-muted-foreground">Just a moment while we confirm your account.</p>
          </>
        )}
        {status === "success" && (
          <>
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8 text-emerald-500" />
            </div>
            <p className="font-bold text-xl">Email verified!</p>
            <p className="text-sm text-muted-foreground">Redirecting you to your dashboard…</p>
          </>
        )}
        {status === "error" && (
          <>
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
            <p className="font-bold text-xl">Verification failed</p>
            <p className="text-sm text-muted-foreground">{errorMsg}</p>
            <Button onClick={() => navigate("/auth")} className="w-full rounded-xl">
              Back to Sign In
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
