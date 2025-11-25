-- Add Stripe metadata columns to invoices
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS stripe_invoice_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_invoice_pdf_url TEXT,
  ADD COLUMN IF NOT EXISTS stripe_receipt_url TEXT,
  ADD COLUMN IF NOT EXISTS stripe_checkout_session_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_invoices_stripe_invoice_id
  ON public.invoices(stripe_invoice_id);

-- Attempt to backfill stripe_invoice_id from existing notes
UPDATE public.invoices
SET stripe_invoice_id = regexp_replace(notes, '.*Invoice: ([A-Za-z0-9_]+).*', '\1')
WHERE stripe_invoice_id IS NULL
  AND notes ILIKE '%Invoice:%';

