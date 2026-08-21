import { GoogleGenAI, Type } from "@google/genai";
import type {
  AnswerEvaluationResult,
  FinalInterviewSummaryResult,
  GeneratedQuestion,
} from "./ai-interview.types";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function parseCleanJson<T = any>(rawText: string): T {
  if (!rawText || typeof rawText !== "string") {
    throw new Error("Empty response from Gemini.");
  }

  let text = rawText.trim();
  text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

  const firstBrace = text.search(/[\{\[]/);
  const lastBrace = text.search(/[\}\]][^\}\]]*$/);

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace >= firstBrace) {
    text = text.slice(firstBrace, lastBrace + 1);
  }

  try {
    return JSON.parse(text);
  } catch (firstErr) {
    let repaired = text.replace(/,\s*([\}\]])/g, "$1");
    repaired = repaired.replace(/\/\/.*/g, "");
    try {
      return JSON.parse(repaired);
    } catch {
      throw firstErr;
    }
  }
}

async function generateWithRetry(
  prompt: string,
  responseSchema?: any,
  maxAttempts = 4
) {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const config: any = {
        temperature: 0.7,
        maxOutputTokens: 4000,
        responseMimeType: "application/json",
      };

      if (responseSchema) {
        config.responseSchema = responseSchema;
      }

      return await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config,
      });
    } catch (error: any) {
      lastError = error;

      const status =
        error?.status ??
        error?.code ??
        error?.response?.status;

      const retryable =
        status === 429 ||
        status === 500 ||
        status === 502 ||
        status === 503 ||
        status === 504;

      if (!retryable || attempt === maxAttempts) {
        throw error;
      }

      const baseDelay = 1000 * Math.pow(2, attempt - 1);
      const jitter = Math.floor(Math.random() * 500);
      const delay = baseDelay + jitter;

      console.warn(
        `[AI Interview Gemini] Request failed (attempt ${attempt}/${maxAttempts}). Retrying in ${delay}ms...`
      );

      await sleep(delay);
    }
  }

  throw lastError;
}

const questionsListSchema = {
  type: Type.OBJECT,
  properties: {
    questions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          question_number: { type: Type.INTEGER },
          question: { type: Type.STRING },
          category: { type: Type.STRING },
        },
        required: ["question_number", "question", "category"],
      },
    },
  },
  required: ["questions"],
};

export async function generateTechnicalQuestionsAI(
  role: string
): Promise<GeneratedQuestion[]> {
  const prompt = `
You are an expert technical interviewer conducting a campus placement interview.

Role: ${role}

Generate exactly 4 open-ended technical interview questions.

Difficulty:
medium to hard.

Do not generate MCQs (multiple choice questions).

Questions must test:
- Core technical knowledge
- Problem solving
- Practical understanding
- Real-world application

Do not repeat questions.
Ensure each question is clear, non-duplicate, practical, interview-oriented, and focused on problem-solving and technical understanding for a ${role}.

Return JSON only.
`;

  const response = await generateWithRetry(prompt, questionsListSchema);
  const text = response.text;
  if (!text) {
    throw new Error("Gemini returned an empty response for technical questions.");
  }

  const parsed = parseCleanJson<{ questions: GeneratedQuestion[] }>(text);
  if (!parsed || !Array.isArray(parsed.questions)) {
    throw new Error("Failed to parse technical questions from Gemini output.");
  }

  const validQuestions = parsed.questions
    .filter(
      (q) =>
        q &&
        typeof q.question === "string" &&
        q.question.trim().length > 10
    )
    .map((q, idx) => ({
      question_number: idx + 1,
      question: q.question.trim(),
      category: "technical",
    }));

  if (validQuestions.length < 4) {
    throw new Error("Gemini did not return 4 valid technical questions.");
  }

  return validQuestions.slice(0, 4);
}

