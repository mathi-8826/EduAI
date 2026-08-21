import { createFileRoute, Link } from "@tanstack/react-router";
import { Brain, Code2, LineChart, Sparkles, Target, Trophy } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "EduAI — AI-Powered Placement Preparation" },
      { name: "description", content: "Master aptitude, coding, and interviews with AI-driven analytics, adaptive tests, and personalized learning paths built for placements." },
      { property: "og:title", content: "EduAI — AI-Powered Placement Preparation" },
      { property: "og:description", content: "VQR aptitude, coding practice, and AI interview prep — all in one placement-ready platform." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="border-b border-border/60 backdrop-blur bg-background/70 sticky top-0 z-40">
        <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-bold text-lg">
            <div className="size-8 rounded-lg bg-gradient-primary flex items-center justify-center text-primary-foreground">
              <Sparkles className="size-4" />
            </div>
            EduAI
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/auth" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Sign in</Link>
            <Link
              to="/auth"
              search={{ mode: "signup" }}
              className="text-sm font-medium px-4 py-2 rounded-lg bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-95 transition-opacity"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero opacity-10" />
        <div className="relative mx-auto max-w-6xl px-6 py-24 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 text-accent border border-accent/20 text-xs font-medium mb-6">
            <Sparkles className="size-3" /> Powered by Gemini AI
          </div>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight max-w-3xl mx-auto">
            Land your dream job with{" "}
            <span className="bg-gradient-primary bg-clip-text text-transparent">AI-powered prep</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
            Adaptive aptitude tests, real coding challenges, and AI interview coaching — everything you need to crack placements, in one place.
          </p>
          <div className="mt-10 flex items-center justify-center gap-3">
            <Link
              to="/auth"
              search={{ mode: "signup" }}
              className="px-6 py-3 rounded-xl bg-gradient-primary text-primary-foreground font-semibold shadow-glow hover:opacity-95 transition-opacity"
            >
              Start prepping free
            </Link>
            <Link
              to="/auth"
              className="px-6 py-3 rounded-xl border border-border font-semibold hover:bg-muted transition-colors"
            >
              I already have an account
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { icon: Brain, title: "VQR Aptitude", desc: "20-question timed tests across quant, reasoning, and verbal — with topic-wise analytics." },
            { icon: Code2, title: "Coding Practice", desc: "LeetCode-style problems with Monaco editor and multi-language support." },
            { icon: Sparkles, title: "AI Interview Prep", desc: "Gemini generates role-specific questions and evaluates your answers instantly." },
            { icon: LineChart, title: "Progress Analytics", desc: "Weekly trends, accuracy graphs, and weakness detection to guide your prep." },
            { icon: Target, title: "Placement Readiness", desc: "A composite score that tracks how ready you are for real interviews." },
            { icon: Trophy, title: "Streaks & Badges", desc: "Stay consistent with daily challenges and earn achievements." },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-2xl p-6 bg-gradient-card shadow-card border border-border/60">
              <div className="size-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-4">
                <Icon className="size-5" />
              </div>
              <h3 className="font-semibold text-lg">{title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-4xl px-6 pb-24">
        <div className="rounded-3xl bg-gradient-hero p-12 text-center text-primary-foreground shadow-glow">
          <h2 className="text-3xl md:text-4xl font-bold">Ready to ace your placements?</h2>
          <p className="mt-3 opacity-90">Join thousands of students building their careers with EduAI.</p>
          <Link
            to="/auth"
            search={{ mode: "signup" }}
            className="inline-block mt-8 px-6 py-3 rounded-xl bg-background text-foreground font-semibold hover:opacity-95 transition-opacity"
          >
            Create free account
          </Link>
        </div>
      </section>

      <footer className="border-t border-border/60 py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} EduAI — Built for placement success.
      </footer>
    </div>
  );
}
