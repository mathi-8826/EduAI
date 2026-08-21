import React from "react";
import { Code2, Users, Sparkles, ArrowRight, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { InterviewType } from "../ai-interview.types";

type AIInterviewHomeProps = {
  onSelectType: (type: InterviewType) => void;
  isLoading?: boolean;
};

export const AIInterviewHome: React.FC<AIInterviewHomeProps> = ({
  onSelectType,
  isLoading = false,
}) => {
  return (
    <div className="mx-auto max-w-4xl space-y-8 py-4">
      <div className="text-center space-y-3">
        <Badge variant="secondary" className="px-3 py-1 text-xs gap-1.5 font-medium">
          <Sparkles className="size-3.5 text-primary" /> Powered by Gemini AI
        </Badge>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          AI Interview Preparation
        </h1>
        <p className="text-muted-foreground text-base max-w-xl mx-auto">
          Practice interactive mock interviews with instant AI feedback on your technical knowledge, communication, and confidence.
        </p>
      </div>

      <div className="space-y-4">
        <h2 className="text-center text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Choose Interview Type
        </h2>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Technical Interview Card */}
          <Card
            onClick={() => !isLoading && onSelectType("technical")}
            className="group relative cursor-pointer overflow-hidden p-6 transition-all duration-200 hover:shadow-glow hover:border-primary/50"
          >
            <div className="flex flex-col h-full justify-between space-y-6">
              <div className="space-y-4">
                <div className="size-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Code2 className="size-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold group-hover:text-primary transition-colors flex items-center gap-2">
                    Technical Interview
                  </h3>
                  <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                    Evaluate your technical knowledge, problem-solving ability, and role-specific skills with 4 open-ended technical questions.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="rounded-md bg-muted px-2.5 py-1 text-muted-foreground font-medium">
                    4 Questions
                  </span>
                  <span className="rounded-md bg-muted px-2.5 py-1 text-muted-foreground font-medium">
                    Select Role
                  </span>
                  <span className="rounded-md bg-primary/10 text-primary px-2.5 py-1 font-medium">
                    Medium / Hard
                  </span>
                </div>

                <div className="flex items-center text-sm font-semibold text-primary group-hover:translate-x-1 transition-transform">
                  <span>Select Role & Start</span>
                  <ArrowRight className="size-4 ml-1.5" />
                </div>
              </div>
            </div>
          </Card>

          {/* HR Interview Card */}
          <Card
            onClick={() => !isLoading && onSelectType("hr")}
            className="group relative cursor-pointer overflow-hidden p-6 transition-all duration-200 hover:shadow-glow hover:border-accent/50"
          >
            <div className="flex flex-col h-full justify-between space-y-6">
              <div className="space-y-4">
                <div className="size-12 rounded-xl bg-accent/10 text-accent flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Users className="size-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold group-hover:text-accent transition-colors">
                    HR Interview
                  </h3>
                  <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                    Evaluate your communication, personality, confidence, cultural fit, teamwork, and career motivation with 4 open-ended HR questions.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="rounded-md bg-muted px-2.5 py-1 text-muted-foreground font-medium">
                    4 Questions
                  </span>
                  <span className="rounded-md bg-muted px-2.5 py-1 text-muted-foreground font-medium">
                    Behavioral & Culture
                  </span>
                  <span className="rounded-md bg-accent/10 text-accent px-2.5 py-1 font-medium">
                    Instant AI Evaluation
                  </span>
                </div>

                <div className="flex items-center text-sm font-semibold text-accent group-hover:translate-x-1 transition-transform">
                  <span>Start HR Interview</span>
                  <ArrowRight className="size-4 ml-1.5" />
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <div className="rounded-xl border border-border/60 bg-card/40 p-4 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
        <ShieldCheck className="size-4 text-emerald-500" />
        <span>Your responses are securely evaluated by Gemini AI and saved to your EduAI account history.</span>
      </div>
    </div>
  );
};
