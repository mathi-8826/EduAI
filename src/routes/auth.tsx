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

const ADMIN_EMAIL = "admin@prepai.local";

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

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setExistingEmail(data.user?.email ?? null);
    });
  }, []);

  const continueSession = () => {
    navigate({ to: existingEmail === ADMIN_EMAIL ? "/admin" : "/dashboard" });
  };

  const signOutExisting = async () => {
    await supabase.auth.signOut();
    setExistingEmail(null);
    toast.success("Signed out — you can sign in with another account.");
  };

  const handleAdminSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const adminEmail = email.includes("@") ? email.trim() : `${email.trim().toLowerCase()}@prepai.local`;
    const { data, error } = await supabase.auth.signInWithPassword({ email: adminEmail, password });
    setLoading(false);
    if (error || data.user?.email !== ADMIN_EMAIL) {
      if (data.user && data.user.email !== ADMIN_EMAIL) await supabase.auth.signOut();
      toast.error("Invalid admin credentials");
      return;
    }
    toast.success("Welcome, admin");
    navigate({ to: "/admin" });
  };


  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const redirectUrl = `${window.location.origin}/dashboard`;
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
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/dashboard` },
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Magic link sent — check your email.");
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

            {role === "admin" ? (
              <form onSubmit={handleAdminSignIn} className="mt-6 space-y-3">
                <Field icon={User} placeholder="Admin username" value={email} onChange={setEmail} required autoComplete="username" />
                <Field icon={Lock} type="password" placeholder="Password" value={password} onChange={setPassword} required autoComplete="current-password" />
                <button type="submit" disabled={loading}
                  className="w-full py-2.5 rounded-lg bg-gradient-primary text-primary-foreground font-semibold shadow-glow hover:opacity-95 transition-opacity disabled:opacity-60">
                  {loading ? "Please wait…" : "Sign in as admin"}
                </button>
              </form>
            ) : (
              <form onSubmit={tab==="signup" ? handleSignUp : tab==="magic" ? handleMagic : handleSignIn} className="mt-6 space-y-3">
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
