import React from "react";
import { CheckCircle2, AlertTriangle, ArrowRight, Sparkles, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { AnswerEvaluationResult, AnswerQuality } from "../ai-interview.types";

type AnswerEvaluationProps = {
  questionNumber: number;
  totalQuestions?: number;
  evaluation: AnswerEvaluationResult;
  onNext: () => void;
  isLastQuestion?: boolean;
  isLoadingNext?: boolean;
};

export const AnswerEvaluation: React.FC<AnswerEvaluationProps> = ({
  questionNumber,
  totalQuestions = 4,
  evaluation,
  onNext,
  isLastQuestion = false,
  isLoadingNext = false,
}) => {
  const getQualityBadgeColor = (quality: AnswerQuality) => {
    switch (quality) {
      case "excellent":
        return "bg-emerald-500/10 text-emerald-500 border-emerald-500/30";
      case "good":
        return "bg-primary/10 text-primary border-primary/30";
      case "average":
        return "bg-amber-500/10 text-amber-500 border-amber-500/30";
      case "poor":
        return "bg-rose-500/10 text-rose-500 border-rose-500/30";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 py-2">
      {/* Top Banner */}
      <div className="rounded-2xl border border-primary/30 bg-gradient-hero p-6 text-primary-foreground shadow-glow space-y-3">
        <div className="flex items-center justify-between">
          <Badge className="bg-white/20 text-white hover:bg-white/30 border-none font-medium">
            Question {questionNumber} of {totalQuestions} Evaluation
          </Badge>

          <Badge
            className={`capitalize border px-3 py-1 font-semibold ${getQualityBadgeColor(
              evaluation.answer_quality
            )}`}
          >
            <Award className="size-3.5 mr-1" />
            Answer Quality: {evaluation.answer_quality}
          </Badge>
        </div>

        <p className="text-sm opacity-95 leading-relaxed">
          {evaluation.overall_feedback}
        </p>
      </div>

      {/* Strengths & Improvements */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Good Areas */}
        <Card className="p-5 space-y-3 border-emerald-500/30 bg-emerald-500/5">
          <div className="flex items-center gap-2 font-bold text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="size-5" />
            <span>Good Areas</span>
          </div>

          <ul className="space-y-2 text-sm text-foreground">
            {evaluation.strengths.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-emerald-500 font-bold mt-0.5">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </Card>

        {/* Needs Improvement */}
        <Card className="p-5 space-y-3 border-amber-500/30 bg-amber-500/5">
          <div className="flex items-center gap-2 font-bold text-amber-600 dark:text-amber-400">
            <AlertTriangle className="size-5" />
            <span>Needs Improvement</span>
          </div>

          <ul className="space-y-2 text-sm text-foreground">
            {evaluation.improvements.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-amber-500 font-bold mt-0.5">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {/* Domain Feedbacks */}
      <Card className="p-5 space-y-4">
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
          Detailed Feedback
        </h3>

        <div className="grid gap-3 text-sm">
          {evaluation.technical_feedback && (
            <div className="rounded-lg bg-muted/40 p-3 space-y-1">
              <span className="font-semibold text-xs text-primary">Technical Correctness & Content</span>
              <p className="text-muted-foreground">{evaluation.technical_feedback}</p>
            </div>
          )}

          {evaluation.communication_feedback && (
            <div className="rounded-lg bg-muted/40 p-3 space-y-1">
              <span className="font-semibold text-xs text-primary">Communication & Clarity</span>
              <p className="text-muted-foreground">{evaluation.communication_feedback}</p>
            </div>
          )}

          {evaluation.confidence_feedback && (
            <div className="rounded-lg bg-muted/40 p-3 space-y-1">
              <span className="font-semibold text-xs text-primary">Confidence & Expression</span>
              <p className="text-muted-foreground">{evaluation.confidence_feedback}</p>
            </div>
          )}
        </div>
      </Card>

      {/* Action Button */}
      <div className="flex justify-end pt-2">
        <Button
          onClick={onNext}
          disabled={isLoadingNext}
          size="lg"
          className="w-full sm:w-auto font-semibold shadow-glow gap-2"
        >
          {isLoadingNext ? (
            <>
              <div className="size-4 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin" />
              <span>Generating Final Report...</span>
            </>
          ) : isLastQuestion ? (
            <>
              <Sparkles className="size-4" />
              <span>View Final Interview Summary</span>
            </>
          ) : (
            <>
              <span>Continue to Question {questionNumber + 1}</span>
              <ArrowRight className="size-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
