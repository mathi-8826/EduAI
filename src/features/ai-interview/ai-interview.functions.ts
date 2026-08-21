import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  generateTechnicalQuestionsAI,
  generateHrQuestionsAI,
  evaluateTechnicalAnswerAI,
  evaluateHrAnswerAI,
  generateFinalSummaryAI,
} from "./ai-interview-ai.server";
import type { AnswerEvaluationResult, InputMethod } from "./ai-interview.types";

type CreateTechnicalInput = {
  role: string;
};

type SubmitAnswerInput = {
  interviewId: string;
  questionId: string;
  answerText: string;
  inputMethod: InputMethod;
};

type InterviewIdInput = {
  interviewId: string;
};

export const createTechnicalInterview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: CreateTechnicalInput) => {
    const role = String(input?.role ?? "").trim();
    if (!role) {
      throw new Error("Role selection is required.");
    }
    return { role };
  })
  .handler(async ({ data, context }) => {
    const userId = context.userId;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1. Generate 4 questions with Gemini
    const questions = await generateTechnicalQuestionsAI(data.role);

    // 2. Insert interview
    const { data: interview, error: interviewError } = await supabaseAdmin
      .from("ai_interviews")
      .insert({
        user_id: userId,
        interview_type: "technical",
        role: data.role,
        difficulty: "medium-hard",
        total_questions: 4,
        completed_questions: 0,
        status: "in_progress",
      })
      .select("id")
      .single();

    if (interviewError || !interview) {
      throw new Error(interviewError?.message ?? "Could not create technical interview session.");
    }

    // 3. Save questions
    const questionsToInsert = questions.map((q) => ({
      interview_id: interview.id,
      question_number: q.question_number,
      question: q.question,
      category: q.category || "technical",
    }));

    const { error: questionsError } = await supabaseAdmin
      .from("ai_interview_questions")
      .insert(questionsToInsert);

    if (questionsError) {
      throw new Error(`Failed to save interview questions: ${questionsError.message}`);
    }

    return {
      interviewId: interview.id as string,
    };
  });

export const createHrInterview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(() => ({}))
  .handler(async ({ context }) => {
    const userId = context.userId;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1. Generate 4 HR questions with Gemini
    const questions = await generateHrQuestionsAI();

    // 2. Insert interview
    const { data: interview, error: interviewError } = await supabaseAdmin
      .from("ai_interviews")
      .insert({
        user_id: userId,
        interview_type: "hr",
        role: null,
        difficulty: "medium-hard",
        total_questions: 4,
        completed_questions: 0,
        status: "in_progress",
      })
      .select("id")
      .single();

    if (interviewError || !interview) {
      throw new Error(interviewError?.message ?? "Could not create HR interview session.");
    }

    // 3. Save questions
    const questionsToInsert = questions.map((q) => ({
      interview_id: interview.id,
      question_number: q.question_number,
      question: q.question,
      category: q.category || "hr",
    }));

    const { error: questionsError } = await supabaseAdmin
      .from("ai_interview_questions")
      .insert(questionsToInsert);

    if (questionsError) {
      throw new Error(`Failed to save HR questions: ${questionsError.message}`);
    }

    return {
      interviewId: interview.id as string,
    };
  });

export const getInterviewDetails = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: InterviewIdInput) => {
    const interviewId = String(input?.interviewId ?? "").trim();
    if (!interviewId) {
      throw new Error("Interview ID is required.");
    }
    return { interviewId };
  })
  .handler(async ({ data, context }) => {
    const userId = context.userId;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: interview, error: intErr } = await supabaseAdmin
      .from("ai_interviews")
      .select("*")
      .eq("id", data.interviewId)
      .eq("user_id", userId)
      .single();

    if (intErr || !interview) {
      throw new Error("Interview not found or access denied.");
    }

    const [{ data: questions }, { data: answers }, { data: feedback }] = await Promise.all([
      supabaseAdmin
        .from("ai_interview_questions")
        .select("*")
        .eq("interview_id", data.interviewId)
        .order("question_number", { ascending: true }),
      supabaseAdmin
        .from("ai_interview_answers")
        .select("*")
        .eq("interview_id", data.interviewId),
      supabaseAdmin
        .from("ai_interview_feedback")
        .select("*")
        .eq("interview_id", data.interviewId)
        .maybeSingle(),
    ]);

    return {
      interview,
      questions: questions || [],
      answers: answers || [],
      feedback: feedback || null,
    };
  });

