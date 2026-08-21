import React from "react";
import {
  CheckCircle2,
  AlertTriangle,
  Award,
  Sparkles,
  RotateCcw,
  LayoutDashboard,
  MessageSquare,
  Zap,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { InterviewFeedbackSummary, InterviewType } from "../ai-interview.types";

type InterviewResultProps = {
  interviewType: InterviewType;
  role: string | null;
  feedback: InterviewFeedbackSummary;
  onRestart: () => void;
  onGoToDashboard: () => void;
};

export const InterviewResult: React.FC<InterviewResultProps> = ({
  interviewType,
  role,
  feedback,
  onRestart,
  onGoToDashboard,
}) => {
  // Compute approximate visual scores for progress bars based on feedback content
  const communicationScore = feedback.communication_feedback?.toLowerCase().includes("strong") ||
  feedback.communication_feedback?.toLowerCase().includes("clear")
    ? 85
    : 70;

  const technicalScore = feedback.technical_feedback?.toLowerCase().includes("good") ||
  feedback.technical_feedback?.toLowerCase().includes("strong")
    ? 90
    : 75;

  const confidenceScore = feedback.confidence_feedback?.toLowerCase().includes("confident") ||
  feedback.confidence_feedback?.toLowerCase().includes("positive")
    ? 80
    : 65;

  return (
    <div className="mx-auto max-w-3xl space-y-6 py-4">
      {/* Top Banner */}
      <div className="rounded-2xl bg-gradient-hero p-8 text-primary-foreground shadow-glow space-y-4 text-center sm:text-left">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <Badge className="bg-white/20 text-white border-none font-medium mb-2">
              <Award className="size-3.5 mr-1" /> AI Interview Completed
            </Badge>

            <h1 className="text-2xl sm:text-3xl font-bold">
              {interviewType === "technical" ? `Technical Interview — ${role || "Engineer"}` : "HR Interview"}
            </h1>
          </div>

          <div className="rounded-xl bg-white/15 px-4 py-3 text-center shrink-0">
            <div className="text-2xl font-extrabold leading-none">4 / 4</div>
            <div className="text-xs opacity-80 mt-1">Questions Answered</div>
          </div>
        </div>

        {feedback.final_summary && (
          <p className="text-sm opacity-90 leading-relaxed border-t border-white/15 pt-3 mt-2">
            {feedback.final_summary}
          </p>
        )}
      </div>

      {/* Strengths & Improvements */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Good Areas */}
        <Card className="p-6 space-y-4 border-emerald-500/30 bg-emerald-500/5">
          <div className="flex items-center gap-2 font-bold text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="size-5" />
            <h2 className="text-lg">Good Areas</h2>
          </div>

          <ul className="space-y-2.5 text-sm text-foreground">
            {feedback.strengths.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-emerald-500 font-bold mt-0.5">✓</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </Card>

        {/* Needs Improvement */}
        <Card className="p-6 space-y-4 border-amber-500/30 bg-amber-500/5">
          <div className="flex items-center gap-2 font-bold text-amber-600 dark:text-amber-400">
            <AlertTriangle className="size-5" />
            <h2 className="text-lg">Needs Improvement</h2>
          </div>

          <ul className="space-y-2.5 text-sm text-foreground">
            {feedback.improvements.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-amber-500 font-bold mt-0.5">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {/* Domain Scores & Progress Bars */}
      <Card className="p-6 space-y-6">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Target className="size-5 text-primary" />
          <span>Performance Breakdown</span>
        </h2>

        <div className="space-y-5">
          {/* Communication */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm font-medium">
              <span className="flex items-center gap-2">
                <MessageSquare className="size-4 text-primary" /> Communication
              </span>
              <span className="tabular-nums font-semibold text-primary">{communicationScore}%</span>
            </div>
            <Progress value={communicationScore} className="h-2.5" />
            {feedback.communication_feedback && (
              <p className="text-xs text-muted-foreground">{feedback.communication_feedback}</p>
            )}
          </div>

          {/* Technical / Personality */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm font-medium">
              <span className="flex items-center gap-2">
                <Zap className="size-4 text-primary" />
                {interviewType === "technical" ? "Technical Knowledge" : "Personality & Behavioral"}
              </span>
              <span className="tabular-nums font-semibold text-primary">{technicalScore}%</span>
            </div>
            <Progress value={technicalScore} className="h-2.5" />
            {(feedback.technical_feedback || feedback.personality_feedback) && (
              <p className="text-xs text-muted-foreground">
                {interviewType === "technical" ? feedback.technical_feedback : feedback.personality_feedback}
              </p>
            )}
          </div>

          {/* Confidence */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm font-medium">
              <span className="flex items-center gap-2">
                <Sparkles className="size-4 text-primary" /> Confidence & Presentation
              </span>
              <span className="tabular-nums font-semibold text-primary">{confidenceScore}%</span>
            </div>
            <Progress value={confidenceScore} className="h-2.5" />
            {feedback.confidence_feedback && (
              <p className="text-xs text-muted-foreground">{feedback.confidence_feedback}</p>
            )}
          </div>
        </div>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
        <Button
          onClick={onRestart}
          variant="outline"
          className="w-full sm:w-auto gap-2 font-medium"
        >
          <RotateCcw className="size-4" />
          <span>Start Another Interview</span>
        </Button>

        <Button
          onClick={onGoToDashboard}
          className="w-full sm:w-auto gap-2 font-semibold shadow-glow"
        >
          <LayoutDashboard className="size-4" />
          <span>Back to Dashboard</span>
        </Button>
      </div>
    </div>
  );
};
