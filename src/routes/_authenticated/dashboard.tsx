import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Brain, Code2, LogOut, Sparkles, Flame, User as UserIcon, LineChart as LineChartIcon, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";


export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — EduAI" },
      { name: "description", content: "Your EduAI hub: keep your streak alive and jump into VQR tests, coding practice and AI interviews." },
      { property: "og:title", content: "Dashboard — EduAI" },
      { property: "og:description", content: "Keep your practice streak and start your next EduAI session." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Dashboard,
});

type Profile = { full_name: string };

const MOTIVATIONS = [
  "Small progress every day adds up to big results.",
  "Consistency beats intensity — show up today.",
  "Every question you attempt makes you sharper.",
  "The interview room is won in practice sessions.",
  "One test at a time. One skill at a time.",
];

function dayKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

function computeStreak(dates: string[]) {
  const days = new Set(dates.map((d) => dayKey(new Date(d))));
  if (!days.size) return 0;
  const today = new Date();
  const cursor = new Date(today);
  if (!days.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (days.has(dayKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

type RecentTest = { id: string; label: string; kind: "VQR" | "Coding"; pct: number; date: string };
type Point = { label: string; pct: number };

function Dashboard() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [streak, setStreak] = useState(0);
  const [activeToday, setActiveToday] = useState(false);
  const [recent, setRecent] = useState<RecentTest[]>([]);
  const [vqrTrend, setVqrTrend] = useState<Point[]>([]);
  const [codingTrend, setCodingTrend] = useState<Point[]>([]);
  const [showCharts, setShowCharts] = useState(false);
  const motivation = MOTIVATIONS[new Date().getDate() % MOTIVATIONS.length];

  useEffect(() => {
    (async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;
      const [{ data: p }, { data: r }, { data: c }] = await Promise.all([
        supabase.from("profiles").select("full_name").eq("id", user.user.id).maybeSingle(),
        supabase
          .from("vqr_results")
          .select("id, score, total, created_at, vqr_tests(title)")
          .order("created_at", { ascending: false })
          .limit(200),
        supabase
          .from("coding_submissions")
          .select("id, score, passed_tests, total_tests, submitted_at, coding_questions(title)")
          .order("submitted_at", { ascending: false })
          .limit(200),
      ]);
      setProfile(p as Profile | null);

      const vqrRows = (r ?? []) as {
        id: string; score: number; total: number; created_at: string; vqr_tests: { title: string } | null;
      }[];
      const codingRows = (c ?? []) as {
        id: string; passed_tests: number; total_tests: number; submitted_at: string; coding_questions: { title: string } | null;
      }[];

      const dates = [...vqrRows.map((x) => x.created_at), ...codingRows.map((x) => x.submitted_at)];
      setStreak(computeStreak(dates));
      setActiveToday(dates.some((d) => dayKey(new Date(d)) === dayKey(new Date())));

      const vqrTests: RecentTest[] = vqrRows.map((x) => ({
        id: x.id,
        label: x.vqr_tests?.title ?? "VQR Test",
        kind: "VQR",
        pct: x.total ? Math.round((x.score / x.total) * 100) : 0,
        date: x.created_at,
      }));
      const codingTests: RecentTest[] = codingRows.map((x) => ({
        id: x.id,
        label: x.coding_questions?.title ?? "Coding Problem",
        kind: "Coding",
        pct: x.total_tests ? Math.round((x.passed_tests / x.total_tests) * 100) : 0,
        date: x.submitted_at,
      }));

      setRecent(
        [...vqrTests, ...codingTests]
          .sort((a, b) => +new Date(b.date) - +new Date(a.date))
          .slice(0, 8),
      );
      setVqrTrend(
        vqrTests.slice(0, 10).reverse().map((t, i) => ({ label: `#${i + 1}`, pct: t.pct })),
      );
      setCodingTrend(
        codingTests.slice(0, 10).reverse().map((t, i) => ({ label: `#${i + 1}`, pct: t.pct })),
      );
    })();
  }, []);


  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/" });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60 bg-background/70 backdrop-blur sticky top-0 z-40">
        <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2 font-bold text-lg">
            <div className="size-8 rounded-lg bg-gradient-primary flex items-center justify-center text-primary-foreground">
              <Sparkles className="size-4" />
            </div>
            EduAI
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            <Link to="/dashboard" className="text-foreground">Dashboard</Link>
            <Link to="/vqr" className="text-muted-foreground hover:text-foreground">VQR Tests</Link>
            <Link to="/coding" className="text-muted-foreground hover:text-foreground">Coding</Link>
            <Link to="/ai-interview" className="text-muted-foreground hover:text-foreground">AI Interview</Link>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/profile" className="p-2 rounded-lg hover:bg-muted"><UserIcon className="size-4" /></Link>
            <button onClick={handleSignOut} className="p-2 rounded-lg hover:bg-muted" aria-label="Sign out">
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8 space-y-6">
        <div className="rounded-2xl bg-gradient-hero p-8 text-primary-foreground shadow-glow">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <p className="text-sm opacity-80">Hello,</p>
              <h1 className="text-3xl font-bold mt-1">{profile?.full_name || "Student"} 👋</h1>
              <p className="mt-2 opacity-90">{motivation}</p>
            </div>
            <div className="flex items-center gap-3 rounded-2xl bg-white/15 px-6 py-4">
              <Flame className="size-8" />
              <div>
                <div className="text-3xl font-bold leading-none">{streak}</div>
                <div className="text-xs opacity-80 mt-1">day streak</div>
              </div>
            </div>
          </div>
          <p className="mt-6 text-sm opacity-80">
            {activeToday ? "You've practised today — streak secured." : "Practise once today to keep your streak alive."}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <ActionCard to="/vqr" icon={Brain} title="Start VQR Test" desc="Aptitude — quant, reasoning, verbal" />
          <ActionCard to="/coding" icon={Code2} title="Coding Practice" desc="LeetCode-style problems" />
          <ActionCard to="/ai-interview" icon={Sparkles} title="AI Interview" desc="Technical + HR Interview. Practice with AI feedback" />
        </div>

        {/* Recent tests */}
        <section className="rounded-2xl border border-border/60 bg-card shadow-card p-5">
          <h2 className="font-semibold mb-4">Recent Tests</h2>
          {recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">No attempts yet — take a test to see your scores here.</p>
          ) : (
            <ul className="divide-y divide-border/60">
              {recent.map((t) => (
                <li key={`${t.kind}-${t.id}`} className="flex items-center justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{t.label}</div>
                    <div className="text-xs text-muted-foreground">
                      {t.kind} · {new Date(t.date).toLocaleDateString()}
                    </div>
                  </div>
                  <div className={`text-sm font-semibold tabular-nums ${t.pct >= 60 ? "text-emerald-500" : "text-rose-500"}`}>
                    {t.pct}%
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Score trends */}
        <section className="rounded-2xl border border-border/60 bg-card shadow-card p-5">
          <button
            onClick={() => setShowCharts((v) => !v)}
            className="w-full flex items-center justify-between gap-3 text-left"
            aria-expanded={showCharts}
          >
            <span className="inline-flex items-center gap-2 font-semibold">
              <LineChartIcon className="size-4 text-primary" /> Score Trends
            </span>
            {showCharts ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
          </button>

          {showCharts && (
            <div className="grid lg:grid-cols-2 gap-4 mt-5">
              <TrendChart title="VQR Score Trend" data={vqrTrend} color="var(--color-primary)" />
              <TrendChart title="Coding Score Trend" data={codingTrend} color="var(--color-accent, var(--color-primary))" />
            </div>
          )}
        </section>

      </main>
    </div>
  );
}

function ActionCard({ to, icon: Icon, title, desc }: {
  to: string; icon: React.ComponentType<{ className?: string }>; title: string; desc: string;
}) {
  return (
    <Link to={to} className="group rounded-2xl border border-border/60 bg-gradient-card shadow-card p-5 hover:shadow-glow transition-shadow">
      <div className="flex items-start gap-4">
        <div className="size-10 rounded-lg bg-gradient-primary text-primary-foreground flex items-center justify-center">
          <Icon className="size-5" />
        </div>
        <div>
          <div className="font-semibold group-hover:text-primary transition-colors">{title}</div>
          <div className="text-sm text-muted-foreground">{desc}</div>
        </div>
      </div>
    </Link>
  );
}

function TrendChart({ title, data, color }: { title: string; data: { label: string; pct: number }[]; color: string }) {
  return (
    <div className="rounded-xl border border-border/60 p-4">
      <div className="text-sm font-medium mb-3">{title}</div>
      {data.length === 0 ? (
        <p className="text-sm text-muted-foreground">No attempts yet.</p>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis dataKey="label" stroke="var(--color-muted-foreground)" fontSize={12} />
            <YAxis domain={[0, 100]} stroke="var(--color-muted-foreground)" fontSize={12} />
            <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8 }} />
            <Line type="monotone" dataKey="pct" stroke={color} strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
