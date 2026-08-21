import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ArrowLeft, Code2, Sparkles, Loader2, CheckCircle2, Circle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { generateCodingProblem } from "@/lib/coding.functions";

type Topic =
  | "arrays"
  | "strings"
  | "linked_list"
  | "trees"
  | "graphs"
  | "stack"
  | "queue"
  | "binary_search"
  | "sorting"
  | "dp"
  | "sql";
type Difficulty = "easy" | "medium" | "hard";
type Language = "python" | "java" | "sql";

const LANGUAGES: { key: Language; label: string; hint: string }[] = [
  { key: "python", label: "Python", hint: "Function-based problems, run in browser" },
  { key: "java", label: "Java", hint: "Main class with input/output" },
  { key: "sql", label: "SQL", hint: "Query a seeded practice database" },
];

const CONCEPTS: { key: Topic; label: string; concepts: string[] }[] = [
  { key: "arrays", label: "Arrays", concepts: ["Two Pointers", "Sliding Window", "Prefix Sum", "Kadane's Algorithm", "Matrix Traversal"] },
  { key: "strings", label: "Strings", concepts: ["Palindromes", "Anagrams", "String Compression", "Pattern Matching", "Frequency Counting"] },
  { key: "linked_list", label: "Linked List", concepts: ["Reversal", "Cycle Detection", "Merging Lists", "Middle Element"] },
  { key: "trees", label: "Trees", concepts: ["Traversals", "Depth and Height", "Binary Search Tree", "Lowest Common Ancestor"] },
  { key: "graphs", label: "Graphs", concepts: ["BFS", "DFS", "Connected Components", "Shortest Path"] },
  { key: "stack", label: "Stack", concepts: ["Balanced Parentheses", "Next Greater Element", "Expression Evaluation"] },
  { key: "queue", label: "Queue", concepts: ["Sliding Window Maximum", "Circular Queue", "Task Scheduling"] },
  { key: "binary_search", label: "Binary Search", concepts: ["Search in Sorted Array", "First and Last Position", "Search on Answer"] },
  { key: "sorting", label: "Sorting", concepts: ["Custom Sorting", "Merge Intervals", "Counting Sort", "Top K Elements"] },
  { key: "dp", label: "Dynamic Programming", concepts: ["Fibonacci Style", "Knapsack", "Longest Subsequence", "Grid Paths", "Coin Change"] },
];

const SQL_CONCEPTS: { key: Topic; label: string; concepts: string[] }[] = [
  {
    key: "sql",
    label: "SQL",
    concepts: [
      "SELECT and Filtering",
      "Joins",
      "Group By and Aggregates",
      "Subqueries",
      "Having Clause",
      "Sorting and Limit",
      "Self Join",
      "Case Expressions",
    ],
  },
];

const DIFFICULTIES: { key: Difficulty; label: string; hint: string; style: string }[] = [
  { key: "easy", label: "Easy", hint: "Warm-up level", style: "text-emerald-600 dark:text-emerald-400" },
  { key: "medium", label: "Medium", hint: "Placement level", style: "text-amber-600 dark:text-amber-400" },
  { key: "hard", label: "Hard", hint: "Top-tier level", style: "text-rose-600 dark:text-rose-400" },
];

type Recent = { id: string; slug: string; title: string; difficulty: Difficulty; topic: string; language: string };