export async function generateHrQuestionsAI(): Promise<GeneratedQuestion[]> {
  const prompt = `
You are an experienced HR interviewer for campus placement interviews.

Generate exactly 4 open-ended HR interview questions.

Do not use role selection.

Evaluate across the 4 questions:
- Communication
- Personality
- Confidence
- Teamwork
- Adaptability
- Career motivation
- Behaviour
- Cultural fit

Questions should be varied and cover different HR aspects (e.g. Question 1 on Communication/Self-introduction, Question 2 on Personality/Weaknesses/Strengths, Question 3 on Behaviour/Handling difficult situations, Question 4 on Cultural Fit/Career Motivation/Teamwork).

Do not generate MCQs.

Return JSON only.
`;

  const response = await generateWithRetry(prompt, questionsListSchema);
  const text = response.text;
  if (!text) {
    throw new Error("Gemini returned an empty response for HR questions.");
  }

  const parsed = parseCleanJson<{ questions: GeneratedQuestion[] }>(text);
  if (!parsed || !Array.isArray(parsed.questions)) {
    throw new Error("Failed to parse HR questions from Gemini output.");
  }

  const defaultCategories = ["communication", "personality", "behaviour", "cultural_fit"];

  const validQuestions = parsed.questions
    .filter(
      (q) =>
        q &&
        typeof q.question === "string" &&
        q.question.trim().length > 5
    )
    .map((q, idx) => ({
      question_number: idx + 1,
      question: q.question.trim(),
      category: q.category || defaultCategories[idx % defaultCategories.length],
    }));

  if (validQuestions.length < 4) {
    throw new Error("Gemini did not return 4 valid HR questions.");
  }

  return validQuestions.slice(0, 4);
}

const answerEvalSchema = {
  type: Type.OBJECT,
  properties: {
    overall_feedback: { type: Type.STRING },
    strengths: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    improvements: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    communication_feedback: { type: Type.STRING },
    technical_feedback: { type: Type.STRING },
    confidence_feedback: { type: Type.STRING },
    answer_quality: {
      type: Type.STRING,
      enum: ["poor", "average", "good", "excellent"],
    },
  },
  required: [
    "overall_feedback",
    "strengths",
    "improvements",
    "communication_feedback",
    "technical_feedback",
    "confidence_feedback",
    "answer_quality",
  ],
};

export async function evaluateTechnicalAnswerAI(
  question: string,
  answer: string,
  role: string
): Promise<AnswerEvaluationResult> {
  const prompt = `
You are an expert technical interviewer evaluating a campus placement candidate for the role of: ${role}.

Question: "${question}"
Candidate Answer: "${answer}"

Evaluate the candidate's answer based on:
1. Technical correctness
2. Understanding
3. Problem-solving ability
4. Relevance
5. Clarity
6. Practical knowledge
7. Explanation quality

Identify:
- Strengths (list 2-4 bullet points of clear technical good areas)
- Areas requiring improvement (list 2-4 bullet points of constructive improvement areas)
- Overall feedback
- Communication feedback (clarity and structure)
- Technical feedback (correctness and depth)
- Confidence feedback (tone and directness)
- Answer quality ("poor", "average", "good", or "excellent")

Do not invent skills that are not demonstrated. Focus heavily on technical correctness and explanation quality.

Return structured JSON only.
`;

  const response = await generateWithRetry(prompt, answerEvalSchema);
  const text = response.text;
  if (!text) {
    throw new Error("Gemini returned empty evaluation.");
  }

  const parsed = parseCleanJson<AnswerEvaluationResult>(text);

  return {
    overall_feedback: parsed.overall_feedback || "Answer submitted and reviewed.",
    strengths: Array.isArray(parsed.strengths) && parsed.strengths.length > 0 ? parsed.strengths : ["Submitted a valid answer."],
    improvements: Array.isArray(parsed.improvements) && parsed.improvements.length > 0 ? parsed.improvements : ["Add more specific practical details."],
    communication_feedback: parsed.communication_feedback || "Clear response provided.",
    technical_feedback: parsed.technical_feedback || "Relevant concepts mentioned.",
    confidence_feedback: parsed.confidence_feedback || "Good effort in explanation.",
    answer_quality: ["poor", "average", "good", "excellent"].includes(parsed.answer_quality)
      ? parsed.answer_quality
      : "average",
  };
}

