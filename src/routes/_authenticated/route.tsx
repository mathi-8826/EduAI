import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const navigate = useNavigate();
  const { session, loading } = useAuth();

  useEffect(() => {
    if (!loading && !session) {
      navigate({ to: "/auth", replace: true });
    }
  }, [loading, session, navigate]);

  // Wait for authentication state to finish loading before deciding to redirect
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-muted-foreground">
        <Loader2 className="size-8 animate-spin text-primary mb-3" />
        <p className="text-sm font-medium">Authenticating session...</p>
      </div>
    );
  }

  // If loading complete and no session exists, render nothing while redirect fires
  if (!session) {
    return null;
  }

  return <Outlet />;
}