export const Route = createFileRoute("/_authenticated/coding/")({
  head: () => ({
    meta: [
      { title: "Coding Practice — EduAI" },
      { name: "description", content: "Pick a concept and difficulty, and AI generates a fresh Python coding problem to solve." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CodingSetup,
});

function CodingSetup() {
  const navigate = useNavigate();
  const generate = useServerFn(generateCodingProblem);

  const [topic, setTopic] = useState<Topic | null>(null);
  const [concept, setConcept] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [loading, setLoading] = useState(false);

  const [recent, setRecent] = useState<Recent[]>([]);
  const [solved, setSolved] = useState<Set<string>>(new Set());

  useEffect(() => {
    (async () => {
      const { data: qs } = await supabase
        .from("coding_questions")
        .select("id,slug,title,difficulty,topic")
        .order("created_at", { ascending: false })
        .limit(10);
      const { data: subs } = await supabase
        .from("coding_submissions")
        .select("question_id,status");
      setRecent((qs ?? []) as Recent[]);
      setSolved(
        new Set(
          (subs ?? []).filter((s) => s.status === "accepted").map((s) => s.question_id as string)
        )
      );
    })();
  }, []);

  const selected = CONCEPTS.find((c) => c.key === topic);
  const ready = topic && concept.trim() && difficulty;

  async function start() {
    if (!ready || !topic || !difficulty) return;
    setLoading(true);
    try {
      const res = await generate({ data: { topic, concept: concept.trim(), difficulty } });
      toast.success("Problem generated — happy coding!");
      navigate({ to: "/coding/$slug", params: { slug: res.slug } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not generate the problem");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card/40">
        <div className="mx-auto max-w-5xl px-6 py-6">
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft className="size-4" /> Back to dashboard
          </Link>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Code2 className="size-8 text-primary" /> Coding Practice
          </h1>
          <p className="text-muted-foreground mt-1">
            Choose a concept and difficulty — AI writes a fresh Python problem and you solve it in the editor.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-6 py-8 space-y-8">
        <section>
          <StepTitle n={1} title="Pick a concept area" />
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {CONCEPTS.map((c) => (
              <button
                key={c.key}
                onClick={() => {
                  setTopic(c.key);
                  setConcept("");
                }}
                className={`rounded-xl border p-3 text-sm font-medium text-left transition-all hover:border-primary/50 ${
                  topic === c.key ? "border-primary bg-primary/5" : "bg-card"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </section>

        {selected && (
          <section>
            <StepTitle n={2} title={`Choose a ${selected.label} concept`} />
            <div className="flex flex-wrap gap-2">
              {selected.concepts.map((t) => (
                <button
                  key={t}
                  onClick={() => setConcept(t)}
                  className={`rounded-full border px-4 py-1.5 text-sm transition-all hover:border-primary/50 ${
                    concept === t ? "border-primary bg-primary/10 text-primary" : "bg-card"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <input
              value={concept}
              onChange={(e) => setConcept(e.target.value)}
              placeholder="…or type your own concept"
              className="mt-3 w-full max-w-sm rounded-md border bg-card px-3 py-2 text-sm"
            />
          </section>
        )}

        {selected && concept.trim() && (
          <section>
            <StepTitle n={3} title="Select difficulty mode" />
            <div className="grid gap-3 sm:grid-cols-3 max-w-2xl">
              {DIFFICULTIES.map((d) => (
                <button
                  key={d.key}
                  onClick={() => setDifficulty(d.key)}
                  className={`rounded-xl border p-4 text-left transition-all hover:border-primary/50 ${
                    difficulty === d.key ? "border-primary bg-primary/5" : "bg-card"
                  }`}
                >
                  <div className={`font-semibold ${d.style}`}>{d.label}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{d.hint}</div>
                </button>
              ))}
            </div>
          </section>
        )}

        <button
          onClick={start}
          disabled={!ready || loading}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {loading ? <Loader2 className="size-5 animate-spin" /> : <Sparkles className="size-5" />}
          {loading ? "Generating your problem…" : "Generate problem"}
        </button>

        {recent.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-3">Recent problems</h2>
            <div className="grid gap-2">
              {recent.map((q) => (
                <Link
                  key={q.id}
                  to="/coding/$slug"
                  params={{ slug: q.slug }}
                  className="group flex items-center gap-3 rounded-xl border bg-card p-3 hover:border-primary/50 transition-all"
                >
                  {solved.has(q.id) ? (
                    <CheckCircle2 className="size-4 text-emerald-500" />
                  ) : (
                    <Circle className="size-4 text-muted-foreground/40" />
                  )}
                  <span className="font-medium group-hover:text-primary transition-colors">{q.title}</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">{q.topic}</span>
                  <span className="text-xs text-muted-foreground ml-auto capitalize">{q.difficulty}</span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function StepTitle({ n, title }: { n: number; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
        {n}
      </span>
      <h2 className="text-lg font-semibold">{title}</h2>
    </div>
  );
}
