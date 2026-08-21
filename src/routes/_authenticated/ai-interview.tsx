import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { ArrowLeft, Sparkles, AlertCircle } from "lucide-react";
import { AIInterviewHome } from "@/features/ai-interview/components/AIInterviewHome";
import { TechnicalRoleSelector } from "@/features/ai-interview/components/TechnicalRoleSelector";
import { InterviewQuestion } from "@/features/ai-interview/components/InterviewQuestion";
import { AnswerEvaluation } from "@/features/ai-interview/components/AnswerEvaluation";
import { InterviewResult } from "@/features/ai-interview/components/InterviewResult";
import {
  createTechnicalInterview,
  createHrInterview,
  getInterviewDetails,
  submitInterviewAnswer,
  completeInterview,
} from "@/features/ai-interview/ai-interview.functions";
import type {
  InterviewType,
  InterviewSession,
  InterviewQuestionItem,
  AnswerEvaluationResult,
  InterviewFeedbackSummary,
  InputMethod,
} from "@/features/ai-interview/ai-interview.types";

export const Route = createFileRoute("/_authenticated/ai-interview")({
  head: () => ({
    meta: [
      { title: "AI Interview — EduAI" },
      {
        name: "description",
        content: "Practice technical and HR mock interviews powered by Gemini AI with immediate structured feedback.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AIInterviewPage,
});

type Step =
  | "TYPE_SELECTION"
  | "ROLE_SELECTION"
  | "INTERVIEW_QUESTION"
  | "ANSWER_EVALUATION"
  | "INTERVIEW_RESULT";

function AIInterviewPage() {
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>("TYPE_SELECTION");
  const [interviewType, setInterviewType] = useState<InterviewType>("technical");
  const [selectedRole, setSelectedRole] = useState<string | null>(null);

  const [interview, setInterview] = useState<InterviewSession | null>(null);
  const [questions, setQuestions] = useState<InterviewQuestionItem[]>([]);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState<number>(0);
  const [evaluations, setEvaluations] = useState<Record<string, AnswerEvaluationResult>>({});
  const [finalFeedback, setFinalFeedback] = useState<InterviewFeedbackSummary | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSelectType = async (type: InterviewType) => {
    setInterviewType(type);
    setErrorMessage(null);

    if (type === "technical") {
      setStep("ROLE_SELECTION");
    } else {
      // HR Interview - no role selector, generate immediately
      setIsLoading(true);
      try {
        const res = await createHrInterview();
        await loadSession(res.interviewId);
      } catch (err: any) {
        console.error("[AI Interview] Failed to create HR interview:", err);
        setErrorMessage(err?.message || "Could not start HR interview. Please try again.");
        toast.error("Failed to start HR interview");
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleStartTechnical = async (role: string) => {
    setSelectedRole(role);
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await createTechnicalInterview({ data: { role } });
      await loadSession(res.interviewId);
    } catch (err: any) {
      console.error("[AI Interview] Failed to create technical interview:", err);
      setErrorMessage(err?.message || "Could not start Technical interview. Please try again.");
      toast.error("Failed to start Technical interview");
    } finally {
      setIsLoading(false);
    }
  };

  const loadSession = async (interviewId: string) => {
    const data = await getInterviewDetails({ data: { interviewId } });
    if (!data || !data.interview) {
      throw new Error("Interview details could not be loaded.");
    }

    setInterview(data.interview as any);
    setQuestions(data.questions as any[]);

    if (data.interview.interview_type) {
      setInterviewType(data.interview.interview_type as InterviewType);
    }

    if (data.interview.role) {
      setSelectedRole(data.interview.role);
    }

    // Process existing answers and evaluations if resuming
    const evalMap: Record<string, AnswerEvaluationResult> = {};
    (data.answers || []).forEach((ans: any) => {
      evalMap[ans.question_id] = {
        overall_feedback: ans.overall_feedback || "",
        strengths: [],
        improvements: [],
        communication_feedback: ans.communication_feedback || "",
        technical_feedback: ans.technical_feedback || "",
        confidence_feedback: ans.confidence_feedback || "",
        answer_quality: ans.answer_quality || "average",
      };
    });
    setEvaluations(evalMap);

    if (data.feedback) {
      setFinalFeedback(data.feedback as any);
      setStep("INTERVIEW_RESULT");
      return;
    }

    // Determine current step index
    const answeredCount = data.answers?.length || 0;
    if (answeredCount >= 4) {
      // Complete interview if all answered
      try {
        const completeRes = await completeInterview({ data: { interviewId } });
        setFinalFeedback(completeRes.feedback as any);
        setStep("INTERVIEW_RESULT");
      } catch {
        setCurrentQuestionIdx(3);
        setStep("INTERVIEW_QUESTION");
      }
    } else {
      setCurrentQuestionIdx(answeredCount);
      setStep("INTERVIEW_QUESTION");
    }
  };

  const handleSubmitAnswer = async ({
    answerText,
    inputMethod,
  }: {
    answerText: string;
    inputMethod: InputMethod;
  }) => {
    if (!interview || !questions[currentQuestionIdx]) return;

    setIsLoading(true);
    setErrorMessage(null);

    const currentQuestion = questions[currentQuestionIdx];

    try {
      const res = await submitInterviewAnswer({
        data: {
          interviewId: interview.id,
          questionId: currentQuestion.id,
          answerText,
          inputMethod,
        },
      });

      setEvaluations((prev) => ({
        ...prev,
        [currentQuestion.id]: res.evaluation,
      }));

      setStep("ANSWER_EVALUATION");
      toast.success("Answer evaluated!");
    } catch (err: any) {
      console.error("[AI Interview] Submit answer failed:", err);
      setErrorMessage(err?.message || "Failed to submit and evaluate answer. Please try again.");
      toast.error("Failed to submit answer");
    } finally {
      setIsLoading(false);
    }
  };

  const handleNextQuestionOrComplete = async () => {
    if (currentQuestionIdx < 3) {
      setCurrentQuestionIdx((prev) => prev + 1);
      setStep("INTERVIEW_QUESTION");
    } else {
      // Final question reached, trigger completeInterview
      if (!interview) return;
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const res = await completeInterview({
          data: { interviewId: interview.id },
        });

        setFinalFeedback(res.feedback as any);
        setStep("INTERVIEW_RESULT");
        toast.success("AI Interview completed!");
      } catch (err: any) {
        console.error("[AI Interview] Complete interview failed:", err);
        setErrorMessage(err?.message || "Failed to generate final report summary.");
        toast.error("Failed to complete interview");
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleRestart = () => {
    setStep("TYPE_SELECTION");
    setInterview(null);
    setQuestions([]);
    setCurrentQuestionIdx(0);
    setEvaluations({});
    setFinalFeedback(null);
    setSelectedRole(null);
    setErrorMessage(null);
  };

  const currentQuestion = questions[currentQuestionIdx];
  const currentEvaluation = currentQuestion ? evaluations[currentQuestion.id] : null;

  return (
    <div className="min-h-screen bg-background text-foreground pb-12">
      {/* Navigation Header */}
      <header className="border-b border-border/60 bg-background/80 backdrop-blur sticky top-0 z-40">
        <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2 font-bold text-lg">
            <div className="size-8 rounded-lg bg-gradient-primary flex items-center justify-center text-primary-foreground">
              <Sparkles className="size-4" />
            </div>
            EduAI
          </Link>

          <div className="flex items-center gap-4 text-sm font-medium">
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="size-4" /> Dashboard
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="mx-auto max-w-5xl px-6 py-6 space-y-6">
        {/* Error Alert display */}
        {errorMessage && (
          <div className="mx-auto max-w-3xl flex items-center justify-between gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-500">
            <div className="flex items-center gap-2">
              <AlertCircle className="size-5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-xs font-semibold underline underline-offset-2 hover:opacity-80"
            >
              Dismiss
            </button>
          </div>
        )}

        {step === "TYPE_SELECTION" && (
          <AIInterviewHome onSelectType={handleSelectType} isLoading={isLoading} />
        )}

        {step === "ROLE_SELECTION" && (
          <TechnicalRoleSelector
            onBack={() => setStep("TYPE_SELECTION")}
            onSelectRole={handleStartTechnical}
            isLoading={isLoading}
          />
        )}

        {step === "INTERVIEW_QUESTION" && currentQuestion && (
          <InterviewQuestion
            interviewType={interviewType}
            role={selectedRole}
            question={currentQuestion}
            questionNumber={currentQuestionIdx + 1}
            totalQuestions={4}
            onSubmitAnswer={handleSubmitAnswer}
            isSubmitting={isLoading}
          />
        )}

        {step === "ANSWER_EVALUATION" && currentEvaluation && (
          <AnswerEvaluation
            questionNumber={currentQuestionIdx + 1}
            totalQuestions={4}
            evaluation={currentEvaluation}
            onNext={handleNextQuestionOrComplete}
            isLastQuestion={currentQuestionIdx >= 3}
            isLoadingNext={isLoading}
          />
        )}

        {step === "INTERVIEW_RESULT" && finalFeedback && (
          <InterviewResult
            interviewType={interviewType}
            role={selectedRole}
            feedback={finalFeedback}
            onRestart={handleRestart}
            onGoToDashboard={() => navigate({ to: "/dashboard" })}
          />
        )}
      </main>
    </div>
  );
}
