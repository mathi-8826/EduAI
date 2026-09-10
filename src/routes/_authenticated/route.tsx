import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    let mounted = true;

    // 1. Fetch current session on initialization
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      if (!mounted) return;
      setSession(initialSession);
      setLoading(false);
    });

    // 2. Listen for auth state changes (OAuth callback, refresh, sign in/out)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, currentSession) => {
      if (!mounted) return;
      setSession(currentSession);
      setLoading(false);

      if (event === "SIGNED_OUT" || (!currentSession && event !== "INITIAL_SESSION")) {
        navigate({ to: "/auth", replace: true });
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

  // Wait for authentication state to finish loading before deciding to redirect
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-muted-foreground">
        <Loader2 className="size-8 animate-spin text-primary mb-3" />
        <p className="text-sm font-medium">Authenticating session...</p>
      </div>
    );
  }

  // If loading complete and no session exists, redirect to /auth
  if (!session) {
    navigate({ to: "/auth", replace: true });
    return null;
  }

  return <Outlet />;
}

