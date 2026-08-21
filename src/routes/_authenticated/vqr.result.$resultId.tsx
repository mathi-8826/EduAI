import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, XCircle, Clock, Target, Trophy, RotateCcw, LayoutDashboard } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

type Result = {
  id: string;
  test_id: string;
  score: number;
  total: number;
  accuracy: number;
  time_taken_seconds: number;
  topic_breakdown: Record<string, { correct: number; total: number }>;
  answers_json: Record<string, { chosen: string | null; correct: string; is_correct: boolean }>;
  created_at: string;
};
type Test = { id: string; title: string; topic: string; category: string };
type Question = {
  id: string;
  question: string;
  option_a: string; option_b: string; option_c: string; option_d: string;
  correct_answer: string;
  explanation: string | null;
  topic: string;
};

export const Route = createFileRoute("/_authenticated/vqr/result/$resultId")({
  head: () => ({ meta: [{ title: "Test Results — EduAI" }, { name: "robots", content: "noindex" }] }),
  component: ResultPage,
});

function ResultPage() {
  const { resultId } = Route.useParams();
  const navigate = useNavigate();
  const [result, setResult] = useState<Result | null>(null);
  const [test, setTest] = useState<Test | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: r } = await supabase.from("vqr_results").select("*").eq("id", resultId).maybeSingle();
      if (!r) { navigate({ to: "/vqr" }); return; }
      const [{ data: t }, { data: q }] = await Promise.all([
        supabase.from("vqr_tests").select("*").eq("id", r.test_id).maybeSingle(),
        supabase.from("vqr_questions").select("*").eq("test_id", r.test_id),
      ]);
      setResult(r as unknown as Result);
      setTest(t as Test | null);
      setQuestions((q ?? []) as Question[]);
      setLoading(false);
    })();
  }, [resultId, navigate]);

  if (loading || !result || !test) {
    return <div className="min-h-screen grid place-items-center text-muted-foreground">Loading results…</div>;
  }

  const pct = Math.round((result.score / result.total) * 100);
  const passed = pct >= 60;
  const mm = Math.floor(result.time_taken_seconds / 60);
  const ss = result.time_taken_seconds % 60;

  const pieData = [
    { name: "Correct", value: result.score, color: "var(--color-primary)" },
    { name: "Wrong", value: Math.max(0, result.total - result.score), color: "var(--color-muted)" },
  ];
  const topicData = Object.entries(result.topic_breakdown || {}).map(([topic, v]) => ({
    topic,
    pct: v.total ? Math.round((v.correct / v.total) * 100) : 0,
    correct: v.correct,
    total: v.total,
  }));

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60 bg-background/80 backdrop-blur sticky top-0 z-40">
        <div className="mx-auto max-w-5xl px-6 h-16 flex items-center justify-between">
          <Link to="/vqr" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" /> All Tests
          </Link>
          <div className="font-semibold truncate">{test.title} — Results</div>
          <div className="w-24" />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10 space-y-8">
        {/* Hero */}
        <div className={`rounded-2xl p-8 text-primary-foreground shadow-glow ${passed ? "bg-gradient-hero" : "bg-gradient-to-br from-rose-500 to-rose-700"}`}>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <p className="text-sm opacity-80 uppercase tracking-wide">{test.category} · {test.topic}</p>
              <h1 className="text-3xl font-bold mt-1">{passed ? "Great work!" : "Keep practicing"}</h1>
              <p className="mt-2 opacity-90">You scored {result.score} out of {result.total} ({pct}%).</p>
            </div>
            <div className="text-center">
              <div className="text-5xl font-black">{pct}%</div>
              <div className="text-xs opacity-80 mt-1">Final Score</div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={Trophy} label="Score" value={`${result.score}/${result.total}`} />
          <StatCard icon={Target} label="Accuracy" value={`${result.accuracy}%`} />
          <StatCard icon={Clock} label="Time Taken" value={`${mm}m ${ss}s`} />
          <StatCard icon={CheckCircle2} label="Status" value={passed ? "Passed" : "Retry"} />
        </div>

        {/* Charts */}
        <div className="grid lg:grid-cols-2 gap-4">
          <Card title="Score Overview">
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={2} dataKey="value">
                  {pieData.map((d) => <Cell key={d.name} fill={d.color} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          </Card>
          <Card title="Topic Breakdown">
            {topicData.length ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={topicData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="topic" stroke="var(--color-muted-foreground)" fontSize={11} />
                  <YAxis stroke="var(--color-muted-foreground)" fontSize={12} domain={[0, 100]} />
                  <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8 }} />
                  <Bar dataKey="pct" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-sm text-muted-foreground">No topic data.</p>}
          </Card>
        </div>

        {/* Question review */}
        <Card title="Question Review">
          <div className="space-y-4">
            {questions.map((q, idx) => {
              const a = result.answers_json[q.id];
              const chosen = a?.chosen ?? null;
              const isCorrect = a?.is_correct ?? false;
              return (
                <div key={q.id} className="rounded-xl border border-border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>Q{idx + 1}</span>
                        <span>·</span>
                        <span>{q.topic}</span>
                      </div>
                      <p className="mt-1 font-medium">{q.question}</p>
                    </div>
                    {isCorrect ? (
                      <CheckCircle2 className="size-5 text-emerald-500 shrink-0" />
                    ) : (
                      <XCircle className="size-5 text-rose-500 shrink-0" />
                    )}
                  </div>
                  <div className="mt-3 grid sm:grid-cols-2 gap-2">
                    {(["a", "b", "c", "d"] as const).map((letter) => {
                      const text = q[`option_${letter}` as keyof Question] as string;
                      const isRight = q.correct_answer === letter;
                      const isChosen = chosen === letter;
                      return (
                        <div
                          key={letter}
                          className={`rounded-lg border p-2.5 text-sm flex items-center gap-2 ${
                            isRight
                              ? "border-emerald-500/50 bg-emerald-500/5"
                              : isChosen
                              ? "border-rose-500/50 bg-rose-500/5"
                              : "border-border"
                          }`}
                        >
                          <span className="size-6 rounded-md bg-muted grid place-items-center text-xs font-semibold uppercase">{letter}</span>
                          <span className="flex-1">{text}</span>
                          {isRight && <CheckCircle2 className="size-4 text-emerald-500" />}
                          {isChosen && !isRight && <XCircle className="size-4 text-rose-500" />}
                        </div>
                      );
                    })}
                  </div>
                  {q.explanation && (
                    <div className="mt-3 text-sm bg-muted/40 rounded-lg p-3">
                      <span className="font-semibold">Explanation: </span>
                      <span className="text-muted-foreground">{q.explanation}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        <div className="flex flex-wrap gap-3 justify-center pt-4">
          <Link
            to="/vqr/test/$testId"
            params={{ testId: test.id }}
            className="inline-flex items-center gap-2 h-11 px-5 rounded-lg bg-gradient-primary text-primary-foreground font-semibold hover:opacity-95"
          >
            <RotateCcw className="size-4" /> Retake Test
          </Link>
          <Link to="/vqr" className="inline-flex items-center gap-2 h-11 px-5 rounded-lg border border-border hover:bg-muted font-medium">
            More Tests
          </Link>
          <Link to="/dashboard" className="inline-flex items-center gap-2 h-11 px-5 rounded-lg border border-border hover:bg-muted font-medium">
            <LayoutDashboard className="size-4" /> Dashboard
          </Link>
        </div>
      </main>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h3 className="font-semibold mb-3">{title}</h3>
      {children}
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: typeof Clock; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <div className="size-9 rounded-lg bg-primary/10 text-primary grid place-items-center">
          <Icon className="size-4" />
        </div>
      </div>
      <div className="mt-3 text-xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
