
-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('admin', 'user');
CREATE TYPE public.vqr_category AS ENUM ('quantitative', 'reasoning', 'verbal');
CREATE TYPE public.difficulty AS ENUM ('easy', 'medium', 'hard');
CREATE TYPE public.coding_topic AS ENUM ('arrays','strings','linked_list','trees','graphs','stack','queue','binary_search','sorting','dp');

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  college text NOT NULL DEFAULT '',
  department text NOT NULL DEFAULT '',
  year text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- ============ USER ROLES ============
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_roles_select_own" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

-- ============ AUTO PROFILE ON SIGNUP ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, college, department, year, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name',''),
    COALESCE(NEW.raw_user_meta_data->>'college',''),
    COALESCE(NEW.raw_user_meta_data->>'department',''),
    COALESCE(NEW.raw_user_meta_data->>'year',''),
    NEW.email
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user') ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ VQR TESTS ============
CREATE TABLE public.vqr_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  category public.vqr_category NOT NULL,
  topic text NOT NULL,
  difficulty public.difficulty NOT NULL DEFAULT 'medium',
  duration_minutes int NOT NULL DEFAULT 30,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.vqr_tests TO authenticated;
GRANT ALL ON public.vqr_tests TO service_role;
ALTER TABLE public.vqr_tests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vqr_tests_read_all_auth" ON public.vqr_tests FOR SELECT TO authenticated USING (true);

CREATE TABLE public.vqr_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id uuid NOT NULL REFERENCES public.vqr_tests(id) ON DELETE CASCADE,
  question text NOT NULL,
  option_a text NOT NULL,
  option_b text NOT NULL,
  option_c text NOT NULL,
  option_d text NOT NULL,
  correct_answer text NOT NULL CHECK (correct_answer IN ('a','b','c','d')),
  topic text NOT NULL,
  difficulty public.difficulty NOT NULL DEFAULT 'medium',
  explanation text
);
GRANT SELECT ON public.vqr_questions TO authenticated;
GRANT ALL ON public.vqr_questions TO service_role;
ALTER TABLE public.vqr_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vqr_questions_read_all_auth" ON public.vqr_questions FOR SELECT TO authenticated USING (true);

CREATE TABLE public.vqr_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  test_id uuid NOT NULL REFERENCES public.vqr_tests(id) ON DELETE CASCADE,
  score int NOT NULL,
  total int NOT NULL,
  accuracy numeric(5,2) NOT NULL,
  time_taken_seconds int NOT NULL,
  answers_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  topic_breakdown jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vqr_results TO authenticated;
GRANT ALL ON public.vqr_results TO service_role;
ALTER TABLE public.vqr_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vqr_results_own" ON public.vqr_results FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ CODING ============
CREATE TABLE public.coding_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text UNIQUE NOT NULL,
  difficulty public.difficulty NOT NULL DEFAULT 'easy',
  topic public.coding_topic NOT NULL,
  description text NOT NULL,
  examples jsonb NOT NULL DEFAULT '[]'::jsonb,
  constraints text,
  starter_code jsonb NOT NULL DEFAULT '{}'::jsonb,
  test_cases jsonb NOT NULL DEFAULT '[]'::jsonb,
  hints jsonb NOT NULL DEFAULT '[]'::jsonb,
  tags text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.coding_questions TO authenticated;
GRANT ALL ON public.coding_questions TO service_role;
ALTER TABLE public.coding_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "coding_questions_read_all_auth" ON public.coding_questions FOR SELECT TO authenticated USING (true);

CREATE TABLE public.coding_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.coding_questions(id) ON DELETE CASCADE,
  language text NOT NULL,
  code text NOT NULL,
  status text NOT NULL,
  score int NOT NULL DEFAULT 0,
  execution_time_ms int,
  passed_tests int NOT NULL DEFAULT 0,
  total_tests int NOT NULL DEFAULT 0,
  submitted_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coding_submissions TO authenticated;
GRANT ALL ON public.coding_submissions TO service_role;
ALTER TABLE public.coding_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "coding_submissions_own" ON public.coding_submissions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ AI FEEDBACK ============
CREATE TABLE public.ai_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  test_type text NOT NULL,
  feedback text NOT NULL,
  strengths jsonb NOT NULL DEFAULT '[]'::jsonb,
  weaknesses jsonb NOT NULL DEFAULT '[]'::jsonb,
  recommendations jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_feedback TO authenticated;
