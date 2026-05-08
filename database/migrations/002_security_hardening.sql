-- ============================================================
-- MIGRACIÓN 002: Security Hardening
-- Ejecutar en: Supabase Dashboard > SQL Editor
-- ============================================================

-- 1. Columnas faltantes en users
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS push_token text;

-- 2. Permitir rol 'admin' en el CHECK de users
ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users
  ADD CONSTRAINT users_role_check
    CHECK (role IN ('client', 'barber', 'admin'));

-- 3. Proteger trigger: el auto-registro nunca puede crear un admin
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  requested_role text;
BEGIN
  requested_role := COALESCE(NEW.raw_user_meta_data->>'role', 'client');
  -- Clamp: solo 'client' o 'barber' permitidos por auto-registro
  IF requested_role NOT IN ('client', 'barber') THEN
    requested_role := 'client';
  END IF;

  INSERT INTO public.users (id, name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    requested_role
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. RLS: admin puede leer y actualizar todos los usuarios
DROP POLICY IF EXISTS "admin_read_users" ON public.users;
CREATE POLICY "admin_read_users" ON public.users
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
  );

DROP POLICY IF EXISTS "admin_update_users" ON public.users;
CREATE POLICY "admin_update_users" ON public.users
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
  );

-- 5. RLS: admin puede leer y gestionar todos los negocios
DROP POLICY IF EXISTS "admin_read_barbershops" ON public.barbershops;
CREATE POLICY "admin_read_barbershops" ON public.barbershops
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
  );

DROP POLICY IF EXISTS "admin_update_barbershops" ON public.barbershops;
CREATE POLICY "admin_update_barbershops" ON public.barbershops
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
  );

-- 6. RLS: admin puede leer todas las reservas
DROP POLICY IF EXISTS "admin_read_bookings" ON public.bookings;
CREATE POLICY "admin_read_bookings" ON public.bookings
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
  );

-- 7. Tabla de auditoría: registro inmutable de acciones admin
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id    uuid NOT NULL REFERENCES auth.users(id),
  action      text NOT NULL,
  entity_type text NOT NULL,
  entity_id   uuid,
  details     jsonb NOT NULL DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Solo admins pueden leer el log; nadie puede modificarlo ni borrarlo
DROP POLICY IF EXISTS "audit_logs_admin_read" ON public.admin_audit_logs;
CREATE POLICY "audit_logs_admin_read" ON public.admin_audit_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
  );

-- Función SECURITY DEFINER para escritura segura de auditoría
-- El cliente llama a esta RPC; la función valida que sea admin antes de insertar
CREATE OR REPLACE FUNCTION public.log_admin_action(
  p_action      text,
  p_entity_type text,
  p_entity_id   uuid    DEFAULT NULL,
  p_details     jsonb   DEFAULT '{}'
)
RETURNS void AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  INSERT INTO public.admin_audit_logs (admin_id, action, entity_type, entity_id, details)
  VALUES (auth.uid(), p_action, p_entity_type, p_entity_id, p_details);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Índice para el log (consultas por admin o por fecha)
CREATE INDEX IF NOT EXISTS idx_audit_logs_admin
  ON public.admin_audit_logs(admin_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_users_push_token
  ON public.users(push_token) WHERE push_token IS NOT NULL;
