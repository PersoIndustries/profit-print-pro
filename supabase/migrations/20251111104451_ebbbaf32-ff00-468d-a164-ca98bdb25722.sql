-- Insertar suscripción gratuita para el usuario existente
INSERT INTO public.user_subscriptions (user_id, tier, status)
VALUES ('3e24ef9d-8960-472a-89c5-1f44f64ce8e2', 'free', 'active')
ON CONFLICT (user_id) DO NOTHING;

-- Insertar rol de usuario para el usuario existente
INSERT INTO public.user_roles (user_id, role)
VALUES ('3e24ef9d-8960-472a-89c5-1f44f64ce8e2', 'user')
ON CONFLICT DO NOTHING;

-- Verificar que el trigger existe y está activo
-- Si no existe, lo creamos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'on_auth_user_created' 
    AND tgrelid = 'auth.users'::regclass
  ) THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
  END IF;
END $$;