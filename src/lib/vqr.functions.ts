import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  generateQuestionsWithAI,
  type Category,
  type Difficulty,
} from "./vqr-ai.server";

type GenerateInput = {
  category: Category;
  topic: string;
  difficulty: Difficulty;
};

export const generateVqrTest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: GenerateInput) => {
    const categories: Category[] = [
      "quantitative",
      "reasoning",
      "verbal",
    ];

    const difficulties: Difficulty[] = [
      "easy",
      "medium",
      "hard",
    ];

    if (!input || !categories.includes(input.category)) {
      throw new Error("Invalid category");
    }

    if (!difficulties.includes(input.difficulty)) {
      throw new Error("Invalid difficulty");
    }

    const topic = String(input.topic ?? "")
      .trim()
      .slice(0, 80);

    if (!topic) {
      throw new Error("Topic is required");
    }

    return {
      category: input.category,
      difficulty: input.difficulty,
      topic,
    };
  })
  .handler(async ({ data }) => {
    // ----------------------------------------
    // 1. Generate questions using Gemini
    // ----------------------------------------

    const questions = await generateQuestionsWithAI({
      category: data.category,
      topic: data.topic,
      difficulty: data.difficulty,
    });

    // ----------------------------------------
    // 2. Create VQR test
    // ----------------------------------------

    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    const { data: test, error: testError } =
      await supabaseAdmin
        .from("vqr_tests")
        .insert({
          title: `${data.topic} Practice Test`,
          category: data.category,
          topic: data.topic,
          difficulty: data.difficulty,
          duration_minutes:
            data.difficulty === "hard" ? 20 : 15,
        })
        .select("id")
        .single();

    if (testError || !test) {
      throw new Error(
        testError?.message ?? "Could not create test"
      );
    }

    // ----------------------------------------
    // 3. Save generated questions
    // ----------------------------------------

    const { error: questionError } =
      await supabaseAdmin
        .from("vqr_questions")
        .insert(
          questions.map((q) => ({
            test_id: test.id,
            question: q.question,
            option_a: q.option_a,
            option_b: q.option_b,
            option_c: q.option_c,
            option_d: q.option_d,
            correct_answer: q.correct_answer,
            topic: data.topic,
            difficulty: data.difficulty,
            explanation: q.explanation || null,
          }))
        );

    if (questionError) {
      throw new Error(questionError.message);
    }

    // ----------------------------------------
    // 4. Return result to frontend
    // ----------------------------------------

    return {
      testId: test.id as string,
      count: questions.length,
    };
  });