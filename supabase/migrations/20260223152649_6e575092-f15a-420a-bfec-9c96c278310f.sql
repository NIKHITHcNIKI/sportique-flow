
CREATE OR REPLACE FUNCTION public.borrow_cart(
  _user_id UUID,
  _items JSONB
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
DECLARE
  item JSONB;
BEGIN
  FOR item IN SELECT * FROM jsonb_array_elements(_items)
  LOOP
    -- Atomically reduce inventory
    UPDATE items 
    SET available_quantity = available_quantity - (item->>'quantity')::INTEGER
    WHERE id = (item->>'id')::UUID 
    AND available_quantity >= (item->>'quantity')::INTEGER;
    
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Insufficient stock for item %', item->>'name';
    END IF;
    
    -- Create borrow record
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
$$;
