import React from "react";

type InterviewProgressProps = {
  currentQuestion: number;
  totalQuestions?: number;
};

export const InterviewProgress: React.FC<InterviewProgressProps> = ({
  currentQuestion,
  totalQuestions = 4,
}) => {
  return (
    <div className="flex flex-col items-center gap-2 my-4">
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Question {currentQuestion} of {totalQuestions}
      </div>
      <div className="flex items-center gap-2">
        {Array.from({ length: totalQuestions }).map((_, index) => {
          const stepNum = index + 1;
          const isCompleted = stepNum <= currentQuestion;
          const isCurrent = stepNum === currentQuestion;

          return (
            <div
              key={index}
              className={`h-2.5 rounded-full transition-all duration-300 ${
                isCurrent
                  ? "w-8 bg-primary shadow-glow"
                  : isCompleted
                  ? "w-2.5 bg-primary/70"
                  : "w-2.5 bg-muted"
              }`}
              title={`Question ${stepNum} of ${totalQuestions}`}
            />
          );
        })}
      </div>
    </div>
  );
};
