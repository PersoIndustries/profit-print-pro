-- Create subscription tier enum
CREATE TYPE public.subscription_tier AS ENUM ('free', 'tier_1', 'tier_2');

-- Create app role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create user_subscriptions table
CREATE TABLE public.user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  tier public.subscription_tier NOT NULL DEFAULT 'free',
  starts_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create orders table
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  order_number TEXT NOT NULL,
  customer_name TEXT,
  customer_email TEXT,
  status TEXT DEFAULT 'pending',
  total_amount NUMERIC,
  notes TEXT,
  order_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check user role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Create function to get user subscription tier
CREATE OR REPLACE FUNCTION public.get_user_tier(_user_id UUID)
RETURNS public.subscription_tier
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT tier FROM public.user_subscriptions 
     WHERE user_id = _user_id 
     AND (expires_at IS NULL OR expires_at > NOW())),
    'free'::public.subscription_tier
  )
$$;

-- Create function to check subscription limits
CREATE OR REPLACE FUNCTION public.check_subscription_limit(
  _user_id UUID,
  _resource_type TEXT
)
RETURNS BOOLEAN
LANGUAGE PLPGSQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_tier public.subscription_tier;
  current_count INTEGER;
  limit_count INTEGER;
BEGIN
  user_tier := public.get_user_tier(_user_id);
  
  -- Count current resources
  CASE _resource_type
    WHEN 'materials' THEN
      SELECT COUNT(*) INTO current_count FROM public.materials WHERE user_id = _user_id;
      limit_count := CASE user_tier
        WHEN 'free' THEN 10
        WHEN 'tier_1' THEN 50
        WHEN 'tier_2' THEN 999999
      END;
    WHEN 'projects' THEN
      SELECT COUNT(*) INTO current_count FROM public.projects WHERE user_id = _user_id;
      limit_count := CASE user_tier
        WHEN 'free' THEN 15
        WHEN 'tier_1' THEN 100
        WHEN 'tier_2' THEN 999999
      END;
    WHEN 'orders' THEN
      SELECT COUNT(*) INTO current_count 
      FROM public.orders 
      WHERE user_id = _user_id 
      AND order_date >= DATE_TRUNC('month', NOW());
      limit_count := CASE user_tier
        WHEN 'free' THEN 15
        WHEN 'tier_1' THEN 50
        WHEN 'tier_2' THEN 999999
      END;
    ELSE
      RETURN FALSE;
  END CASE;
  
  RETURN current_count < limit_count;
END;
$$;

-- RLS Policies for user_subscriptions
CREATE POLICY "Users can view own subscription"
  ON public.user_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all subscriptions"
  ON public.user_subscriptions FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for orders
CREATE POLICY "Users can view own orders"
  ON public.orders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own orders"
  ON public.orders FOR INSERT
  WITH CHECK (
    auth.uid() = user_id 
    AND public.check_subscription_limit(auth.uid(), 'orders')
  );

CREATE POLICY "Users can update own orders"
  ON public.orders FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own orders"
  ON public.orders FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all orders"
  ON public.orders FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for user_roles
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Update materials policies to include subscription limits
DROP POLICY IF EXISTS "Users can create own materials" ON public.materials;
CREATE POLICY "Users can create own materials"
  ON public.materials FOR INSERT
  WITH CHECK (
    auth.uid() = user_id 
    AND public.check_subscription_limit(auth.uid(), 'materials')
  );

-- Update projects policies to include subscription limits
DROP POLICY IF EXISTS "Users can create own projects" ON public.projects;
CREATE POLICY "Users can create own projects"
  ON public.projects FOR INSERT
  WITH CHECK (
    auth.uid() = user_id 
    AND public.check_subscription_limit(auth.uid(), 'projects')
  );

-- Triggers for updated_at
CREATE TRIGGER update_user_subscriptions_updated_at
  BEFORE UPDATE ON public.user_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Update handle_new_user function to create default subscription and role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name'
  );
  
  INSERT INTO public.user_subscriptions (user_id, tier)
  VALUES (NEW.id, 'free');
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;