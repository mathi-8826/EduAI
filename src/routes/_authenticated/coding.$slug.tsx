import { createFileRoute, Link, useNavigate, ClientOnly } from "@tanstack/react-router";
import { useEffect, useState, lazy, Suspense } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  Play,
  Send,
  CheckCircle2,
  XCircle,
  Lightbulb,
  RotateCcw,
  Loader2,
  Sparkles,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { runCodingCode, submitCodingCode } from "@/lib/coding.functions";
import type { CodingLanguage } from "@/lib/coding-ai.server";

type Question = {
  id: string;
  slug: string;
  title: string;
  difficulty: "easy" | "medium" | "hard";
  topic: string;
  language?: CodingLanguage;
  description: string;
  constraints: string | null;
  examples: Array<{ input: string; output: string; explanation?: string }>;
  hints: string[];
  starter_code: Record<string, string>;
  test_cases: Array<any>;
};

type TestResult = {
  passed: boolean;
  input: unknown;
  expected: unknown;
  actual: unknown;
  error?: string | null;
};

type Submission = {
  id: string;
  status: string;
  score: number;
  passed_tests: number;
  total_tests: number;
  language: string;
  submitted_at: string;
};

export const Route = createFileRoute("/_authenticated/coding/$slug")({
  head: () => ({
    meta: [{ title: "Solve Problem — EduAI" }, { name: "robots", content: "noindex" }],
  }),
  component: SolveProblem,
});

