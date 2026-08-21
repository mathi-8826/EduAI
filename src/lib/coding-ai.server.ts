import { GoogleGenAI, Type } from "@google/genai";
import { execFile } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";
import { DatabaseSync } from "node:sqlite";

export type Difficulty = "easy" | "medium" | "hard";

export type CodingLanguage = "python" | "java" | "sql";

export type CodingTopic =
  | "arrays"
  | "strings"
  | "linked_list"
  | "trees"
  | "graphs"
  | "stack"
  | "queue"
  | "binary_search"
  | "sorting"
  | "dp"
  | "sql";

export type GeneratedProblem = {
  language: CodingLanguage;
  title: string;
  description: string;
  constraints: string;
  examples: Array<{
    input: string;
    output: string;
    explanation?: string;
  }>;
  hints: string[];
  starter_code: string;
  test_cases: unknown[];
  sql_schema?: string;
};

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const pythonSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    function_name: { type: Type.STRING },
    description: { type: Type.STRING },
    constraints: { type: Type.STRING },
    examples: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          input: { type: Type.STRING },
          output: { type: Type.STRING },
          explanation: { type: Type.STRING },
        },
        required: ["input", "output"],
      },
    },
    hints: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    starter_code: { type: Type.STRING },
    test_cases: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          // Gemini's structured-output schema requires every ARRAY field to
          // have a concrete `items` definition. Arbitrary mixed-type arrays
          // (e.g. [[1,3,5], 5]) cannot be expressed safely, so we tell
          // Gemini to emit each argument as a JSON-encoded string.
          // parsePythonValue() in sanitizeProblem() converts them back to
          // native types before the problem is stored or evaluated.
          input: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          expected: { type: Type.STRING },
        },
        required: ["input", "expected"],
      },
    },
  },
  required: [
    "title",
    "function_name",
    "description",
    "constraints",
    "examples",
    "hints",
    "starter_code",
    "test_cases",
  ],
};

const javaSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    description: { type: Type.STRING },
    constraints: { type: Type.STRING },
    examples: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          input: { type: Type.STRING },
          output: { type: Type.STRING },
          explanation: { type: Type.STRING },
        },
        required: ["input", "output"],
      },
    },
    hints: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    starter_code: { type: Type.STRING },
    test_cases: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          stdin: { type: Type.STRING },
          expected: { type: Type.STRING },
        },
        required: ["stdin", "expected"],
      },
    },
  },
  required: [
    "title",
    "description",
    "constraints",
    "examples",
    "hints",
    "starter_code",
    "test_cases",
  ],
};

const sqlSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    description: { type: Type.STRING },
    constraints: { type: Type.STRING },
    examples: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          input: { type: Type.STRING },
          output: { type: Type.STRING },
          explanation: { type: Type.STRING },
        },
        required: ["input", "output"],
      },
    },
    hints: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    schema_sql: { type: Type.STRING },
    starter_code: { type: Type.STRING },
    test_cases: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          columns: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          rows: {
            type: Type.ARRAY,
            items: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
        },
        required: ["columns", "rows"],
      },
    },
  },
  required: [
    "title",
    "description",
    "constraints",
    "examples",
    "hints",
    "schema_sql",
    "starter_code",
    "test_cases",
  ],
};

function parseCleanJson<T = any>(rawText: string): T {
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
  language: CodingLanguage,
  maxAttempts = 3
) {
  const schema =
    language === "sql"
      ? sqlSchema
      : language === "java"
        ? javaSchema
        : pythonSchema;

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await ai.models.generateContent({
        model: "gemini-3.5-flash-lite",
        contents: prompt,
        config: {
          temperature: 0.7,
          maxOutputTokens: 7000,
          responseMimeType: "application/json",
          responseSchema: schema,
        },
      });
    } catch (error: any) {
      lastError = error;

      const status =
        error?.status ??
        error?.code ??
        error?.response?.status;

      // 400 INVALID_ARGUMENT means the schema or prompt is wrong — retrying
      // will never help. Log clearly and surface immediately.
      if (status === 400) {
        console.error(
          `[Coding AI] Fatal schema/argument error (400). Not retrying.\n` +
          `Error: ${error?.message ?? String(error)}`
        );
        throw error;
      }

      // Only retry transient server/rate-limit errors
      const retryable =
        status === 429 ||
        status === 500 ||
        status === 502 ||
        status === 503 ||
        status === 504;

      if (!retryable || attempt === maxAttempts) {
        throw error;
      }

      const delay =
        1000 * Math.pow(2, attempt - 1) +
        Math.floor(Math.random() * 500);

      console.log(
        `[Coding AI] Attempt ${attempt}/${maxAttempts} failed (status: ${status ?? "unknown"}). Retrying in ${delay}ms…`
      );

      await sleep(delay);
    }
  }

  throw lastError;
}

