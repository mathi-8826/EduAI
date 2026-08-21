export type InterviewType = "technical" | "hr";
export type InputMethod = "text" | "voice";
export type AnswerQuality = "poor" | "average" | "good" | "excellent";

export type TECHNICAL_ROLES = [
  "Software Developer",
  "Full Stack Developer",
  "Frontend Developer",
  "Backend Developer",
  "Data Scientist",
  "Data Analyst",
  "Java Developer",
  "Python Developer",
  "AI/ML Engineer",
  "QA / Automation Tester",
  "SQL / Database Developer",
];

export const PREDEFINED_ROLES = [
  "Software Developer",
  "Full Stack Developer",
  "Frontend Developer",
  "Backend Developer",
  "Data Scientist",
  "Data Analyst",
  "Java Developer",
  "Python Developer",
  "AI/ML Engineer",
  "QA / Automation Tester",
  "SQL / Database Developer",
];

export type InterviewSession = {
  id: string;
  user_id: string;
  interview_type: InterviewType;
  role: string | null;
  difficulty: string;
  total_questions: number;
  completed_questions: number;
  status: "in_progress" | "completed" | "abandoned";
  overall_feedback?: string | null;
  created_at: string;
  completed_at?: string | null;
};

export type InterviewQuestionItem = {
  id: string;
  interview_id: string;
  question_number: number;
  question: string;
  category: string;
  created_at: string;
};

export type InterviewAnswerItem = {
  id: string;
  interview_id: string;
  question_id: string;
  user_id: string;
  answer_text: string;
  input_method: InputMethod;
  overall_feedback: string | null;
  communication_feedback: string | null;
  technical_feedback: string | null;
  confidence_feedback: string | null;
  answer_quality: AnswerQuality | null;
  created_at: string;
};

export type InterviewFeedbackSummary = {
  id: string;
  interview_id: string;
  strengths: string[];
  improvements: string[];
  communication_feedback: string | null;
  technical_feedback: string | null;
  confidence_feedback: string | null;
  personality_feedback: string | null;
  cultural_fit_feedback: string | null;
  final_summary: string | null;
  created_at: string;
};

export type AnswerEvaluationResult = {
  overall_feedback: string;
  strengths: string[];
  improvements: string[];
  communication_feedback: string;
  technical_feedback: string;
  confidence_feedback: string;
  answer_quality: AnswerQuality;
};

export type GeneratedQuestion = {
  question_number: number;
  question: string;
  category: string;
};

export type FinalInterviewSummaryResult = {
  strengths: string[];
  improvements: string[];
  communication_feedback: string;
  technical_feedback: string;
  confidence_feedback: string;
  personality_feedback: string;
  cultural_fit_feedback: string;
  final_summary: string;
};