GRANT ALL ON public.ai_feedback TO service_role;
ALTER TABLE public.ai_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ai_feedback_own" ON public.ai_feedback FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ SEED VQR TESTS + QUESTIONS ============
DO $$
DECLARE t_id uuid;
BEGIN
  -- QUANT: Time & Work
  INSERT INTO public.vqr_tests (title, category, topic, difficulty) VALUES ('Time & Work Basics', 'quantitative', 'Time & Work', 'medium') RETURNING id INTO t_id;
  INSERT INTO public.vqr_questions (test_id, question, option_a, option_b, option_c, option_d, correct_answer, topic, difficulty) VALUES
    (t_id, 'A can do a work in 10 days, B in 15 days. Together they finish in?', '6 days', '5 days', '7 days', '8 days', 'a', 'Time & Work','easy'),
    (t_id, 'If 8 men complete a job in 12 days, how many days for 16 men?', '6', '4', '8', '10', 'a', 'Time & Work','easy'),
    (t_id, 'A works twice as fast as B. Together 12 days. B alone?', '18', '24', '36', '30', 'c', 'Time & Work','medium'),
    (t_id, 'A finishes 1/3 of work in 5 days. Total days?', '15', '10', '12', '20', 'a', 'Time & Work','easy'),
    (t_id, 'Pipe A fills in 6h, B empties in 12h. Together fills in?', '12h', '8h', '10h', '6h', 'a', 'Time & Work','medium');

  -- QUANT: Percentages
  INSERT INTO public.vqr_tests (title, category, topic, difficulty) VALUES ('Percentages Sprint', 'quantitative', 'Percentages', 'easy') RETURNING id INTO t_id;
  INSERT INTO public.vqr_questions (test_id, question, option_a, option_b, option_c, option_d, correct_answer, topic, difficulty) VALUES
    (t_id, '25% of 240 is?', '60', '50', '70', '48', 'a', 'Percentages','easy'),
    (t_id, 'A number increased by 20% becomes 180. Number?', '150', '160', '140', '120', 'a', 'Percentages','easy'),
    (t_id, 'What % is 45 of 180?', '25%', '20%', '30%', '15%', 'a', 'Percentages','easy'),
    (t_id, 'Price rises 10% then falls 10%. Net change?', '-1%', '0%', '+1%', '-10%', 'a', 'Percentages','medium'),
    (t_id, 'If 30% of x = 45, x = ?', '150', '135', '120', '90', 'a', 'Percentages','easy');

  -- REASONING: Blood Relations
  INSERT INTO public.vqr_tests (title, category, topic, difficulty) VALUES ('Blood Relations', 'reasoning', 'Blood Relations', 'medium') RETURNING id INTO t_id;
  INSERT INTO public.vqr_questions (test_id, question, option_a, option_b, option_c, option_d, correct_answer, topic, difficulty) VALUES
    (t_id, 'A is B''s brother. C is A''s mother. D is C''s father. How is D to B?', 'Grandfather', 'Father', 'Uncle', 'Brother', 'a', 'Blood Relations','medium'),
    (t_id, 'Pointing to a man: "His son is my son''s uncle." Who is the man?', 'Father', 'Brother', 'Uncle', 'Grandfather', 'a', 'Blood Relations','medium'),
    (t_id, 'X is Y''s father. Y is Z''s mother. Z is X''s?', 'Grandchild', 'Son', 'Nephew', 'Cousin', 'a', 'Blood Relations','easy'),
    (t_id, 'Rita''s father''s only daughter is Rita. Rita has how many sisters?', '0', '1', '2', 'Unknown', 'a', 'Blood Relations','easy'),
    (t_id, 'A''s mother is sister of B''s father. Relation A to B?', 'Cousin', 'Nephew', 'Brother', 'Uncle', 'a', 'Blood Relations','medium');

  -- VERBAL: Synonyms
  INSERT INTO public.vqr_tests (title, category, topic, difficulty) VALUES ('Synonyms Warmup', 'verbal', 'Synonyms', 'easy') RETURNING id INTO t_id;
  INSERT INTO public.vqr_questions (test_id, question, option_a, option_b, option_c, option_d, correct_answer, topic, difficulty) VALUES
    (t_id, 'Synonym of ABUNDANT?', 'Plentiful', 'Scarce', 'Empty', 'Tiny', 'a', 'Synonyms','easy'),
    (t_id, 'Synonym of BENEVOLENT?', 'Kind', 'Cruel', 'Angry', 'Sad', 'a', 'Synonyms','easy'),
    (t_id, 'Synonym of CANDID?', 'Frank', 'Hidden', 'Fake', 'Dull', 'a', 'Synonyms','easy'),
    (t_id, 'Synonym of DILIGENT?', 'Hardworking', 'Lazy', 'Careless', 'Sleepy', 'a', 'Synonyms','easy'),
    (t_id, 'Synonym of EPHEMERAL?', 'Short-lived', 'Eternal', 'Solid', 'Loud', 'a', 'Synonyms','medium');
