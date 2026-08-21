ALTER TYPE public.coding_topic ADD VALUE IF NOT EXISTS 'sql';
ALTER TABLE public.coding_questions ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT 'python';
ALTER TABLE public.coding_questions ADD COLUMN IF NOT EXISTS sql_schema text;