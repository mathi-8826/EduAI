-- 1. ai_interviews
CREATE TABLE IF NOT EXISTS public.ai_interviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  interview_type text NOT NULL CHECK (interview_type IN ('technical', 'hr')),
  role text,
  difficulty text NOT NULL DEFAULT 'medium-hard',
  total_questions integer NOT NULL DEFAULT 4,
  completed_questions integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned')),
  overall_feedback text,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

-- 2. ai_interview_questions
CREATE TABLE IF NOT EXISTS public.ai_interview_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id uuid NOT NULL REFERENCES public.ai_interviews(id) ON DELETE CASCADE,
  question_number integer NOT NULL,
  question text NOT NULL,
  category text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(interview_id, question_number)
);

-- 3. ai_interview_answers
CREATE TABLE IF NOT EXISTS public.ai_interview_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id uuid NOT NULL REFERENCES public.ai_interviews(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.ai_interview_questions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  answer_text text NOT NULL,
  input_method text NOT NULL DEFAULT 'text' CHECK (input_method IN ('text', 'voice')),
  overall_feedback text,
  communication_feedback text,
  technical_feedback text,
  confidence_feedback text,
  answer_quality text CHECK (answer_quality IS NULL OR answer_quality IN ('poor', 'average', 'good', 'excellent')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(interview_id, question_id)
);

-- 4. ai_interview_feedback
CREATE TABLE IF NOT EXISTS public.ai_interview_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id uuid NOT NULL REFERENCES public.ai_interviews(id) ON DELETE CASCADE,
  strengths text[] NOT NULL DEFAULT '{}',
  improvements text[] NOT NULL DEFAULT '{}',
  communication_feedback text,
  technical_feedback text,
  confidence_feedback text,
  personality_feedback text,
  cultural_fit_feedback text,
  final_summary text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(interview_id)
);

-- RLS & Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_interviews TO authenticated;
GRANT ALL ON public.ai_interviews TO service_role;
ALTER TABLE public.ai_interviews ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'user_interviews_select_own') THEN
    CREATE POLICY "user_interviews_select_own" ON public.ai_interviews FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'user_interviews_insert_own') THEN
    CREATE POLICY "user_interviews_insert_own" ON public.ai_interviews FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'user_interviews_update_own') THEN
    CREATE POLICY "user_interviews_update_own" ON public.ai_interviews FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'user_interviews_delete_own') THEN
    CREATE POLICY "user_interviews_delete_own" ON public.ai_interviews FOR DELETE TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_interview_questions TO authenticated;
GRANT ALL ON public.ai_interview_questions TO service_role;
ALTER TABLE public.ai_interview_questions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'questions_select_own') THEN
    CREATE POLICY "questions_select_own" ON public.ai_interview_questions FOR SELECT TO authenticated USING (
      EXISTS (SELECT 1 FROM public.ai_interviews WHERE id = ai_interview_questions.interview_id AND user_id = auth.uid())
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'questions_insert_own') THEN
    CREATE POLICY "questions_insert_own" ON public.ai_interview_questions FOR INSERT TO authenticated WITH CHECK (
      EXISTS (SELECT 1 FROM public.ai_interviews WHERE id = ai_interview_questions.interview_id AND user_id = auth.uid())
    );
  END IF;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_interview_answers TO authenticated;
GRANT ALL ON public.ai_interview_answers TO service_role;
ALTER TABLE public.ai_interview_answers ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'answers_select_own') THEN
    CREATE POLICY "answers_select_own" ON public.ai_interview_answers FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'answers_insert_own') THEN
    CREATE POLICY "answers_insert_own" ON public.ai_interview_answers FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'answers_update_own') THEN
    CREATE POLICY "answers_update_own" ON public.ai_interview_answers FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_interview_feedback TO authenticated;
GRANT ALL ON public.ai_interview_feedback TO service_role;
ALTER TABLE public.ai_interview_feedback ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'feedback_select_own') THEN
    CREATE POLICY "feedback_select_own" ON public.ai_interview_feedback FOR SELECT TO authenticated USING (
      EXISTS (SELECT 1 FROM public.ai_interviews WHERE id = ai_interview_feedback.interview_id AND user_id = auth.uid())
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'feedback_insert_own') THEN
    CREATE POLICY "feedback_insert_own" ON public.ai_interview_feedback FOR INSERT TO authenticated WITH CHECK (
      EXISTS (SELECT 1 FROM public.ai_interviews WHERE id = ai_interview_feedback.interview_id AND user_id = auth.uid())
    );
  END IF;
END $$;