export const submitInterviewAnswer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: SubmitAnswerInput) => {
    const interviewId = String(input?.interviewId ?? "").trim();
    const questionId = String(input?.questionId ?? "").trim();
    const answerText = String(input?.answerText ?? "").trim();
    const inputMethod: InputMethod = input?.inputMethod === "voice" ? "voice" : "text";

    if (!interviewId) throw new Error("Interview ID is required.");
    if (!questionId) throw new Error("Question ID is required.");
    if (!answerText || answerText.length < 5) {
      throw new Error("Please enter a meaningful answer before submitting (at least 5 characters).");
    }

    return { interviewId, questionId, answerText, inputMethod };
  })
  .handler(async ({ data, context }) => {
    const userId = context.userId;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1. Fetch interview
    const { data: interview, error: intErr } = await supabaseAdmin
      .from("ai_interviews")
      .select("*")
      .eq("id", data.interviewId)
      .eq("user_id", userId)
      .single();

    if (intErr || !interview) {
      throw new Error("Interview not found or permission denied.");
    }

    // 2. Fetch question
    const { data: question, error: qErr } = await supabaseAdmin
      .from("ai_interview_questions")
      .select("*")
      .eq("id", data.questionId)
      .eq("interview_id", data.interviewId)
      .single();

    if (qErr || !question) {
      throw new Error("Question not found.");
    }

    // 3. Evaluate answer with Gemini
    let evaluation: AnswerEvaluationResult;
    if (interview.interview_type === "technical") {
      evaluation = await evaluateTechnicalAnswerAI(
        question.question,
        data.answerText,
        interview.role || "Software Developer"
      );
    } else {
      evaluation = await evaluateHrAnswerAI(question.question, data.answerText);
    }

    // 4. Save/upsert answer into ai_interview_answers
    const { error: ansErr } = await supabaseAdmin
      .from("ai_interview_answers")
      .upsert(
        {
          interview_id: data.interviewId,
          question_id: data.questionId,
          user_id: userId,
          answer_text: data.answerText,
          input_method: data.inputMethod,
          overall_feedback: evaluation.overall_feedback,
          communication_feedback: evaluation.communication_feedback,
          technical_feedback: evaluation.technical_feedback,
          confidence_feedback: evaluation.confidence_feedback,
          answer_quality: evaluation.answer_quality,
        },
        { onConflict: "interview_id,question_id" }
      );

    if (ansErr) {
      throw new Error(`Failed to save answer: ${ansErr.message}`);
    }

    // 5. Update completed questions count
    const { data: allAnswers } = await supabaseAdmin
      .from("ai_interview_answers")
      .select("id")
      .eq("interview_id", data.interviewId);

    const completedCount = allAnswers?.length || 1;

    await supabaseAdmin
      .from("ai_interviews")
      .update({ completed_questions: completedCount })
      .eq("id", data.interviewId);

    return {
      evaluation,
      completedQuestions: completedCount,
    };
  });

export const completeInterview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: InterviewIdInput) => {
    const interviewId = String(input?.interviewId ?? "").trim();
    if (!interviewId) throw new Error("Interview ID is required.");
    return { interviewId };
  })
  .handler(async ({ data, context }) => {
    const userId = context.userId;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1. Fetch interview
    const { data: interview, error: intErr } = await supabaseAdmin
      .from("ai_interviews")
      .select("*")
      .eq("id", data.interviewId)
      .eq("user_id", userId)
      .single();

    if (intErr || !interview) {
      throw new Error("Interview session not found.");
    }

    // 2. Fetch all questions and answers
    const [{ data: questions }, { data: answers }] = await Promise.all([
      supabaseAdmin
        .from("ai_interview_questions")
        .select("*")
        .eq("interview_id", data.interviewId)
        .order("question_number", { ascending: true }),
      supabaseAdmin
        .from("ai_interview_answers")
        .select("*")
        .eq("interview_id", data.interviewId),
    ]);

    if (!questions || questions.length === 0) {
      throw new Error("No questions found for this interview.");
    }

    const qas = questions.map((q) => {
      const ans = (answers || []).find((a) => a.question_id === q.id);
      return {
        question: q.question,
        category: q.category,
        answer: ans?.answer_text || "No answer provided.",
        evaluation: {
          overall_feedback: ans?.overall_feedback || "",
          strengths: [],
          improvements: [],
          communication_feedback: ans?.communication_feedback || "",
          technical_feedback: ans?.technical_feedback || "",
          confidence_feedback: ans?.confidence_feedback || "",
          answer_quality: (ans?.answer_quality || "average") as any,
        },
      };
    });

    // 3. Generate synthesized final summary
    const finalSummaryResult = await generateFinalSummaryAI(
      interview.interview_type,
      interview.role,
      qas
    );

    // 4. Insert feedback
    const { data: feedback, error: fbErr } = await supabaseAdmin
      .from("ai_interview_feedback")
      .upsert(
        {
          interview_id: data.interviewId,
          strengths: finalSummaryResult.strengths,
          improvements: finalSummaryResult.improvements,
          communication_feedback: finalSummaryResult.communication_feedback,
          technical_feedback: finalSummaryResult.technical_feedback,
          confidence_feedback: finalSummaryResult.confidence_feedback,
          personality_feedback: finalSummaryResult.personality_feedback,
          cultural_fit_feedback: finalSummaryResult.cultural_fit_feedback,
          final_summary: finalSummaryResult.final_summary,
        },
        { onConflict: "interview_id" }
      )
      .select("*")
      .single();

    if (fbErr) {
      throw new Error(`Failed to save feedback summary: ${fbErr.message}`);
    }

    // 5. Update interview status to completed
    await supabaseAdmin
      .from("ai_interviews")
      .update({
        status: "completed",
        completed_questions: 4,
        completed_at: new Date().toISOString(),
        overall_feedback: finalSummaryResult.final_summary,
      })
      .eq("id", data.interviewId);

    return {
      feedback,
    };
  });
