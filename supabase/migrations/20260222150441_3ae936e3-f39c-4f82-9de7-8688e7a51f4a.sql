
-- Fix: Students can only request return, not self-approve
DROP POLICY IF EXISTS "Users can update own borrows" ON public.borrow_records;

CREATE POLICY "Users can request return only" 
ON public.borrow_records 
FOR UPDATE 
TO authenticated 
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id AND
  status IN ('borrowed', 'return_requested')
);

-- Update handle_new_user to save phone/department from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email, phone, department)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email,
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'department'
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'student');
  
  RETURN NEW;
END;
$$;
