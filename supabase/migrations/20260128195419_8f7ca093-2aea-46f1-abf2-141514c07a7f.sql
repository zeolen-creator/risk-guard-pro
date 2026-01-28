-- Add first_name and last_name columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS last_name TEXT;

-- Set default first_name for existing users from email (extract part before @)
UPDATE public.profiles
SET first_name = SPLIT_PART(email, '@', 1)
WHERE first_name IS NULL AND email IS NOT NULL;