import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Sparkles, Mail, Lock, User, Building2, GraduationCap, Calendar, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Search = { mode?: "signup" | "signin" | "magic" };

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    mode: s.mode === "signup" || s.mode === "magic" ? (s.mode as Search["mode"]) : "signin",
  }),
  head: () => ({
    meta: [
      { title: "Sign in — EduAI" },
      { name: "description", content: "Sign in to your EduAI account to continue your placement prep." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { mode } = Route.useSearch();
  const navigate = useNavigate();
  const [role, setRole] = useState<"student" | "admin">("student");
  const [tab, setTab] = useState<"signup" | "signin" | "magic">(mode ?? "signin");
  useEffect(() => { setTab(mode ?? "signin"); }, [mode]);

  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [college, setCollege] = useState("");
  const [department, setDepartment] = useState("");
  const [year, setYear] = useState("");

  const [existingEmail, setExistingEmail] = useState<string | null>(null);
  const [isAdminUser, setIsAdminUser] = useState<boolean>(false);

  useEffect(() => {
    let mounted = true;

    const checkAndRedirectSession = async (user: any) => {
      if (!user || !mounted) return;
      setExistingEmail(user.email ?? null);

      const { data: adminRow } = await supabase
        .from("admin_profiles")
        .select("role, is_active")
        .eq("id", user.id)
        .eq("role", "admin")
        .eq("is_active", true)
        .maybeSingle();

      const isAdmin = Boolean(adminRow);
      setIsAdminUser(isAdmin);

      // Automatically redirect valid authenticated user to appropriate route
      navigate({ to: isAdmin ? "/admin" : "/dashboard", replace: true });
    };

    // 1. Check current session on app/component load
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user && mounted) {
        checkAndRedirectSession(session.user);
      }
    });

    // 2. Listen to auth state changes (OAuth callback, sign in/out)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user && mounted) {
        checkAndRedirectSession(session.user);
      } else if (event === "SIGNED_OUT") {
        setExistingEmail(null);
        setIsAdminUser(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

  const continueSession = () => {
    navigate({ to: isAdminUser ? "/admin" : "/dashboard" });
  };

  const signOutExisting = async () => {
    await supabase.auth.signOut();
    setExistingEmail(null);
    setIsAdminUser(false);
    toast.success("Signed out — you can sign in with another account.");
  };

  const handleAdminSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const adminEmail = email.trim();
    const { data, error } = await supabase.auth.signInWithPassword({ email: adminEmail, password });

    if (error || !data.user) {
      setLoading(false);
      toast.error(error?.message || "Invalid admin credentials");
      return;
    }

    const { data: adminRow } = await supabase
      .from("admin_profiles")
      .select("role, is_active")
      .eq("id", data.user.id)
      .eq("role", "admin")
      .eq("is_active", true)
      .maybeSingle();

    setLoading(false);

    if (!adminRow) {
      await supabase.auth.signOut();
      toast.error("Access Denied: You do not have administrator permissions or your account is inactive.");
      return;
    }

    toast.success("Welcome, admin");
    navigate({ to: "/admin" });
  };


  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const redirectUrl = `${origin}/dashboard`;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: { full_name: fullName, college, department, year },
      },
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Account created! Redirecting to dashboard…");
    navigate({ to: "/dashboard" });
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Welcome back!");
    navigate({ to: "/dashboard" });
  };

  const handleMagic = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${origin}/dashboard` },
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Magic link sent — check your email.");
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const targetRedirect = role === "admin" ? `${origin}/admin` : `${origin}/dashboard`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: targetRedirect,
      },
    });
    if (error) {
      setLoading(false);
      toast.error(error.message);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border/60">
        <div className="mx-auto max-w-6xl px-6 h-16 flex items-center">
          <Link to="/" className="flex items-center gap-2 font-bold text-lg">
            <div className="size-8 rounded-lg bg-gradient-primary flex items-center justify-center text-primary-foreground">
              <Sparkles className="size-4" />
            </div>
            EduAI
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-border/60 bg-gradient-card shadow-card p-8">
            <h1 className="text-2xl font-bold text-center">
              {role === "admin"
                ? "Admin sign in"
                : tab === "signup" ? "Create your account" : tab === "magic" ? "Sign in with email link" : "Welcome back"}
            </h1>
            <p className="text-center text-sm text-muted-foreground mt-1">
              {role === "admin"
                ? "Restricted access for platform administrators"
                : tab === "signup" ? "Start your placement prep journey" : "Continue your placement prep"}
            </p>

            {existingEmail && (
              <div className="mt-6 rounded-lg border border-border bg-muted/50 p-3 text-sm">
                <p className="text-muted-foreground">
                  You're already signed in as <span className="font-medium text-foreground">{existingEmail}</span>.
                </p>
                <div className="mt-2 flex gap-2">
                  <button type="button" onClick={continueSession}
                    className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium">
                    Continue
                  </button>
                  <button type="button" onClick={signOutExisting}
                    className="px-3 py-1.5 rounded-md border border-border text-xs font-medium hover:bg-background">
                    Sign out & use another account
                  </button>
                </div>
              </div>
            )}

            <div className="mt-6">

              <p className="text-xs font-medium text-muted-foreground mb-2 text-center">I am signing in as</p>
              <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-muted text-sm">
                {([
                  { k: "student" as const, label: "Student", Icon: GraduationCap },
                  { k: "admin" as const, label: "Admin", Icon: Shield },
                ]).map(({ k, label, Icon }) => (
                  <button key={k} type="button" onClick={() => setRole(k)}
                    className={`flex items-center justify-center gap-2 px-2 py-2 rounded-md font-medium transition-colors ${role===k ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                    <Icon className="size-4" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {role === "student" && (
              <div className="mt-4 grid grid-cols-3 gap-1 p-1 rounded-lg bg-muted text-sm">
                {(["signin","signup","magic"] as const).map(k => (
                  <button key={k} type="button" onClick={() => setTab(k)}
                    className={`px-2 py-2 rounded-md font-medium transition-colors ${tab===k ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                    {k === "signin" ? "Sign in" : k === "signup" ? "Sign up" : "Magic link"}
                  </button>
                ))}
              </div>
            )}

            {/* Google OAuth Provider Button */}
            <div className="mt-5">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-lg border border-border bg-background hover:bg-muted text-foreground font-medium text-sm transition-colors shadow-sm disabled:opacity-60"
              >
                <svg className="size-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Continue with Google</span>
              </button>
              <div className="relative my-4 flex items-center justify-center">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border/60"></div></div>
                <span className="relative bg-background px-3 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">Or continue with email</span>
              </div>
            </div>

            {role === "admin" ? (
              <form onSubmit={handleAdminSignIn} className="mt-3 space-y-3">
                <Field icon={User} placeholder="Admin email" value={email} onChange={setEmail} required autoComplete="username" />
                <Field icon={Lock} type="password" placeholder="Password" value={password} onChange={setPassword} required autoComplete="current-password" />
                <button type="submit" disabled={loading}
                  className="w-full py-2.5 rounded-lg bg-gradient-primary text-primary-foreground font-semibold shadow-glow hover:opacity-95 transition-opacity disabled:opacity-60">
                  {loading ? "Please wait…" : "Sign in as admin"}
                </button>
              </form>
            ) : (
              <form onSubmit={tab==="signup" ? handleSignUp : tab==="magic" ? handleMagic : handleSignIn} className="mt-3 space-y-3">
                {tab === "signup" && (
                  <>
                    <Field icon={User} placeholder="Full name" value={fullName} onChange={setFullName} required />
                    <Field icon={Building2} placeholder="College" value={college} onChange={setCollege} required />
                    <div className="grid grid-cols-2 gap-3">
                      <Field icon={GraduationCap} placeholder="Department" value={department} onChange={setDepartment} required />
                      <Field icon={Calendar} placeholder="Year (e.g. 3rd)" value={year} onChange={setYear} required />
                    </div>
                  </>
                )}
                <Field icon={Mail} type="email" placeholder="Email address" value={email} onChange={setEmail} required />
                {tab !== "magic" && (
                  <Field icon={Lock} type="password" placeholder="Password (min 6 chars)" value={password} onChange={setPassword} required minLength={6} />
                )}
                <button type="submit" disabled={loading}
                  className="w-full py-2.5 rounded-lg bg-gradient-primary text-primary-foreground font-semibold shadow-glow hover:opacity-95 transition-opacity disabled:opacity-60">
                  {loading ? "Please wait…" : tab === "signup" ? "Create account" : tab === "magic" ? "Send magic link" : "Sign in"}
                </button>
              </form>
            )}

          </div>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            By continuing you agree to our terms and privacy policy.
          </p>
        </div>
      </main>
    </div>
  );
}

function Field({ icon: Icon, onChange, ...props }: {
  icon: React.ComponentType<{ className?: string }>;
  onChange: (v: string) => void;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange">) {
  return (
    <div className="relative">
      <Icon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
      <input
        {...props}
        onChange={(e) => onChange(e.target.value)}
        className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
      />
    </div>
  );
}
