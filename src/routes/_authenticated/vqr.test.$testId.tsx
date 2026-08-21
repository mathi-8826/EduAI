import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Clock, ChevronLeft, ChevronRight, Flag, CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Test = {
  id: string;
  title: string;
  topic: string;
  category: string;
  duration_minutes: number;
};
type Question = {
  id: string;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
  explanation: string | null;
  topic: string;
};

export const Route = createFileRoute("/_authenticated/vqr/test/$testId")({
  head: () => ({ meta: [{ title: "Taking Test — EduAI" }, { name: "robots", content: "noindex" }] }),
  component: TakeTest,
});

const LETTERS = ["a", "b", "c", "d"] as const;

function TakeTest() {
  const { testId } = Route.useParams();
  const navigate = useNavigate();
  const [test, setTest] = useState<Test | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [started, setStarted] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [current, setCurrent] = useState(0);
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const startedAtRef = useRef<number>(0);

  useEffect(() => {
    (async () => {
      const [{ data: t }, { data: q }] = await Promise.all([
        supabase.from("vqr_tests").select("*").eq("id", testId).maybeSingle(),
        supabase.from("vqr_questions").select("*").eq("test_id", testId),
      ]);
      if (!t) {
        toast.error("Test not found");
        navigate({ to: "/vqr" });
        return;
      }
      const shuffled = ((q ?? []) as Question[]).sort(() => Math.random() - 0.5);
      setTest(t as Test);
      setQuestions(shuffled);
      setSecondsLeft((t as Test).duration_minutes * 60);
      setLoading(false);
    })();
  }, [testId, navigate]);

  const handleSubmit = useMemo(
    () =>
      async (auto = false) => {
        if (submitting || !test) return;
        setSubmitting(true);
        const timeTaken = Math.round((Date.now() - startedAtRef.current) / 1000);
        let correct = 0;
        const topicBreakdown: Record<string, { correct: number; total: number }> = {};
        const answersJson: Record<string, { chosen: string | null; correct: string; is_correct: boolean }> = {};
        questions.forEach((q) => {
          const chosen = answers[q.id] ?? null;
          const isCorrect = !!chosen && chosen === q.correct_answer?.toLowerCase();
          if (isCorrect) correct++;
          const t = q.topic || test.topic;
          topicBreakdown[t] ??= { correct: 0, total: 0 };
          topicBreakdown[t].total++;
          if (isCorrect) topicBreakdown[t].correct++;
          answersJson[q.id] = { chosen, correct: q.correct_answer, is_correct: isCorrect };
        });
        const total = questions.length;
        const accuracy = total ? Math.round((correct / total) * 1000) / 10 : 0;

        const { data: userRes } = await supabase.auth.getUser();
        if (!userRes.user) {
          toast.error("Session expired");
          navigate({ to: "/auth" });
          return;
        }
        const { data: inserted, error } = await supabase
          .from("vqr_results")
          .insert({
            user_id: userRes.user.id,
            test_id: test.id,
            score: correct,
            total,
            accuracy,
            time_taken_seconds: timeTaken,
            topic_breakdown: topicBreakdown,
            answers_json: answersJson,
          })
          .select("id")
          .single();
        setSubmitting(false);
        if (error) {
          toast.error(error.message);
          return;
        }
        if (auto) toast.info("Time's up — auto-submitted");
        else toast.success("Test submitted!");
        navigate({ to: "/vqr/result/$resultId", params: { resultId: inserted.id } });
      },
    [answers, questions, test, submitting, navigate],
  );

  useEffect(() => {
    if (!started) return;
    const id = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(id);
          handleSubmit(true);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [started, handleSubmit]);

  if (loading) return <div className="min-h-screen grid place-items-center text-muted-foreground">Loading test…</div>;
  if (!test) return null;

  if (!started) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border/60">
          <div className="mx-auto max-w-4xl px-6 h-16 flex items-center">
            <Link to="/vqr" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="size-4" /> Back
            </Link>
          </div>
        </header>
        <main className="mx-auto max-w-2xl px-6 py-16">
          <div className="rounded-2xl border border-border bg-card p-8 shadow-glow">
            <p className="text-sm text-primary font-medium uppercase tracking-wide">{test.category}</p>
            <h1 className="text-3xl font-bold mt-1">{test.title}</h1>
            <p className="text-muted-foreground mt-2">{test.topic}</p>
            <div className="mt-6 grid grid-cols-3 gap-4 text-center">
              <Stat label="Questions" value={String(questions.length)} />
              <Stat label="Duration" value={`${test.duration_minutes} min`} />
              <Stat label="Type" value="MCQ" />
            </div>
            <ul className="mt-6 text-sm text-muted-foreground space-y-1.5 list-disc pl-5">
              <li>Timer starts as soon as you click Start.</li>
              <li>You can flag questions and revisit them.</li>
              <li>Test auto-submits when time runs out.</li>
            </ul>
            <button
              disabled={!questions.length}
              onClick={() => {
                startedAtRef.current = Date.now();
                setStarted(true);
              }}
              className="mt-8 w-full h-12 rounded-lg bg-gradient-primary text-primary-foreground font-semibold hover:opacity-95 disabled:opacity-50 transition"
            >
              {questions.length ? "Start Test" : "No questions available"}
            </button>
          </div>
        </main>
      </div>
    );
  }

  const q = questions[current];
  const answeredCount = Object.keys(answers).length;
  const mm = Math.floor(secondsLeft / 60);
  const ss = secondsLeft % 60;
  const timeLow = secondsLeft < 60;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60 bg-background/80 backdrop-blur sticky top-0 z-40">
        <div className="mx-auto max-w-5xl px-6 h-16 flex items-center justify-between">
          <div className="font-semibold truncate">{test.title}</div>
          <div className={`flex items-center gap-2 font-mono font-semibold ${timeLow ? "text-rose-500" : ""}`}>
            <Clock className="size-4" />
            {String(mm).padStart(2, "0")}:{String(ss).padStart(2, "0")}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8 grid lg:grid-cols-[1fr_260px] gap-6">
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Question {current + 1} of {questions.length}</span>
            <button
              onClick={() => {
                setFlagged((prev) => {
                  const next = new Set(prev);
                  if (next.has(q.id)) next.delete(q.id);
                  else next.add(q.id);
                  return next;
                });
              }}
              className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium ${
                flagged.has(q.id) ? "bg-amber-500/15 text-amber-600" : "hover:bg-muted"
              }`}
            >
              <Flag className="size-3.5" /> {flagged.has(q.id) ? "Flagged" : "Flag"}
            </button>
          </div>
          <h2 className="text-lg font-semibold mt-3 leading-relaxed">{q.question}</h2>
          <div className="mt-6 space-y-2.5">
            {LETTERS.map((letter) => {
              const text = q[`option_${letter}` as keyof Question] as string;
              const selected = answers[q.id] === letter;
              const isRevealed = revealed.has(q.id);
              const isCorrect = q.correct_answer?.toLowerCase() === letter;
              const state = isRevealed
                ? isCorrect
                  ? "correct"
                  : selected
                    ? "wrong"
                    : "idle"
                : selected
                  ? "selected"
                  : "idle";
              return (
                <button
                  key={letter}
                  disabled={isRevealed}
                  onClick={() => {
                    setAnswers((a) => ({ ...a, [q.id]: letter }));
                    setRevealed((r) => new Set(r).add(q.id));
                  }}
                  className={`w-full text-left rounded-xl border p-4 flex items-center gap-3 transition disabled:cursor-default ${
                    state === "correct"
                      ? "border-emerald-500 bg-emerald-500/10"
                      : state === "wrong"
                        ? "border-rose-500 bg-rose-500/10"
                        : state === "selected"
                          ? "border-primary bg-primary/5 shadow-sm"
                          : "border-border hover:border-primary/40 hover:bg-muted/40"
                  }`}
                >
                  <span
                    className={`size-8 shrink-0 rounded-lg grid place-items-center font-semibold uppercase text-sm ${
                      state === "correct"
                        ? "bg-emerald-500 text-white"
                        : state === "wrong"
                          ? "bg-rose-500 text-white"
                          : state === "selected"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {letter}
                  </span>
                  <span className="text-sm">{text}</span>
                  {state === "correct" && <CheckCircle2 className="size-4 ml-auto text-emerald-600" />}
                  {state === "wrong" && <XCircle className="size-4 ml-auto text-rose-600" />}
                </button>
              );
            })}
          </div>

          {revealed.has(q.id) && (
            <div
              className={`mt-5 rounded-xl border p-4 text-sm ${
                answers[q.id] === q.correct_answer?.toLowerCase()
                  ? "border-emerald-500/40 bg-emerald-500/5"
                  : "border-rose-500/40 bg-rose-500/5"
              }`}
            >
              <div className="font-semibold">
                {answers[q.id] === q.correct_answer?.toLowerCase()
                  ? "Correct!"
                  : `Incorrect — correct answer is ${q.correct_answer?.toUpperCase()}`}
              </div>
              {q.explanation && <p className="mt-1.5 text-muted-foreground leading-relaxed">{q.explanation}</p>}
            </div>
          )}


          <div className="mt-8 flex items-center justify-between">
            <button
              disabled={current === 0}
              onClick={() => setCurrent((c) => Math.max(0, c - 1))}
              className="inline-flex items-center gap-1 px-4 h-10 rounded-lg border border-border hover:bg-muted disabled:opacity-40"
            >
              <ChevronLeft className="size-4" /> Prev
            </button>
            {current < questions.length - 1 ? (
              <button
                onClick={() => setCurrent((c) => Math.min(questions.length - 1, c + 1))}
                className="inline-flex items-center gap-1 px-4 h-10 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90"
              >
                Next <ChevronRight className="size-4" />
              </button>
            ) : (
              <button
                onClick={() => handleSubmit(false)}
                disabled={submitting}
                className="inline-flex items-center gap-1 px-5 h-10 rounded-lg bg-gradient-primary text-primary-foreground font-semibold hover:opacity-95 disabled:opacity-60"
              >
                <CheckCircle2 className="size-4" /> Submit Test
              </button>
            )}
          </div>
        </div>

        <aside className="rounded-2xl border border-border bg-card p-5 h-fit lg:sticky lg:top-24">
          <div className="text-sm font-semibold">Progress</div>
          <p className="text-xs text-muted-foreground mt-1">
            {answeredCount} / {questions.length} answered
          </p>
          <div className="mt-4 grid grid-cols-6 lg:grid-cols-5 gap-2">
            {questions.map((qq, i) => {
              const answered = qq.id in answers;
              const isCurrent = i === current;
              const isFlagged = flagged.has(qq.id);
              const graded = revealed.has(qq.id);
              const gotIt = graded && answers[qq.id] === qq.correct_answer?.toLowerCase();
              return (
                <button
                  key={qq.id}
                  onClick={() => setCurrent(i)}
                  className={`aspect-square rounded-md text-xs font-semibold border transition relative ${
                    isCurrent
                      ? "border-primary ring-2 ring-primary/30"
                      : graded
                      ? gotIt
                        ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-600"
                        : "border-rose-500/50 bg-rose-500/10 text-rose-600"
                      : answered
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:bg-muted"
                  }`}
                >

                  {i + 1}
                  {isFlagged && <span className="absolute -top-1 -right-1 size-2 rounded-full bg-amber-500" />}
                </button>
              );
            })}
          </div>
          <button
            onClick={() => handleSubmit(false)}
            disabled={submitting}
            className="mt-5 w-full h-10 rounded-lg bg-gradient-primary text-primary-foreground font-semibold hover:opacity-95 disabled:opacity-60"
          >
            Submit Test
          </button>
        </aside>
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted/50 p-4">
      <div className="text-xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}