END $$;

-- ============ SEED CODING QUESTIONS ============
INSERT INTO public.coding_questions (title, slug, difficulty, topic, description, examples, constraints, starter_code, test_cases, hints, tags) VALUES
('Two Sum', 'two-sum', 'easy', 'arrays',
 'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.',
 '[{"input":"nums=[2,7,11,15], target=9","output":"[0,1]"}]'::jsonb,
 '2 <= nums.length <= 10^4',
 '{"javascript":"function twoSum(nums, target) {\n  // your code\n}","python":"def two_sum(nums, target):\n    pass"}'::jsonb,
 '[{"input":[[2,7,11,15],9],"expected":[0,1]},{"input":[[3,2,4],6],"expected":[1,2]}]'::jsonb,
 '["Use a hash map"]'::jsonb,
 ARRAY['array','hashmap']),
('Reverse String', 'reverse-string', 'easy', 'strings',
 'Write a function that reverses a string.',
 '[{"input":"\"hello\"","output":"\"olleh\""}]'::jsonb,
 '1 <= s.length <= 10^5',
 '{"javascript":"function reverseString(s) {\n  // your code\n}","python":"def reverse_string(s):\n    pass"}'::jsonb,
 '[{"input":["hello"],"expected":"olleh"},{"input":["world"],"expected":"dlrow"}]'::jsonb,
 '[]'::jsonb,
 ARRAY['string']),
('Valid Parentheses', 'valid-parentheses', 'easy', 'stack',
 'Given a string s containing just the characters "()[]{}", determine if the input string is valid.',
 '[{"input":"\"()[]{}\"","output":"true"}]'::jsonb,
 '1 <= s.length <= 10^4',
 '{"javascript":"function isValid(s) {\n  // your code\n}","python":"def is_valid(s):\n    pass"}'::jsonb,
 '[{"input":["()"],"expected":true},{"input":["(]"],"expected":false}]'::jsonb,
 '["Use a stack"]'::jsonb,
 ARRAY['stack','string']),
('Fibonacci', 'fibonacci', 'easy', 'dp',
 'Return the nth Fibonacci number (0-indexed).',
 '[{"input":"n=5","output":"5"}]'::jsonb,
 '0 <= n <= 30',
 '{"javascript":"function fib(n) {\n  // your code\n}","python":"def fib(n):\n    pass"}'::jsonb,
 '[{"input":[5],"expected":5},{"input":[10],"expected":55}]'::jsonb,
 '[]'::jsonb,
 ARRAY['dp','recursion']),
('Binary Search', 'binary-search', 'medium', 'binary_search',
 'Given a sorted array nums and target, return its index or -1.',
 '[{"input":"nums=[-1,0,3,5,9,12], target=9","output":"4"}]'::jsonb,
 '1 <= nums.length <= 10^4',
 '{"javascript":"function search(nums, target) {\n  // your code\n}","python":"def search(nums, target):\n    pass"}'::jsonb,
 '[{"input":[[-1,0,3,5,9,12],9],"expected":4},{"input":[[-1,0,3,5,9,12],2],"expected":-1}]'::jsonb,
 '[]'::jsonb,
 ARRAY['binary-search']);
