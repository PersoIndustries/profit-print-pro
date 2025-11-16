-- Update order_items status values to new workflow
-- First, drop the existing constraint
ALTER TABLE public.order_items
DROP CONSTRAINT IF EXISTS order_items_status_check;

-- Map old statuses to new statuses
UPDATE public.order_items
SET status = CASE
  WHEN status = 'pending' THEN 'pending'
  WHEN status = 'design' THEN 'preparation'
  WHEN status = 'to_produce' THEN 'ready_to_produce'
  WHEN status = 'printing' THEN 'on_production'
  WHEN status = 'clean_and_packaging' THEN 'packaging'
  WHEN status = 'sent' THEN 'sent'
  ELSE 'pending'
END;

-- Add the new constraint with updated status values
ALTER TABLE public.order_items
ADD CONSTRAINT order_items_status_check 
CHECK (status IN ('pending', 'preparation', 'ready_to_produce', 'on_production', 'packaging', 'sent'));

-- Update default status to 'pending'
ALTER TABLE public.order_items
ALTER COLUMN status SET DEFAULT 'pending';

-- Also update orders table status (if it has a constraint, we'll handle it)
-- First check if orders table has status constraint and update it
DO $$
BEGIN
  -- Update existing order statuses
  UPDATE public.orders
  SET status = CASE
    WHEN status = 'pending' THEN 'pending'
    WHEN status = 'design' THEN 'preparation'
    WHEN status = 'to_produce' THEN 'ready_to_produce'
    WHEN status = 'printing' THEN 'on_production'
    WHEN status = 'clean_and_packaging' THEN 'packaging'
    WHEN status = 'sent' THEN 'sent'
    ELSE 'pending'
  END;
END $$;

