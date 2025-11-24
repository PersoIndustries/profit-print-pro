-- Create products table to manage active products in the store
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  tier TEXT NOT NULL CHECK (tier IN ('tier_1', 'tier_2')),
  billing_period TEXT NOT NULL CHECK (billing_period IN ('monthly', 'annual')),
  product_type TEXT NOT NULL CHECK (product_type IN ('regular', 'early_bird')),
  stripe_price_id TEXT,
  stripe_product_id TEXT,
  price_amount_cents INTEGER NOT NULL DEFAULT 0, -- Price in cents (0 for VIP products)
  currency TEXT DEFAULT 'eur',
  is_active BOOLEAN DEFAULT true,
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  max_uses INTEGER, -- NULL for unlimited
  current_uses INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tier, billing_period, product_type)
);

-- Create index for active products lookup
CREATE INDEX IF NOT EXISTS idx_products_active 
ON public.products(is_active, start_date, end_date) 
WHERE is_active = true;

-- Create index for product type lookup
CREATE INDEX IF NOT EXISTS idx_products_type 
ON public.products(product_type, tier, billing_period);

-- Enable RLS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Only admins can manage products
CREATE POLICY "Admins can view all products"
  ON public.products FOR SELECT
  USING (true); -- Everyone can view products (needed for pricing page)

CREATE POLICY "Admins can insert products"
  ON public.products FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update products"
  ON public.products FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete products"
  ON public.products FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert default Early Bird products with Stripe IDs
INSERT INTO public.products (name, description, tier, billing_period, product_type, price_amount_cents, stripe_product_id, stripe_price_id, is_active, start_date)
VALUES
  ('Layer Suite - PROFESIONAL - MONTHLY [EARLY BIRD]', 'Plan Profesional mensual con descuento Early Bird para primeros usuarios', 'tier_1', 'monthly', 'early_bird', 399, 'prod_TU3aWn9vMq2FPn', 'price_1SX5bsFseepDQpf7OF82dSCf', true, NOW()),
  ('Layer Suite - PROFESIONAL - ANUAL [EARLY BIRD]', 'Plan Profesional anual con descuento Early Bird para primeros usuarios', 'tier_1', 'annual', 'early_bird', 3830, 'prod_TU3aWn9vMq2FPn', 'price_1SX5TjFseepDQpf7lETM8Q8r', true, NOW()),
  ('Layer Suite - BUSINESS - MONTHLY [EARLY BIRD]', 'Plan Business mensual con descuento Early Bird para primeros usuarios', 'tier_2', 'monthly', 'early_bird', 1299, 'prod_TU3lszIt0T1ypv', 'price_1SX5deFseepDQpf7hkxWwbxF', true, NOW()),
  ('Layer Suite - BUSINESS - ANUAL [EARLY BIRD]', 'Plan Business anual con descuento Early Bird para primeros usuarios', 'tier_2', 'annual', 'early_bird', 12470, 'prod_TU3lszIt0T1ypv', 'price_1SX5fAFseepDQpf75L9cMtQt', true, NOW())
ON CONFLICT (tier, billing_period, product_type) 
DO UPDATE SET
  stripe_product_id = EXCLUDED.stripe_product_id,
  stripe_price_id = EXCLUDED.stripe_price_id;

