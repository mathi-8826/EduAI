import { GoogleGenAI, Type } from "@google/genai";

export type Difficulty = "easy" | "medium" | "hard";
export type Category = "quantitative" | "reasoning" | "verbal";

export type GeneratedQuestion = {
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: "a" | "b" | "c" | "d";
  explanation: string;
};

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const questionSchema = {
  type: Type.OBJECT,
  properties: {
    questions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          question: {
            type: Type.STRING,
          },
          option_a: {
            type: Type.STRING,
          },
          option_b: {
            type: Type.STRING,
          },
          option_c: {
            type: Type.STRING,
          },
          option_d: {
            type: Type.STRING,
          },
          correct_answer: {
            type: Type.STRING,
            enum: ["a", "b", "c", "d"],
          },
          explanation: {
            type: Type.STRING,
          },
        },
        required: [
          "question",
          "option_a",
          "option_b",
          "option_c",
          "option_d",
          "correct_answer",
          "explanation",
        ],
      },
    },
  },
  required: ["questions"],
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function generateWithRetry(
  prompt: string,
  maxAttempts = 4
) {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await ai.models.generateContent({
        model: "gemini-3.5-flash-lite",

        contents: prompt,

        config: {
          temperature: 0.7,
          maxOutputTokens: 5000,

          responseMimeType: "application/json",
          responseSchema: questionSchema,
        },
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

      console.log(
        `Gemini request failed. Retry ${attempt}/${maxAttempts} in ${delay}ms`
      );

      await sleep(delay);
    }
  }

  throw lastError;
}

export function parseCleanJson<T = any>(rawText: string): T {
  if (!rawText || typeof rawText !== "string") {
    throw new Error("Empty response from Gemini.");
  }

  let text = rawText.trim();

  // Strip markdown code fences like ```json ... ``` or ``` ... ```
  text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

  // Locate the first { or [ and last } or ]
  const firstBrace = text.search(/[\{\[]/);
  const lastBrace = text.search(/[\}\]][^\}\]]*$/);

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace >= firstBrace) {
    text = text.slice(firstBrace, lastBrace + 1);
  }

  try {
    return JSON.parse(text);
  } catch (firstErr) {
    // Attempt common JSON repairs for LLM output
    // 1. Strip trailing commas before closing braces/brackets
    let repaired = text.replace(/,\s*([\}\]])/g, "$1");

    // 2. Strip single-line JS/C comments
    repaired = repaired.replace(/\/\/.*/g, "");

    try {
      return JSON.parse(repaired);
    } catch {
      throw firstErr;
    }
  }
}

export async function generateQuestionsWithAI(input: {
  category: Category;
  topic: string;
  difficulty: Difficulty;
}): Promise<GeneratedQuestion[]> {
  const { category, topic, difficulty } = input;

  const prompt = `
You are an expert aptitude test question creator
for Indian campus placement examinations.

Generate exactly 10 original multiple-choice questions.

Category:
${category}

Topic:
${topic}

Difficulty:
${difficulty}

Requirements:

1. Generate exactly 10 questions.
2. Every question must be relevant to the requested topic.
3. There must be exactly four options.
4. Every option must be different.
5. Only one option must be correct.
6. The correct answer must be one of:
   a, b, c, d
7. Do not create duplicate questions.
8. Questions must be self-contained.
9. Explanations should be short and clear.
10. For quantitative questions, ensure calculations are mathematically correct.
11. For reasoning questions, ensure there is exactly one logically correct answer.
12. For verbal questions, ensure grammar and meaning are correct.
13. Questions should be suitable for a timed campus placement aptitude test.

Return only the requested JSON structure.
`;

  let lastError: unknown;
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await generateWithRetry(prompt);
      const text = response.text;

      if (!text) {
        throw new Error("Gemini returned an empty response.");
      }

      const parsed = parseCleanJson<{ questions?: GeneratedQuestion[] }>(text);

      if (!parsed || !parsed.questions || !Array.isArray(parsed.questions)) {
        throw new Error("Gemini response does not contain questions.");
      }

      const validQuestions = parsed.questions
        .filter((q) => {
          return (
            q &&
            typeof q.question === "string" &&
            typeof q.option_a === "string" &&
            typeof q.option_b === "string" &&
            typeof q.option_c === "string" &&
            typeof q.option_d === "string" &&
            ["a", "b", "c", "d"].includes(q.correct_answer) &&
            typeof q.explanation === "string"
          );
        })
        .slice(0, 10);

      if (validQuestions.length < 5) {
        throw new Error("Gemini could not generate enough valid questions.");
      }

      return validQuestions;
    } catch (err: any) {
      lastError = err;
      console.warn(`[VQR AI] Generation attempt ${attempt}/${maxAttempts} failed:`, err?.message || err);
      if (attempt < maxAttempts) {
        await sleep(1000 * attempt);
      }
    }
  }

  throw new Error(
    `Gemini response processing failed: ${lastError instanceof Error ? lastError.message : "Please try again."}`
  );
}