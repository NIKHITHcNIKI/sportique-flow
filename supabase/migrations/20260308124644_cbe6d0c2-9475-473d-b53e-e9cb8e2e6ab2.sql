
ALTER TABLE public.profiles ADD COLUMN student_id TEXT UNIQUE;

-- Create a function to look up email by student_id
CREATE OR REPLACE FUNCTION public.get_email_by_student_id(_student_id TEXT)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT email FROM public.profiles WHERE student_id = _student_id LIMIT 1;
$$;