function asStringArray(
  value: unknown,
  max: number
): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter(
      (v): v is string =>
        typeof v === "string" &&
        v.trim().length > 0
    )
    .map((v) => v.trim())
    .slice(0, max);
}

function stripFence(code: string): string {
  return code
    .replace(/^```(?:python|java|sql)?\s*/i, "")
    .replace(/```$/, "")
    .trim();
}

/**
 * Safely parses a value that may be a JSON-encoded string back to its native type.
 * For example:
 *   "[1, 3, 5, 6]" -> [1, 3, 5, 6]
 *   "5"            -> 5
 *   "true"         -> true
 *   "2"            -> 2
 *   "hello"        -> "hello"  (not a valid JSON primitive, stays as string)
 *
 * This handles the case where Gemini was forced to emit string-encoded values
 * because the schema declared `items: { type: Type.STRING }`.
 */
function parsePythonValue(val: unknown): unknown {
  if (typeof val !== "string") return val;
  const trimmed = val.trim();

  // Try standard JSON parse first (handles arrays, objects, numbers, booleans, null)
  try {
    return JSON.parse(trimmed);
  } catch {}

  // Try Python-style single-quoted strings or tuples like "('alice', 85, 90.5)"
  try {
    const jsonified = trimmed
      .replace(/\(/g, "[")
      .replace(/\)/g, "]")
      .replace(/'/g, '"');
    return JSON.parse(jsonified);
  } catch {}

  // Return as-is (it's genuinely a string argument)
  return val;
}

function baseFields(
  p: Record<string, unknown>
) {
  const title =
    typeof p.title === "string"
      ? p.title.trim()
      : "";

  const description =
    typeof p.description === "string"
      ? p.description.trim()
      : "";

  if (!title || !description) {
    throw new Error(
      "AI returned an incomplete problem. Please try again."
    );
  }

  const examples = (
    Array.isArray(p.examples)
      ? p.examples
      : []
  )
    .map((e) => {
      const ex =
        (e ?? {}) as Record<string, unknown>;

      const input =
        typeof ex.input === "string"
          ? ex.input
          : JSON.stringify(ex.input ?? "");

      const output =
        typeof ex.output === "string"
          ? ex.output
          : JSON.stringify(ex.output ?? "");

      const explanation =
        typeof ex.explanation === "string"
          ? ex.explanation.trim()
          : undefined;

      return {
        input,
        output,
        ...(explanation
          ? { explanation }
          : {}),
      };
    })
    .slice(0, 3);

  return {
    title,
    description,

    constraints:
      typeof p.constraints === "string"
        ? p.constraints.trim()
        : "",

    examples,

    hints: asStringArray(
      p.hints,
      3
    ),
  };
}

export function sanitizeProblem(
  raw: unknown,
  language: CodingLanguage = "python"
): GeneratedProblem {
  const p =
    (raw ?? {}) as Record<string, unknown>;

  const base = baseFields(p);

  let starter_code = stripFence(
    typeof p.starter_code === "string"
      ? p.starter_code
      : ""
  );

  // -----------------------------
  // PYTHON
  // -----------------------------

  if (language === "python") {
    const rawName =
      typeof p.function_name === "string"
        ? p.function_name.trim()
        : "";

    const function_name =
      /^[a-z_][a-z0-9_]*$/i.test(rawName)
        ? rawName
        : "solve";

    const test_cases: Array<{
      input: unknown[];
      expected: unknown;
    }> = [];

    for (const t of Array.isArray(p.test_cases)
      ? p.test_cases
      : []) {
      const tc =
        (t ?? {}) as Record<string, unknown>;

      if (!Array.isArray(tc.input)) {
        continue;
      }

      // Parse every argument back to its native JSON type.
      // This is critical when Gemini emitted string-encoded values like
      // `"[1, 3, 5, 6]"` instead of `[1, 3, 5, 6]` because the schema
      // forced `items: { type: Type.STRING }` on input elements.
      const parsedInput = tc.input.map((v) => parsePythonValue(v));
      const parsedExpected = parsePythonValue(tc.expected ?? null);

      test_cases.push({
        input: parsedInput,
        expected: parsedExpected,
      });

      if (test_cases.length === 8) {
        break;
      }
    }

    if (test_cases.length < 3) {
      throw new Error(
        "AI did not return enough test cases. Please try again."
      );
    }

    if (!starter_code.includes(`def ${function_name}`)) {
      const params = test_cases[0]!.input
        .map((_, i) => `arg${i + 1}`)
        .join(", ");

      starter_code =
        `def ${function_name}(${params}):\n` +
        `    # Write your solution here\n` +
        `    pass\n`;
    }

    return {
      language,
      ...base,
      starter_code,
      test_cases,
    };
  }

  // -----------------------------
  // JAVA
  // -----------------------------

  if (language === "java") {
    const test_cases: Array<{
      stdin: string;
      expected: string;
    }> = [];

    for (const t of Array.isArray(p.test_cases)
      ? p.test_cases
      : []) {
      const tc =
        (t ?? {}) as Record<string, unknown>;

      const stdin =
        typeof tc.stdin === "string"
          ? tc.stdin
          : String(tc.stdin ?? "");

      const expected =
        typeof tc.expected === "string"
          ? tc.expected
          : String(tc.expected ?? "");

      if (!expected.trim()) {
        continue;
      }

      test_cases.push({
        stdin,
        expected: expected.trim(),
      });

      if (test_cases.length === 6) {
        break;
      }
    }

    if (test_cases.length < 3) {
      throw new Error(
        "AI did not return enough test cases. Please try again."
      );
    }

    if (!/class\s+Main/.test(starter_code)) {
      starter_code = [
        "import java.util.*;",
        "",
        "public class Main {",
        "    public static void main(String[] args) {",
        "        Scanner sc = new Scanner(System.in);",
        "        // Read the input and print the answer",
        "    }",
        "}",
        "",
      ].join("\n");
    }

    return {
      language,
      ...base,
      starter_code,
      test_cases,
    };
  }

  // -----------------------------
  // SQL
  // -----------------------------

  const sql_schema = stripFence(
    typeof p.schema_sql === "string"
      ? p.schema_sql
      : ""
  );

  if (
    !sql_schema
      .toLowerCase()
      .includes("create table")
  ) {
    throw new Error(
      "AI did not return a valid practice database. Please try again."
    );
  }

  const rawCase =
    (Array.isArray(p.test_cases)
      ? p.test_cases[0]
      : p.expected_result) as
    | Record<string, unknown>
    | undefined;

  const columns = asStringArray(
    rawCase?.columns,
    12
  );

  const rows = Array.isArray(
    rawCase?.rows
  )
    ? (rawCase.rows as unknown[])
      .filter(Array.isArray)
      .slice(0, 50)
    : [];

  if (columns.length === 0) {
    throw new Error(
      "AI did not return the expected result columns. Please try again."
    );
  }

  if (!starter_code) {
    starter_code =
      "-- Write your SQL query here\nSELECT ";
  }

  return {
    language,
    ...base,
    starter_code,
    sql_schema,
    test_cases: [
      {
        columns,
        rows,
      },
    ],
  };
}

function promptFor(
  language: CodingLanguage
) {
  if (language === "java") {
    return [
      "You are an expert coding-interview problem author.",
      "Create ONE original Java coding problem.",
      "The solution must be a single public class Main.",
      "The main method must read standard input and print standard output.",
      "Provide 4 to 5 test cases.",
      "stdin must be the exact program input.",
      "expected must be the exact expected stdout.",
      "The description MUST specify input format and output format.",
      "starter_code must be compilable Java skeleton code.",
      "Do not include the solution.",
      "Return JSON only.",
    ].join(" ");
  }

  if (language === "sql") {
    return [
      "You are an expert SQL interview question author.",
      "Create ONE original SQL practice question.",
      "Use SQLite-compatible syntax.",
      "Provide CREATE TABLE statements.",
      "Provide INSERT statements with 6-12 realistic rows.",
      "The task must be solved using a single SELECT query.",
      "Calculate the exact result of the correct query.",
      "Return result columns and rows.",
      "The description MUST specify required output columns.",
      "The description MUST specify column order.",
      "The description MUST specify required row ordering.",
      "Return JSON only.",
    ].join(" ");
  }

  return [
    "You are an expert coding-interview problem author.",
    "Create ONE original Python coding problem.",
    "The problem must be solved by a single pure Python function.",
    "Arguments and return value must be JSON serializable.",
    "Do not use classes.",
    "Do not use stdin.",
    "Do not use print.",
    "The function must return the answer.",
    "Provide 5 to 6 test cases.",
    "input must contain the ordered function arguments.",
    "expected must contain the exact return value.",
    "starter_code must contain the function signature and pass only.",
    "Do not include the solution.",
    "Return JSON only.",
  ].join(" ");
}

export async function generateProblemWithAI(input: {
  topic: CodingTopic;
  concept: string;
  difficulty: Difficulty;
  language: CodingLanguage;
}): Promise<GeneratedProblem> {
  const {
    topic,
    concept,
    difficulty,
    language,
  } = input;

  const label =
    language === "sql"
      ? "SQL"
      : language === "java"
        ? "Java"
        : "Python";

  const userPrompt =
    language === "sql"
      ? `Concept focus: ${concept}. Difficulty: ${difficulty}. Write one ${difficulty} SQL question on "${concept}" suitable for campus placement interviews.`
      : `Topic: ${topic.replace(
        /_/g,
        " "
      )}. Concept focus: ${concept}. Difficulty: ${difficulty}. Write one ${difficulty} ${label} problem on "${concept}" suitable for campus placement coding rounds.`;

  const fullPrompt = `${promptFor(language)}\n\n${userPrompt}`;

  let lastError: unknown;
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await generateWithRetry(fullPrompt, language);
      const content = response.text;

      if (!content) {
        throw new Error("Gemini returned an empty response.");
      }

      const parsed = parseCleanJson(content);
      return sanitizeProblem(parsed, language);
    } catch (err: any) {
      lastError = err;
      console.warn(
        `[Coding AI] Attempt ${attempt}/${maxAttempts} failed:`,
        err?.message || err
      );
      if (attempt < maxAttempts) {
        await sleep(1000 * attempt);
      }
    }
  }

  throw new Error(
    `Coding problem generation failed: ${lastError instanceof Error ? lastError.message : "Please try again."
    }`
  );
}

