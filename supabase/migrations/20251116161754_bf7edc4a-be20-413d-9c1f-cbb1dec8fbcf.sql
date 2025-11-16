-- Modificar el trigger handle_new_user para crear usuarios con trial de 15 días
-- Primero eliminamos el trigger y función existente si existen
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Crear nueva función para manejar nuevos usuarios con trial
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Insertar perfil de usuario
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );

  -- Insertar suscripción con trial de 15 días
  INSERT INTO public.user_subscriptions (
    user_id,
    tier,
    status,
    starts_at,
    expires_at,
    billing_period
  )
  VALUES (
    NEW.id,
    'tier_1', -- Trial con tier_1
    'trial',
    NOW(),
    NOW() + INTERVAL '15 days',
    'monthly'
  );

  -- Insertar rol de usuario
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');

  RETURN NEW;
END;
$$;

-- Crear el trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();