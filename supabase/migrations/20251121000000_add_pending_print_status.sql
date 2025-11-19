-- Add 'pending_print' status to prints table
-- First, drop the existing constraint
ALTER TABLE public.prints
DROP CONSTRAINT IF EXISTS prints_status_check;

-- Add the new constraint with 'pending_print' included
ALTER TABLE public.prints
ADD CONSTRAINT prints_status_check 
CHECK (status IN ('pending_print', 'printing', 'completed', 'failed'));

-- Update default status to 'pending_print' for new prints
ALTER TABLE public.prints
ALTER COLUMN status SET DEFAULT 'pending_print';

