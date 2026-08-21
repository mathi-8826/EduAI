import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import {
  generateProblemWithAI,
  evaluatePythonServer,
  evaluateJavaServer,
  evaluateSqlServer,
  generateCodingFeedbackWithAI,
  type CodingLanguage,
  type CodingTopic,
  type Difficulty,
} from "./coding-ai.server";

// ============================================================
// Supported Coding Topics
// ============================================================

const TOPICS: CodingTopic[] = [
  "arrays",
  "strings",
  "linked_list",
  "trees",
  "graphs",
  "stack",
  "queue",
  "binary_search",
  "sorting",
  "dp",
  "sql",
];

// ============================================================
// Supported Coding Languages
// ============================================================

const LANGUAGES: CodingLanguage[] = [
  "python",
  "java",
  "sql",
];

// ============================================================
// Generate Coding Problem Input
// ============================================================

type GenerateInput = {
  topic: CodingTopic;
  concept: string;
  difficulty: Difficulty;
  language?: CodingLanguage;
};

// ============================================================
// Generate Coding Problem
// ============================================================

export const generateCodingProblem = createServerFn({
  method: "POST",
})
  .middleware([requireSupabaseAuth])

  // ----------------------------------------------------------
  // Validate request
  // ----------------------------------------------------------

  .validator((input: GenerateInput) => {
    if (!input) {
      throw new Error("Invalid request");
    }

    // Validate topic
    if (!TOPICS.includes(input.topic)) {
      throw new Error("Invalid coding topic");
    }

    // Validate difficulty
    const difficulties: Difficulty[] = [
      "easy",
      "medium",
      "hard",
    ];

    if (!difficulties.includes(input.difficulty)) {
      throw new Error("Invalid difficulty");
    }

    // Default language = Python
    const language =
      input.language ?? "python";

    // Validate language
    if (!LANGUAGES.includes(language)) {
      throw new Error("Invalid programming language");
    }

    // SQL topic must use SQL
    if (
      language === "sql" &&
      input.topic !== "sql"
    ) {
      throw new Error(
        "SQL problems must use the SQL topic"
      );
    }

    // Non-SQL languages cannot use SQL topic
    if (
      language !== "sql" &&
      input.topic === "sql"
    ) {
      throw new Error(
        "SQL topic requires the SQL editor"
      );
    }

    // Validate concept
    const concept = String(
      input.concept ?? ""
    )
      .trim()
      .slice(0, 80);

    if (!concept) {
      throw new Error(
        "Coding concept is required"
      );
    }

    return {
      topic: input.topic,
      difficulty: input.difficulty,
      concept,
      language,
    };
  })

  // ----------------------------------------------------------
  // Generate and save problem
  // ----------------------------------------------------------

  .handler(async ({ data }) => {
    console.log(
      `Generating ${data.difficulty} ${data.language} problem...`
    );

    // ========================================================
    // 1. Generate problem using Gemini
    // ========================================================

    // IMPORTANT:
    // No LOVABLE_API_KEY is required here.
    //
    // generateProblemWithAI() internally uses:
    //
    // GEMINI_API_KEY
    //
    // from the server environment.

    const problem =
      await generateProblemWithAI(data);

    // ========================================================
    // 2. Generate unique slug
    // ========================================================

    const cleanTitle =
      problem.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 50);

    const randomId =
      Math.random()
        .toString(36)
        .slice(2, 7);

    const slug =
      `${cleanTitle}-${randomId}`;

    // ========================================================
    // 3. Connect to Supabase
    // ========================================================

    const {
      supabaseAdmin,
    } = await import(
      "@/integrations/supabase/client.server"
    );

    // ========================================================
    // 4. Save coding problem
    // ========================================================

    const {
      error,
    } = await supabaseAdmin
      .from("coding_questions")
      .insert({
        slug,

        title:
          problem.title,

        difficulty:
          data.difficulty,

        topic:
          data.topic,

        language:
          data.language,

        tags: [
          data.concept,
        ],

        description:
          problem.description,

        constraints:
          problem.constraints ||
          null,

        sql_schema:
          problem.sql_schema ??
          null,

        examples:
          JSON.parse(
            JSON.stringify(
              problem.examples
            )
          ),

        hints:
          problem.hints,

        starter_code: {
          [data.language]:
            problem.starter_code,
        },

        test_cases:
          JSON.parse(
            JSON.stringify(
              problem.test_cases
            )
          ),
      });

    // ========================================================
    // 5. Handle database error
    // ========================================================

    if (error) {
      console.error(
        "Failed to save coding problem:",
        error
      );

      throw new Error(
        `Could not save coding problem: ${error.message}`
      );
    }

    // ========================================================
    // 6. Return result to frontend
    // ========================================================

    console.log(
      `Coding problem created: ${slug}`
    );

    return {
      slug,
      tests:
        problem.test_cases.length,
    };
  });

