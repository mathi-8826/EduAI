ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS linkedin_url text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS avatar_url text NOT NULL DEFAULT '';