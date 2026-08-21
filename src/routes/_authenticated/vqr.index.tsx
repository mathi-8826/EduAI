import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ArrowLeft, Calculator, MessageSquare, Puzzle, Sparkles, Loader2 } from "lucide-react";
import { generateVqrTest } from "@/lib/vqr.functions";

type Category = "quantitative" | "reasoning" | "verbal";
type Difficulty = "easy" | "medium" | "hard";

const CATEGORIES: {
  key: Category;
  label: string;
  icon: typeof Calculator;
  topics: string[];
}[] = [
  {
    key: "quantitative",
    label: "Quantitative Aptitude",
    icon: Calculator,
    topics: [
      "Percentages",
      "Profit and Loss",
      "Time and Work",
      "Time, Speed and Distance",
      "Ratio and Proportion",
      "Averages and Mixtures",
      "Number System",
      "Permutation and Combination",
      "Probability",
      "Simple and Compound Interest",
    ],
  },
  {
    key: "reasoning",
    label: "Logical Reasoning",
    icon: Puzzle,
    topics: [
      "Blood Relations",
      "Seating Arrangement",
      "Series and Sequences",
      "Coding-Decoding",
      "Syllogisms",
      "Puzzles",
      "Direction Sense",
      "Data Sufficiency",
      "Clocks and Calendars",
      "Statement and Assumptions",
    ],
  },
  {
    key: "verbal",
    label: "Verbal Ability",
    icon: MessageSquare,
    topics: [
      "Synonyms and Antonyms",
      "Reading Comprehension",
      "Sentence Correction",
      "Para Jumbles",
      "Fill in the Blanks",
      "Idioms and Phrases",
      "Spotting Errors",
      "One Word Substitution",
      "Articles and Prepositions",
      "Critical Reasoning",
    ],
  },
];

const DIFFICULTIES: { key: Difficulty; label: string; hint: string; style: string }[] = [
  { key: "easy", label: "Easy", hint: "Warm-up level", style: "text-emerald-600 dark:text-emerald-400" },
  { key: "medium", label: "Medium", hint: "Placement level", style: "text-amber-600 dark:text-amber-400" },
  { key: "hard", label: "Hard", hint: "Top-tier level", style: "text-rose-600 dark:text-rose-400" },
];

export const Route = createFileRoute("/_authenticated/vqr/")({
  head: () => ({
    meta: [
      { title: "VQR Aptitude Tests — EduAI" },
      { name: "description", content: "Pick a topic and difficulty, and AI generates a fresh 10-question aptitude test." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: VqrSetup,
});

function VqrSetup() {
  const navigate = useNavigate();
  const generate = useServerFn(generateVqrTest);
  const [category, setCategory] = useState<Category | null>(null);
  const [topic, setTopic] = useState<string | null>(null);
  const [customTopic, setCustomTopic] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [loading, setLoading] = useState(false);

  const activeCategory = CATEGORIES.find((c) => c.key === category);
  const finalTopic = (customTopic.trim() || topic || "").trim();
  const ready = Boolean(category && finalTopic && difficulty);

  const onGenerate = async () => {
    if (!ready || !category || !difficulty) return;
    setLoading(true);
    try {
      const res = await generate({ data: { category, topic: finalTopic, difficulty } });
      toast.success(`Generated ${res.count} questions on ${finalTopic}`);
      navigate({ to: "/vqr/test/$testId", params: { testId: res.testId } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not generate the test");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60 bg-background/70 backdrop-blur sticky top-0 z-40">
        <div className="mx-auto max-w-5xl px-6 h-16 flex items-center justify-between">
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" /> Dashboard
          </Link>
          <div className="font-semibold">VQR Aptitude</div>
          <div className="w-24" />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10 space-y-10">
        <div className="rounded-2xl bg-gradient-hero p-8 text-primary-foreground shadow-glow">
          <h1 className="text-3xl font-bold">AI-Generated Aptitude Practice</h1>
          <p className="mt-2 opacity-90 max-w-2xl">
            Choose a section, a topic and a difficulty — AI writes a fresh set of 10 MCQs with explanations, then you take
            it as a timed test.
          </p>
        </div>

        <Step n={1} title="Choose a section">
          <div className="grid sm:grid-cols-3 gap-4">
            {CATEGORIES.map((c) => {
              const Icon = c.icon;
              const active = category === c.key;
              return (
                <button
                  key={c.key}
                  onClick={() => {
                    setCategory(c.key);
                    setTopic(null);
                  }}
                  className={`rounded-2xl border p-5 text-left transition ${
                    active ? "border-primary bg-primary/5 shadow-glow" : "border-border bg-card hover:border-primary/40"
                  }`}
                >
                  <div className="size-10 rounded-xl bg-muted grid place-items-center">
                    <Icon className="size-5" />
                  </div>
                  <div className="mt-3 font-semibold">{c.label}</div>
                  <div className="text-xs text-muted-foreground mt-1">{c.topics.length} topics</div>
                </button>
              );
            })}
          </div>
        </Step>

        {activeCategory && (
          <Step n={2} title="Pick a topic">
            <div className="flex flex-wrap gap-2">
              {activeCategory.topics.map((t) => {
                const active = topic === t && !customTopic.trim();
                return (
                  <button
                    key={t}
                    onClick={() => {
                      setTopic(t);
                      setCustomTopic("");
                    }}
                    className={`px-4 h-10 rounded-full border text-sm transition ${
                      active
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card hover:border-primary/40"
                    }`}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
            <input
              value={customTopic}
              onChange={(e) => setCustomTopic(e.target.value)}
              placeholder="Or type your own topic…"
              className="mt-4 w-full sm:max-w-sm h-11 rounded-lg border border-border bg-card px-4 text-sm outline-none focus:border-primary"
            />
          </Step>
        )}

        {activeCategory && finalTopic && (
          <Step n={3} title="Select difficulty">
            <div className="grid sm:grid-cols-3 gap-4">
              {DIFFICULTIES.map((d) => {
                const active = difficulty === d.key;
                return (
                  <button
                    key={d.key}
                    onClick={() => setDifficulty(d.key)}
                    className={`rounded-2xl border p-5 text-left transition ${
                      active ? "border-primary bg-primary/5 shadow-glow" : "border-border bg-card hover:border-primary/40"
                    }`}
                  >
                    <div className={`font-semibold ${d.style}`}>{d.label}</div>
                    <div className="text-xs text-muted-foreground mt-1">{d.hint}</div>
                  </button>
                );
              })}
            </div>
          </Step>
        )}

        <div className="rounded-2xl border border-border bg-card p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="text-sm text-muted-foreground">
            {ready ? (
              <>
                <span className="text-foreground font-medium">10 MCQs</span> on{" "}
                <span className="text-foreground font-medium">{finalTopic}</span> ({difficulty})
              </>
            ) : (
              "Complete the steps above to generate your test."
            )}
          </div>
          <button
            onClick={onGenerate}
            disabled={!ready || loading}
            className="inline-flex items-center justify-center gap-2 h-12 px-6 rounded-lg bg-gradient-primary text-primary-foreground font-semibold hover:opacity-95 disabled:opacity-50 transition"
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            {loading ? "Generating questions…" : "Generate test with AI"}
          </button>
        </div>
      </main>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="flex items-center gap-3 mb-4">
        <span className="size-7 rounded-full bg-primary/10 text-primary grid place-items-center text-sm font-bold">{n}</span>
        <h2 className="text-xl font-bold">{title}</h2>
      </div>
      {children}
    </section>
  );
}