// ============================================================
// Multi-Language Code Evaluation Engine
// ============================================================

export type EvaluatedTestCase = {
  passed: boolean;
  input: any;
  expected: any;
  actual: any;
  error?: string | null;
};

export type EvaluationSummary = {
  results: EvaluatedTestCase[];
  passed: number;
  total: number;
  score: number;
  status: "accepted" | "partial" | "failed";
  executionTimeMs: number;
};

function detectPythonFnName(code: string): string {
  const matches = [...code.matchAll(/^\s*def\s+([A-Za-z_]\w*)\s*\(/gm)];
  const top = matches.find((m) => !m[0].startsWith(" ") && !m[0].startsWith("\t"));
  return (top ?? matches[0])?.[1] ?? "solve";
}

/**
 * Deep structural equality comparison that preserves type semantics.
 * Does NOT coerce types with String() — a number 2 and string "2" are NOT equal.
 */
function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;

  // Both numbers: allow tiny floating-point tolerance
  if (typeof a === "number" && typeof b === "number") {
    if (isNaN(a) && isNaN(b)) return true;
    return Math.abs(a - b) < 1e-9;
  }

  // Both arrays: same length and each element equal
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((v, i) => deepEqual(v, b[i]));
  }

  // Both non-null objects (but not arrays): same keys and values
  if (
    a !== null &&
    b !== null &&
    typeof a === "object" &&
    typeof b === "object" &&
    !Array.isArray(a) &&
    !Array.isArray(b)
  ) {
    const ka = Object.keys(a as object).sort();
    const kb = Object.keys(b as object).sort();
    return (
      ka.length === kb.length &&
      ka.every((k, i) => k === kb[i]) &&
      ka.every((k) =>
        deepEqual(
          (a as Record<string, unknown>)[k],
          (b as Record<string, unknown>)[k]
        )
      )
    );
  }

  // All other cases (including cross-type comparisons like number vs string) are not equal
  return false;
}