export async function evaluateHrAnswerAI(
  question: string,
  answer: string
): Promise<AnswerEvaluationResult> {
  const prompt = `
You are an experienced HR interviewer evaluating a campus placement candidate.

Question: "${question}"
Candidate Answer: "${answer}"

Evaluate the candidate's answer based on:
1. Communication
2. Clarity
3. Confidence
4. Personality
5. Behaviour
6. Teamwork
7. Adaptability
8. Cultural fit
9. Relevance

Identify:
- Strengths (list 2-4 bullet points of good communication and personality traits)
- Areas requiring improvement (list 2-4 bullet points of constructive improvement areas)
- Overall feedback
- Communication feedback
- Technical feedback / Behavioral feedback
- Confidence feedback
- Answer quality ("poor", "average", "good", or "excellent")

Do not make judgments unrelated to the answer. Focus heavily on communication, confidence, personality, behavioral response, and cultural fit.

Return structured JSON only.
`;

  const response = await generateWithRetry(prompt, answerEvalSchema);
  const text = response.text;
  if (!text) {
    throw new Error("Gemini returned empty evaluation.");
  }

  const parsed = parseCleanJson<AnswerEvaluationResult>(text);

  return {
    overall_feedback: parsed.overall_feedback || "Response evaluated successfully.",
    strengths: Array.isArray(parsed.strengths) && parsed.strengths.length > 0 ? parsed.strengths : ["Communicated clearly."],
    improvements: Array.isArray(parsed.improvements) && parsed.improvements.length > 0 ? parsed.improvements : ["Provide more specific behavioral examples."],
    communication_feedback: parsed.communication_feedback || "Good tone and articulation.",
    technical_feedback: parsed.technical_feedback || "Solid response structure.",
    confidence_feedback: parsed.confidence_feedback || "Positive and expressive tone.",
    answer_quality: ["poor", "average", "good", "excellent"].includes(parsed.answer_quality)
      ? parsed.answer_quality
      : "average",
  };
}

const finalSummarySchema = {
  type: Type.OBJECT,
  properties: {
    strengths: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    improvements: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    communication_feedback: { type: Type.STRING },
    technical_feedback: { type: Type.STRING },
    confidence_feedback: { type: Type.STRING },
    personality_feedback: { type: Type.STRING },
    cultural_fit_feedback: { type: Type.STRING },
    final_summary: { type: Type.STRING },
  },
  required: [
    "strengths",
    "improvements",
    "communication_feedback",
    "technical_feedback",
    "confidence_feedback",
    "personality_feedback",
    "cultural_fit_feedback",
    "final_summary",
  ],
};

export async function generateFinalSummaryAI(
  interviewType: "technical" | "hr",
  role: string | null,
  qas: Array<{
    question: string;
    answer: string;
    evaluation: AnswerEvaluationResult;
  }>
): Promise<FinalInterviewSummaryResult> {
  const prompt = `
You are a senior interview evaluator reviewing all 4 responses from a candidate's ${interviewType.toUpperCase()} interview${role ? ` for the role of ${role}` : ""}.

Summary of Questions, Answers, and Evaluations:
${JSON.stringify(qas, null, 2)}

Provide a comprehensive, synthesized final evaluation:
1. Synthesize 3-5 overall key Strengths (Good Areas where candidate excelled across questions).
2. Synthesize 3-5 overall Needs Improvement bullet points.
3. Detailed domain feedback for:
   - Communication feedback
   - Technical feedback (or Problem Solving for HR)
   - Confidence feedback
   - Personality feedback
   - Cultural fit feedback
4. Final overall summary paragraph.

Return structured JSON only.
`;

  const response = await generateWithRetry(prompt, finalSummarySchema);
  const text = response.text;
  if (!text) {
    throw new Error("Gemini returned empty summary.");
  }

  const parsed = parseCleanJson<FinalInterviewSummaryResult>(text);

  return {
    strengths: Array.isArray(parsed.strengths) && parsed.strengths.length > 0
      ? parsed.strengths
      : ["Demonstrated solid core understanding across questions."],
    improvements: Array.isArray(parsed.improvements) && parsed.improvements.length > 0
      ? parsed.improvements
      : ["Structure responses with STAR format and specific examples."],
    communication_feedback: parsed.communication_feedback || "Good clarity and overall response structure.",
    technical_feedback: parsed.technical_feedback || "Good conceptual understanding.",
    confidence_feedback: parsed.confidence_feedback || "Clear presentation of thoughts.",
    personality_feedback: parsed.personality_feedback || "Professional and receptive attitude.",
    cultural_fit_feedback: parsed.cultural_fit_feedback || "Good alignment with team values.",
    final_summary: parsed.final_summary || "Overall solid interview performance with practical insights.",
  };
}
