import React, { useState, useEffect } from "react";
import { Send, Sparkles, AlertCircle, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { InterviewProgress } from "./InterviewProgress";
import { VoiceAnswerInput } from "./VoiceAnswerInput";
import type { InterviewQuestionItem, InputMethod, InterviewType } from "../ai-interview.types";

type InterviewQuestionProps = {
  interviewType: InterviewType;
  role: string | null;
  question: InterviewQuestionItem;
  questionNumber: number;
  totalQuestions?: number;
  initialAnswerText?: string;
  onSubmitAnswer: (data: { answerText: string; inputMethod: InputMethod }) => void;
  isSubmitting?: boolean;
};

export const InterviewQuestion: React.FC<InterviewQuestionProps> = ({
  interviewType,
  role,
  question,
  questionNumber,
  totalQuestions = 4,
  initialAnswerText = "",
  onSubmitAnswer,
  isSubmitting = false,
}) => {
  const [answerText, setAnswerText] = useState(initialAnswerText);
  const [usedVoice, setUsedVoice] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    setAnswerText(initialAnswerText || "");
    setUsedVoice(false);
    setValidationError(null);
  }, [question.id, initialAnswerText]);

  const handleVoiceTranscript = (transcript: string) => {
    setUsedVoice(true);
    setValidationError(null);
    setAnswerText((prev) => {
      const space = prev.trim().length > 0 ? " " : "";
      return prev + space + transcript;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanAnswer = answerText.trim();

    if (!cleanAnswer) {
      setValidationError("Please type or record an answer before submitting.");
      return;
    }

    if (cleanAnswer.length < 5) {
      setValidationError("Please provide a more complete answer (at least 5 characters).");
      return;
    }

    setValidationError(null);
    onSubmitAnswer({
      answerText: cleanAnswer,
      inputMethod: usedVoice ? "voice" : "text",
    });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 py-2">
      {/* Top Header & Progress */}
      <div className="flex flex-col items-center text-center space-y-2">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="capitalize font-semibold">
            {interviewType} Interview
          </Badge>
          {role && (
            <Badge variant="secondary" className="font-medium">
              Role: {role}
            </Badge>
          )}
        </div>

        <InterviewProgress currentQuestion={questionNumber} totalQuestions={totalQuestions} />
      </div>

      {/* Question Card */}
      <Card className="p-6 space-y-4 border-primary/30 shadow-card bg-gradient-card">
        <div className="flex items-start gap-3">
          <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
            <HelpCircle className="size-5" />
          </div>
          <div className="space-y-1">
            <span className="text-xs font-semibold text-primary uppercase tracking-wider">
              Question {questionNumber} of {totalQuestions}
            </span>
            <h2 className="text-xl font-bold leading-relaxed text-foreground">
              {question.question}
            </h2>
          </div>
        </div>
      </Card>

      {/* Answer Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label htmlFor="answer-textarea" className="text-sm font-semibold text-foreground">
              Your Answer
            </label>
            <VoiceAnswerInput
              onTranscript={handleVoiceTranscript}
              disabled={isSubmitting}
            />
          </div>

          <Textarea
            id="answer-textarea"
            placeholder="Type your answer here or click 'Start Voice Answer' to speak..."
            value={answerText}
            onChange={(e) => {
              setAnswerText(e.target.value);
              if (validationError) setValidationError(null);
            }}
            disabled={isSubmitting}
            rows={7}
            className="text-base leading-relaxed bg-background resize-y"
          />
        </div>

        {/* Validation message */}
        {validationError && (
          <div className="flex items-center gap-2 text-sm text-destructive font-medium bg-destructive/10 p-3 rounded-lg border border-destructive/30">
            <AlertCircle className="size-4 shrink-0" />
            <span>{validationError}</span>
          </div>
        )}

        {/* Submit button */}
        <div className="flex items-center justify-end">
          <Button
            type="submit"
            disabled={isSubmitting}
            size="lg"
            className="w-full sm:w-auto font-semibold shadow-glow gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="size-4 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin" />
                <span>Evaluating Answer with Gemini...</span>
              </>
            ) : (
              <>
                <Send className="size-4" />
                <span>Submit Answer</span>
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};