export async function evaluatePythonServer(
  code: string,
  rawTestCases: Array<{ input: any[]; expected: any }>
): Promise<EvaluationSummary> {
  const startTime = performance.now();
  const fnName = detectPythonFnName(code);

  // Belt-and-suspenders: parse any string-encoded values that survived from
  // the DB (generated before the schema fix). This ensures the evaluator always
  // receives native JSON types regardless of how the problem was stored.
  const testCases = rawTestCases.map((tc, idx) => {
    const parsedInput = Array.isArray(tc.input)
      ? tc.input.map((v: unknown) => parsePythonValue(v))
      : [];
    const parsedExpected = parsePythonValue(tc.expected);

    // Debug logs so server output clearly shows what types we're passing
    const inputTypes = parsedInput
      .map((v) => (Array.isArray(v) ? "array" : typeof v))
      .join(", ");
    const expectedType = Array.isArray(parsedExpected)
      ? "array"
      : typeof parsedExpected;

    console.log(`[Coding][Python] Test ${idx + 1}`);
    console.log(`[Coding][Python] Function: ${fnName}`);
    console.log(`[Coding][Python] Input: ${JSON.stringify(parsedInput)}`);
    console.log(`[Coding][Python] Input types: ${inputTypes}`);
    console.log(`[Coding][Python] Expected: ${JSON.stringify(parsedExpected)}`);
    console.log(`[Coding][Python] Expected type: ${expectedType}`);

    return { input: parsedInput, expected: parsedExpected };
  });

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "pyeval-"));
  const scriptPath = path.join(tmpDir, "run_tests.py");

  const runnerCode = `
import json, sys

${code}

test_cases = json.loads(sys.argv[1])
results = []

for tc in test_cases:
    try:
        # Spread the parsed input array as positional arguments
        val = ${fnName}(*tc["input"])
        results.append({"ok": True, "value": val})
    except Exception as e:
        results.append({"ok": False, "error": str(e) or e.__class__.__name__})

print(json.dumps(results, default=str))
`;

  fs.writeFileSync(scriptPath, runnerCode, "utf-8");

  return new Promise((resolve) => {
    execFile(
      "python",
      [scriptPath, JSON.stringify(testCases)],
      { timeout: 8000 },
      (err, stdout, stderr) => {
        const executionTimeMs = Math.round(performance.now() - startTime);
        try {
          fs.rmSync(tmpDir, { recursive: true, force: true });
        } catch {}

        if (err || !stdout.trim()) {
          const errText = stderr.trim() || err?.message || "Execution failed";
          const results = testCases.map((tc) => ({
            passed: false,
            input: tc.input,
            expected: tc.expected,
            actual: undefined,
            error: errText.split("\n").slice(-3).join("\n"),
          }));
          resolve({
            results,
            passed: 0,
            total: testCases.length,
            score: 0,
            status: "failed",
            executionTimeMs,
          });
          return;
        }

        try {
          const parsed = JSON.parse(stdout.trim()) as Array<
            { ok: true; value: unknown } | { ok: false; error: string }
          >;

          const results: EvaluatedTestCase[] = testCases.map((tc, idx) => {
            const res = parsed[idx];
            if (!res || !res.ok) {
              return {
                passed: false,
                input: tc.input,
                expected: tc.expected,
                actual: undefined,
                error: res ? res.error : "No output",
              };
            }
            const isPass = deepEqual(res.value, tc.expected);
            return {
              passed: isPass,
              input: tc.input,
              expected: tc.expected,
              actual: res.value,
              error: null,
            };
          });

          const passedCount = results.filter((r) => r.passed).length;
          const totalCount = results.length;
          const score = Math.round((passedCount / Math.max(1, totalCount)) * 100);
          const status =
            passedCount === totalCount
              ? "accepted"
              : passedCount > 0
              ? "partial"
              : "failed";

          resolve({
            results,
            passed: passedCount,
            total: totalCount,
            score,
            status,
            executionTimeMs,
          });
        } catch {
          const results = testCases.map((tc) => ({
            passed: false,
            input: tc.input,
            expected: tc.expected,
            actual: undefined,
            error: "Failed to parse Python execution result",
          }));
          resolve({
            results,
            passed: 0,
            total: testCases.length,
            score: 0,
            status: "failed",
            executionTimeMs,
          });
        }
      }
    );
  });
}