// ============================================================
// Run Java Code
// ============================================================

type RunJavaInput = {
  code: string;
  stdins: string[];
};

export const runJavaCode = createServerFn({
  method: "POST",
})
  .middleware([requireSupabaseAuth])

  // ----------------------------------------------------------
  // Validate Java code request
  // ----------------------------------------------------------

  .validator((input: RunJavaInput) => {
    if (!input) {
      throw new Error(
        "Invalid request"
      );
    }

    const code =
      String(input.code ?? "");

    if (!code.trim()) {
      throw new Error(
        "Write some Java code first"
      );
    }

    // Prevent extremely large submissions
    if (code.length > 20000) {
      throw new Error(
        "Code is too long"
      );
    }

    // Validate test cases
    const stdins =
      Array.isArray(input.stdins)
        ? input.stdins
          .slice(0, 6)
          .map((s) =>
            String(s ?? "")
          )
        : [];

    if (stdins.length === 0) {
      throw new Error(
        "No test cases to run"
      );
    }

    return {
      code,
      stdins,
    };
  })

  // ----------------------------------------------------------
  // Execute Java code
  // ----------------------------------------------------------

  .handler(async ({ data }) => {
    const results: Array<{
      stdout: string;
      error: string | null;
    }> = [];

    // Run each test case
    for (
      const stdin of data.stdins
    ) {
      try {
        // ====================================================
        // Call Piston Java execution API
        // ====================================================

        const response =
          await fetch(
            "https://emkc.org/api/v2/piston/execute",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify({
                language: "java",

                version: "15.0.2",

                files: [
                  {
                    name:
                      "Main.java",
                    content:
                      data.code,
                  },
                ],

                stdin,

                compile_timeout:
                  10000,

                run_timeout:
                  5000,
              }),
            }
          );

        // ====================================================
        // Handle Piston API errors
        // ====================================================

        if (!response.ok) {
          if (
            response.status ===
            429
          ) {
            throw new Error(
              "Java runner is busy. Please try again in a moment."
            );
          }

          throw new Error(
            `Java runner failed [${response.status}]`
          );
        }

        // ====================================================
        // Parse Piston response
        // ====================================================

        const body =
          (await response.json()) as {
            compile?: {
              stderr?: string;
              output?: string;
              code?: number;
            };

            run?: {
              stdout?: string;
              stderr?: string;
              output?: string;
            };
          };

        // ====================================================
        // Check compilation errors
        // ====================================================

        const compileErr =
          (
            body.compile
              ?.stderr ?? ""
          ).trim();

        if (compileErr) {
          results.push({
            stdout: "",

            error:
              compileErr
                .split("\n")
                .slice(0, 4)
                .join("\n"),
          });

          continue;
        }

        // ====================================================
        // Check runtime errors
        // ====================================================

        const runErr =
          (
            body.run
              ?.stderr ?? ""
          ).trim();

        results.push({
          stdout:
            (
              body.run
                ?.stdout ?? ""
            ).trim(),

          error: runErr
            ? runErr
              .split("\n")
              .slice(0, 4)
              .join("\n")
            : null,
        });

        // Small delay between executions
        await new Promise(
          (resolve) =>
            setTimeout(
              resolve,
              250
            )
        );
      } catch (error) {
        // ====================================================
        // Handle individual test-case error
        // ====================================================

        const message =
          error instanceof Error
            ? error.message
            : "Java execution failed";

        results.push({
          stdout: "",
          error: message,
        });
      }
    }

    // ========================================================
    // Return all test results
    // ========================================================

    return {
      results,
    };
  });

