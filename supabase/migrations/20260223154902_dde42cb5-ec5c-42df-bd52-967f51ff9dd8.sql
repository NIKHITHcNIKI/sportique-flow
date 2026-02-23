
-- Fix: borrow_cart needs SECURITY DEFINER to update items table (students can't update items via RLS)
CREATE OR REPLACE FUNCTION public.borrow_cart(_user_id uuid, _items jsonb)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  item JSONB;
BEGIN
  FOR item IN SELECT * FROM jsonb_array_elements(_items)
  LOOP
    UPDATE items 
    SET available_quantity = available_quantity - (item->>'quantity')::INTEGER
    WHERE id = (item->>'id')::UUID 
    AND available_quantity >= (item->>'quantity')::INTEGER;
    
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Insufficient stock for item %', item->>'name';
    END IF;
    
    INSERT INTO borrow_records (item_id, user_id, quantity, purpose)
    VALUES (
      (item->>'id')::UUID,
      _user_id,
      (item->>'quantity')::INTEGER,
      NULLIF(item->>'purpose', '')
    );
  END LOOP;
  
  RETURN TRUE;
END;
$function$;

-- Also fix borrow_item for single-item borrows
CREATE OR REPLACE FUNCTION public.borrow_item(_item_id uuid, _qty integer)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE items
  SET available_quantity = available_quantity - _qty
  WHERE id = _item_id AND available_quantity >= _qty;
  RETURN FOUND;
END;
$function$;