export async function evaluateJavaServer(
  code: string,
  testCases: Array<{ stdin: string; expected: string }>
): Promise<EvaluationSummary> {
  const startTime = performance.now();
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "javaeval-"));
  const javaFile = path.join(tmpDir, "Main.java");

  fs.writeFileSync(javaFile, code, "utf-8");

  return new Promise((resolve) => {
    // Compile Main.java with javac
    execFile("javac", [javaFile], { timeout: 10000 }, (compileErr, cStdout, cStderr) => {
      if (compileErr || (cStderr && cStderr.includes("error:"))) {
        const compileMsg = (cStderr || compileErr?.message || "Compilation failed")
          .split("\n")
          .slice(0, 5)
          .join("\n");
        try {
          fs.rmSync(tmpDir, { recursive: true, force: true });
        } catch {}

        const results = testCases.map((tc) => ({
          passed: false,
          input: tc.stdin,
          expected: tc.expected,
          actual: "",
          error: `Compilation Error:\n${compileMsg}`,
        }));

        resolve({
          results,
          passed: 0,
          total: testCases.length,
          score: 0,
          status: "failed",
          executionTimeMs: Math.round(performance.now() - startTime),
        });
        return;
      }

      const results: EvaluatedTestCase[] = [];
      let completed = 0;

      if (testCases.length === 0) {
        try {
          fs.rmSync(tmpDir, { recursive: true, force: true });
        } catch {}
        resolve({
          results: [],
          passed: 0,
          total: 0,
          score: 0,
          status: "failed",
          executionTimeMs: Math.round(performance.now() - startTime),
        });
        return;
      }

      testCases.forEach((tc, idx) => {
        const child = execFile(
          "java",
          ["-cp", tmpDir, "Main"],
          { timeout: 5000 },
          (runErr, stdout, stderr) => {
            const actualOut = (stdout || "").replace(/\r\n/g, "\n").trim();
            const expectedOut = (tc.expected || "").replace(/\r\n/g, "\n").trim();
            const runErrorMsg = stderr ? stderr.split("\n").slice(0, 3).join("\n") : null;

            const isPass = !runErrorMsg && actualOut === expectedOut;

            results[idx] = {
              passed: isPass,
              input: tc.stdin,
              expected: expectedOut,
              actual: actualOut,
              error: runErrorMsg,
            };

            completed++;
            if (completed === testCases.length) {
              try {
                fs.rmSync(tmpDir, { recursive: true, force: true });
              } catch {}

              const passedCount = results.filter((r) => r.passed).length;
              const totalCount = results.length;
              const score = Math.round((passedCount / Math.max(1, totalCount)) * 100);
              const status =
                passedCount === totalCount
                  ? "accepted"
                  : passedCount > 0
                  ? "partial"
                  : "failed";

              resolve({
                results,
                passed: passedCount,
                total: totalCount,
                score,
                status,
                executionTimeMs: Math.round(performance.now() - startTime),
              });
            }
          }
        );

        if (child.stdin) {
          child.stdin.write(tc.stdin || "");
          child.stdin.end();
        }
      });
    });
  });
}