function SolveProblem() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const [question, setQuestion] = useState<Question | null>(null);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState("");
  const [results, setResults] = useState<TestResult[] | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showHints, setShowHints] = useState(false);
  const [history, setHistory] = useState<Submission[]>([]);
  const [tab, setTab] = useState<"description" | "submissions">("description");
  const [engineStatus, setEngineStatus] = useState("");

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("coding_questions")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();

      if (error || !data) {
        toast.error("Problem not found");
        navigate({ to: "/coding" });
        return;
      }
      const q = data as unknown as Question;
      const qLang: CodingLanguage = (q.language as any) || "python";

      setQuestion(q);
      const starter =
        q.starter_code?.[qLang] ||
        q.starter_code?.python ||
        (typeof q.starter_code === "string" ? q.starter_code : "");
      setCode(starter);

      const { data: subs } = await supabase
        .from("coding_submissions")
        .select("id,status,score,passed_tests,total_tests,language,submitted_at")
        .eq("question_id", q.id)
        .order("submitted_at", { ascending: false });
      setHistory((subs ?? []) as Submission[]);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  async function runCode(saveAsSubmission: boolean) {
    if (!question) return;
    if (running || submitting) return;

    if (saveAsSubmission) {
      setSubmitting(true);
    } else {
      setRunning(true);
    }

    setResults(null);
    setFeedback(null);
    const lang: CodingLanguage = (question.language as any) || "python";

    try {
      if (saveAsSubmission) {
        setEngineStatus("Executing submission and evaluating test cases...");
        const res: any = await submitCodingCode({
          data: {
            questionId: question.id,
            code,
            language: lang,
          },
        });

        setEngineStatus("");
        setResults(res.results as TestResult[]);
        if (res.feedback) setFeedback(res.feedback);

        if (res.status === "accepted") {
          toast.success(`Accepted! ${res.passed}/${res.total} test cases passed.`);
        } else if (res.status === "partial") {
          toast.warning(`Partial Success: ${res.passed}/${res.total} test cases passed.`);
        } else {
          toast.error(`Submission failed: ${res.passed}/${res.total} test cases passed.`);
        }

        // Refresh submission history
        const { data: subs } = await supabase
          .from("coding_submissions")
          .select("id,status,score,passed_tests,total_tests,language,submitted_at")
          .eq("question_id", question.id)
          .order("submitted_at", { ascending: false });
        setHistory((subs ?? []) as Submission[]);
        setTab("submissions");
      } else {
        setEngineStatus("Running test cases on server...");
        const res: any = await runCodingCode({
          data: {
            questionId: question.id,
            code,
            language: lang,
          },
        });

        setEngineStatus("");
        setResults(res.results as TestResult[]);

        if (res.passed === res.total) {
          toast.success(`All ${res.total} test cases passed!`);
        } else {
          toast.info(`${res.passed}/${res.total} test cases passed.`);
        }
      }
    } catch (e: any) {
      setEngineStatus("");
      console.error("[Coding Test] Evaluation error:", e);
      toast.error(e?.message || "Execution failed. Please check your code and try again.");
    } finally {
      setRunning(false);
      setSubmitting(false);
    }
  }

  function resetCode() {
    if (question) {
      const qLang: CodingLanguage = (question.language as any) || "python";
      const starter =
        question.starter_code?.[qLang] ||
        question.starter_code?.python ||
        (typeof question.starter_code === "string" ? question.starter_code : "");
      setCode(starter);
    }
    setResults(null);
    setFeedback(null);
  }

  if (loading || !question) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        <Loader2 className="size-5 animate-spin mr-2" /> Loading problem…
      </div>
    );
  }

  const diffColor =
    question.difficulty === "easy"
      ? "text-emerald-500"
      : question.difficulty === "medium"
        ? "text-amber-500"
        : "text-rose-500";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="border-b bg-card/40 px-6 py-3 flex items-center justify-between gap-4">
        <Link
          to="/coding"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> All problems
        </Link>
        <div className="flex items-center gap-2">
          <span className="rounded-md border bg-card px-3 py-1.5 text-sm font-semibold uppercase">
            {(question.language || "python")}
          </span>
          <button
            onClick={resetCode}
            className="inline-flex items-center gap-1.5 rounded-md border bg-card px-3 py-1.5 text-sm hover:bg-muted"
          >
            <RotateCcw className="size-4" /> Reset
          </button>
          <button
            onClick={() => runCode(false)}
            disabled={running || submitting}
            className="inline-flex items-center gap-1.5 rounded-md border bg-card px-3 py-1.5 text-sm font-medium hover:bg-muted disabled:opacity-50"
          >
            {running ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
            Run
          </button>
          <button
            onClick={() => runCode(true)}
            disabled={running || submitting}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary text-primary-foreground px-4 py-1.5 text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            Submit
          </button>
        </div>
      </div>

      <div className="flex-1 grid md:grid-cols-2 gap-0 min-h-0">
        <div className="border-r overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center gap-3 flex-wrap mb-2">
              <h1 className="text-2xl font-bold">{question.title}</h1>
              <span className={`text-sm font-medium ${diffColor}`}>{question.difficulty}</span>
              <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">
                {question.topic}
              </span>
            </div>

            <div className="flex gap-1 border-b mb-4 mt-4">
              {(["description", "submissions"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                    tab === t
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t === "description" ? "Description" : `Submissions (${history.length})`}
                </button>
              ))}
            </div>

            {tab === "description" ? (
              <div className="space-y-5">
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{question.description}</p>

                {question.examples?.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2 text-sm">Examples</h3>
                    <div className="space-y-2">
                      {question.examples.map((ex, i) => (
                        <div key={i} className="rounded-md bg-muted/50 p-3 text-sm font-mono">
                          <div>
                            <span className="text-muted-foreground">Input: </span>
                            {ex.input}
                          </div>
                          <div>
                            <span className="text-muted-foreground">Output: </span>
                            {ex.output}
                          </div>
                          {ex.explanation && (
                            <div className="text-muted-foreground text-xs mt-1 font-sans">
                              {ex.explanation}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {question.constraints && (
                  <div>
                    <h3 className="font-semibold mb-2 text-sm">Constraints</h3>
                    <pre className="text-xs whitespace-pre-wrap bg-muted/50 p-3 rounded-md">
                      {question.constraints}
                    </pre>
                  </div>
                )}

                {question.hints?.length > 0 && (
                  <div>
                    <button
                      onClick={() => setShowHints((v) => !v)}
                      className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                    >
                      <Lightbulb className="size-4" />
                      {showHints ? "Hide hints" : `Show ${question.hints.length} hint(s)`}
                    </button>
                    {showHints && (
                      <ul className="mt-2 space-y-1 list-disc list-inside text-sm text-muted-foreground">
                        {question.hints.map((h, i) => (
                          <li key={i}>{h}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <SubmissionsList history={history} />
            )}
          </div>
        </div>

        <div className="flex flex-col min-h-0">
          <div className="flex-1 min-h-[300px]">
            <ClientOnly
              fallback={
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  Loading editor…
                </div>
              }
            >
              <MonacoWrapper
                value={code}
                onChange={setCode}
                language={(question.language as any) || "python"}
              />
            </ClientOnly>
          </div>
          <ResultsPanel results={results} status={engineStatus} feedback={feedback} />
        </div>
      </div>
    </div>
  );
}

function SubmissionsList({ history }: { history: Submission[] }) {
  if (history.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No submissions yet. Submit your solution to see results here.
      </p>
    );
  }
  return (
    <div className="space-y-2">
      {history.map((s) => (
        <div key={s.id} className="flex items-center gap-3 rounded-md border p-3 text-sm">
          {s.status === "accepted" ? (
            <CheckCircle2 className="size-4 text-emerald-500" />
          ) : (
            <XCircle className="size-4 text-rose-500" />
          )}
          <div className="flex-1">
            <div className="font-medium capitalize">{s.status}</div>
            <div className="text-xs text-muted-foreground">
              {s.passed_tests}/{s.total_tests} tests · {s.language} ·{" "}
              {new Date(s.submitted_at).toLocaleString()}
            </div>
          </div>
          <div className="text-sm font-semibold">{s.score}%</div>
        </div>
      ))}
    </div>
  );
}

function ResultsPanel({
  results,
  status,
  feedback,
}: {
  results: TestResult[] | null;
  status: string;
  feedback: string | null;
}) {
  if (status) {
    return (
      <div className="border-t bg-muted/30 p-4 text-sm text-muted-foreground flex items-center gap-2">
        <Loader2 className="size-4 animate-spin" /> {status}
      </div>
    );
  }
  if (!results) {
    return (
      <div className="border-t bg-muted/30 p-4 text-sm text-muted-foreground">
        Write your solution and click <span className="font-medium">Run</span> or{" "}
        <span className="font-medium text-primary">Submit</span> to test it against the problem test cases.
      </div>
    );
  }
  const passed = results.filter((r) => r.passed).length;
  return (
    <div className="border-t bg-card max-h-64 overflow-y-auto space-y-3 p-3">
      <div className="sticky top-0 bg-card border-b pb-2 flex items-center justify-between z-10">
        <div className="text-sm font-semibold">
          Results:{" "}
          <span className={passed === results.length ? "text-emerald-500" : "text-amber-500"}>
            {passed}/{results.length} passed
          </span>
        </div>
      </div>

      {feedback && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-1 text-xs">
          <div className="flex items-center gap-1.5 font-semibold text-primary">
            <Sparkles className="size-3.5" /> AI Feedback & Insights
          </div>
          <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">{feedback}</p>
        </div>
      )}

      <div className="space-y-2">
        {results.map((r, i) => (
          <div
            key={i}
            className={`rounded-md border p-2.5 text-xs font-mono ${
              r.passed ? "border-emerald-500/30 bg-emerald-500/5" : "border-rose-500/30 bg-rose-500/5"
            }`}
          >
            <div className="flex items-center gap-1.5 font-sans font-semibold mb-1">
              {r.passed ? (
                <CheckCircle2 className="size-3.5 text-emerald-500" />
              ) : (
                <XCircle className="size-3.5 text-rose-500" />
              )}
              Test {i + 1}
            </div>
            <div>
              <span className="text-muted-foreground">Input: </span>
              {JSON.stringify(r.input)}
            </div>
            <div>
              <span className="text-muted-foreground">Expected: </span>
              {JSON.stringify(r.expected)}
            </div>
            <div>
              <span className="text-muted-foreground">Got: </span>
              {r.error ? (
                <span className="text-rose-500">Error: {r.error}</span>
              ) : (
                JSON.stringify(r.actual)
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const Editor = lazy(() => import("@monaco-editor/react").then((m) => ({ default: m.default })));

function MonacoWrapper({
  value,
  onChange,
  language = "python",
}: {
  value: string;
  onChange: (v: string) => void;
  language?: string;
}) {
  return (
    <Suspense
      fallback={
        <div className="h-full flex items-center justify-center text-muted-foreground">
          Loading editor…
        </div>
      }
    >
      <Editor
        height="100%"
        language={language === "sql" ? "sql" : language === "java" ? "java" : "python"}
        value={value}
        onChange={(v) => onChange(v ?? "")}
        theme="vs-dark"
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          scrollBeyondLastLine: false,
          tabSize: 4,
          automaticLayout: true,
        }}
      />
    </Suspense>
  );
}

// -- Python execution (Pyodide, in-browser) ---------------------------

const PYODIDE_VERSION = "0.26.4";
type Pyodide = { runPythonAsync: (code: string) => Promise<unknown> };
let pyodidePromise: Promise<Pyodide> | null = null;

async function loadPyodide(): Promise<Pyodide> {
  if (!pyodidePromise) {
    pyodidePromise = (async () => {
      const w = window as unknown as { loadPyodide?: (o: { indexURL: string }) => Promise<Pyodide> };
      if (!w.loadPyodide) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement("script");
          script.src = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/pyodide.js`;
          script.onload = () => resolve();
          script.onerror = () => reject(new Error("Could not load the Python engine"));
          document.head.appendChild(script);
        });
      }
      const loader = (window as unknown as { loadPyodide: (o: { indexURL: string }) => Promise<Pyodide> })
        .loadPyodide;
      return loader({ indexURL: `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/` });
    })().catch((e) => {
      pyodidePromise = null;
      throw e;
    });
  }
  return pyodidePromise;
}

function detectFunctionName(code: string): string | null {
  const matches = [...code.matchAll(/^\s*def\s+([A-Za-z_]\w*)\s*\(/gm)];
  const top = matches.find((m) => !m[0].startsWith(" ") && !m[0].startsWith("\t"));
  return (top ?? matches[0])?.[1] ?? null;
}

async function executePython(
  testCases: Array<{ input: unknown[]; expected: unknown }>,
  code: string,
  onStatus: (s: string) => void
): Promise<TestResult[]> {
  const fnName = detectFunctionName(code);
  if (!fnName) throw new Error("No function found. Keep the function from the starter code.");

  onStatus("Starting Python engine…");
  const py = await loadPyodide();
  onStatus("Running your code…");

  const payload = JSON.stringify(testCases.map((t) => t.input));
  const program = `
import json, traceback

${code}

__inputs = json.loads(${JSON.stringify(payload)})
__results = []
for __case in __inputs:
    try:
        __value = ${fnName}(*__case)
        __results.append({"ok": True, "value": json.loads(json.dumps(__value, default=str))})
    except Exception as __e:
        __results.append({"ok": False, "error": str(__e) or __e.__class__.__name__})

json.dumps(__results)
`;

  let raw: unknown;
  try {
    raw = await py.runPythonAsync(program);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const last = message.trim().split("\n").filter(Boolean).pop() ?? "Python error";
    return testCases.map((tc) => ({
      passed: false,
      input: tc.input,
      expected: tc.expected,
      actual: undefined,
      error: last,
    }));
  }

  const parsed = JSON.parse(String(raw)) as Array<
    { ok: true; value: unknown } | { ok: false; error: string }
  >;

  return testCases.map((tc, i) => {
    const r = parsed[i];
    if (!r || !r.ok) {
      return {
        passed: false,
        input: tc.input,
        expected: tc.expected,
        actual: undefined,
        error: r ? r.error : "No result",
      };
    }
    return {
      passed: deepEqual(r.value, tc.expected),
      input: tc.input,
      expected: tc.expected,
      actual: r.value,
    };
  });
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a === "number" && typeof b === "number") return Math.abs(a - b) < 1e-9;
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((v, i) => deepEqual(v, b[i]));
  }
  if (a && b && typeof a === "object" && typeof b === "object") {
    const ka = Object.keys(a as object);
    const kb = Object.keys(b as object);
    return (
      ka.length === kb.length &&
      ka.every((k) =>
        deepEqual((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k])
      )
    );
  }
  return false;
}
