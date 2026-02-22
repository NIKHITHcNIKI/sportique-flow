
-- Add constraint to prevent negative available_quantity
ALTER TABLE public.items ADD CONSTRAINT check_available_quantity CHECK (available_quantity >= 0);

-- Atomic borrow function
CREATE OR REPLACE FUNCTION public.borrow_item(_item_id UUID, _qty INTEGER)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  UPDATE items
  SET available_quantity = available_quantity - _qty
  WHERE id = _item_id AND available_quantity >= _qty;
  RETURN FOUND;
END;
$$;

-- Atomic return function
CREATE OR REPLACE FUNCTION public.return_item(_item_id UUID, _qty INTEGER)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  UPDATE items
  SET available_quantity = available_quantity + _qty
  WHERE id = _item_id AND available_quantity + _qty <= total_quantity;
  RETURN FOUND;
END;
$$;

-- Atomic scrap function
CREATE OR REPLACE FUNCTION public.scrap_item(_item_id UUID, _qty INTEGER)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  UPDATE items
  SET available_quantity = GREATEST(0, available_quantity - _qty),
      total_quantity = GREATEST(0, total_quantity - _qty)
  WHERE id = _item_id AND available_quantity >= _qty;
  RETURN FOUND;
END;
$$;

-- Fix RLS policies: change from RESTRICTIVE to PERMISSIVE
-- RESTRICTIVE policies AND together, which breaks multi-policy access patterns

-- borrow_records: fix SELECT and UPDATE policies
DROP POLICY IF EXISTS "Admins can update all borrows" ON public.borrow_records;
DROP POLICY IF EXISTS "Admins can view all borrows" ON public.borrow_records;
DROP POLICY IF EXISTS "Users can create borrows" ON public.borrow_records;
DROP POLICY IF EXISTS "Users can update own borrows" ON public.borrow_records;
DROP POLICY IF EXISTS "Users can view own borrows" ON public.borrow_records;

CREATE POLICY "Admins can update all borrows" ON public.borrow_records FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can view all borrows" ON public.borrow_records FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can create borrows" ON public.borrow_records FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own borrows" ON public.borrow_records FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can view own borrows" ON public.borrow_records FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- items: fix policies
DROP POLICY IF EXISTS "Admins can delete items" ON public.items;
DROP POLICY IF EXISTS "Admins can insert items" ON public.items;
DROP POLICY IF EXISTS "Admins can update items" ON public.items;
DROP POLICY IF EXISTS "Anyone authenticated can view items" ON public.items;

CREATE POLICY "Admins can delete items" ON public.items FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can insert items" ON public.items FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update items" ON public.items FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone authenticated can view items" ON public.items FOR SELECT TO authenticated USING (true);

-- profiles: fix policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- scrap_items: fix policies
DROP POLICY IF EXISTS "Admins can manage scrap items" ON public.scrap_items;
DROP POLICY IF EXISTS "Authenticated can view scrap items" ON public.scrap_items;

CREATE POLICY "Admins can manage scrap items" ON public.scrap_items FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated can view scrap items" ON public.scrap_items FOR SELECT TO authenticated USING (true);

-- user_roles: fix policies
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;

CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