export async function evaluateSqlServer(
  code: string,
  schemaSql: string,
  testCases: Array<{ columns: string[]; rows: unknown[][] }>
): Promise<EvaluationSummary> {
  const startTime = performance.now();

  if (!schemaSql || !schemaSql.toLowerCase().includes("create table")) {
    return {
      results: [
        {
          passed: false,
          input: schemaSql,
          expected: testCases[0] || {},
          actual: undefined,
          error: "Invalid or missing SQL practice schema.",
        },
      ],
      passed: 0,
      total: 1,
      score: 0,
      status: "failed",
      executionTimeMs: 0,
    };
  }

  try {
    const db = new DatabaseSync(":memory:");
    db.exec(schemaSql);

    const stmt = db.prepare(code);
    const actualRowsObj = stmt.all() as Record<string, unknown>[];
    const actualCols = stmt.columns().map((c) => c.name);

    const tc = testCases[0] || { columns: [], rows: [] };
    const expectedCols = tc.columns || [];
    const expectedRows = tc.rows || [];

    const colsMatch =
      actualCols.length === expectedCols.length &&
      actualCols.every((c, i) => c.toLowerCase() === expectedCols[i]?.toLowerCase());

    const actualRows2D = actualRowsObj.map((row) =>
      actualCols.map((col) => row[col])
    );

    const rowsMatch = deepEqual(actualRows2D, expectedRows);
    const isPass = colsMatch && rowsMatch;

    const executionTimeMs = Math.round(performance.now() - startTime);

    return {
      results: [
        {
          passed: isPass,
          input: "SQL Query Execution",
          expected: { columns: expectedCols, rows: expectedRows },
          actual: { columns: actualCols, rows: actualRows2D },
          error: isPass
            ? null
            : !colsMatch
            ? `Column mismatch. Expected columns: [${expectedCols.join(", ")}], Got: [${actualCols.join(", ")}]`
            : `Row mismatch. Expected ${expectedRows.length} rows, Got ${actualRows2D.length} rows.`,
        },
      ],
      passed: isPass ? 1 : 0,
      total: 1,
      score: isPass ? 100 : 0,
      status: isPass ? "accepted" : "failed",
      executionTimeMs,
    };
  } catch (err: any) {
    const executionTimeMs = Math.round(performance.now() - startTime);
    return {
      results: [
        {
          passed: false,
          input: "SQL Query Execution",
          expected: testCases[0] || {},
          actual: undefined,
          error: err?.message || "SQL syntax or execution error",
        },
      ],
      passed: 0,
      total: 1,
      score: 0,
      status: "failed",
      executionTimeMs,
    };
  }
}

export async function generateCodingFeedbackWithAI(input: {
  title: string;
  language: CodingLanguage;
  code: string;
  status: string;
  passedCount: number;
  totalCount: number;
}): Promise<string> {
  try {
    const prompt = `
You are a senior coding interviewer. Review this ${input.language} code submission for the problem "${input.title}".

Status: ${input.status} (${input.passedCount}/${input.totalCount} tests passed).

Student Code:
\`\`\`${input.language}
${input.code}
\`\`\`

Provide concise, constructive code feedback (2-4 bullet points) focusing on code quality, performance/time complexity, edge case handling, and optimization suggestions.
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        temperature: 0.5,
        maxOutputTokens: 1000,
      },
    });

    return response.text || "Code submitted and evaluated.";
  } catch (err) {
    console.warn("[Coding AI] Feedback generation skipped:", err);
    return "Code evaluation completed.";
  }
}