// ============================================================
// Multi-Language Code Execution & Evaluation Server Functions
// ============================================================

type CodeExecutionInput = {
  questionId: string;
  code: string;
  language: CodingLanguage;
};

export const runCodingCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: CodeExecutionInput) => {
    const questionId = String(input?.questionId ?? "").trim();
    const code = String(input?.code ?? "");
    const language: CodingLanguage =
      input?.language === "java"
        ? "java"
        : input?.language === "sql"
        ? "sql"
        : "python";

    if (!questionId) throw new Error("Question ID is required.");
    if (!code.trim()) throw new Error("Please write some code before running.");
    if (code.length > 30000) throw new Error("Code submission is too large.");

    return { questionId, code, language };
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: question, error } = await supabaseAdmin
      .from("coding_questions")
      .select("*")
      .eq("id", data.questionId)
      .single();

    if (error || !question) {
      throw new Error("Coding problem not found.");
    }

    const testCases = (question.test_cases || []) as any[];

    if (data.language === "python") {
      return await evaluatePythonServer(data.code, testCases);
    } else if (data.language === "java") {
      return await evaluateJavaServer(data.code, testCases);
    } else {
      return await evaluateSqlServer(data.code, question.sql_schema || "", testCases);
    }
  });

export const submitCodingCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: CodeExecutionInput) => {
    const questionId = String(input?.questionId ?? "").trim();
    const code = String(input?.code ?? "");
    const language: CodingLanguage =
      input?.language === "java"
        ? "java"
        : input?.language === "sql"
        ? "sql"
        : "python";

    if (!questionId) throw new Error("Question ID is required.");
    if (!code.trim()) throw new Error("Please write some code before submitting.");
    if (code.length > 30000) throw new Error("Code submission is too large.");

    return { questionId, code, language };
  })
  .handler(async ({ data, context }) => {
    const userId = context.userId;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    console.log(`[Coding] Submission started for user: ${userId}, question: ${data.questionId}, lang: ${data.language}`);

    // 1. Fetch question
    const { data: question, error } = await supabaseAdmin
      .from("coding_questions")
      .select("*")
      .eq("id", data.questionId)
      .single();

    if (error || !question) {
      throw new Error("Coding problem not found.");
    }

    // 2. Deterministic execution
    const testCases = (question.test_cases || []) as any[];
    let summary;

    if (data.language === "python") {
      summary = await evaluatePythonServer(data.code, testCases);
    } else if (data.language === "java") {
      summary = await evaluateJavaServer(data.code, testCases);
    } else {
      summary = await evaluateSqlServer(data.code, question.sql_schema || "", testCases);
    }

    console.log(`[Coding] Execution completed. Status: ${summary.status}, Passed: ${summary.passed}/${summary.total}`);

    // 3. Insert submission into coding_submissions
    const { data: submission, error: subErr } = await supabaseAdmin
      .from("coding_submissions")
      .insert({
        user_id: userId,
        question_id: data.questionId,
        language: data.language,
        code: data.code,
        status: summary.status,
        score: summary.score,
        passed_tests: summary.passed,
        total_tests: summary.total,
        execution_time_ms: summary.executionTimeMs,
      })
      .select("id")
      .single();

    if (subErr) {
      console.error("[Coding] Failed to save submission:", subErr);
    }

    // 4. Optional Gemini code feedback
    const feedback = await generateCodingFeedbackWithAI({
      title: question.title,
      language: data.language,
      code: data.code,
      status: summary.status,
      passedCount: summary.passed,
      totalCount: summary.total,
    });

    return {
      submissionId: submission?.id || null,
      results: summary.results,
      passed: summary.passed,
      total: summary.total,
      score: summary.score,
      status: summary.status,
      executionTimeMs: summary.executionTimeMs,
      feedback,
    };
  });