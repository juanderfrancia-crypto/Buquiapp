-- ============================================================
-- BarberApp — Schema completo para Supabase
-- Ejecutar en: Supabase Dashboard > SQL Editor
-- ============================================================

-- EXTENSIONES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- ============================================================
-- TABLA: users
-- ============================================================
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  role text NOT NULL DEFAULT 'client' CHECK (role IN ('client', 'barber')),
  phone text,
  avatar_url text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_own" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "users_insert_own" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- ============================================================
-- TABLA: barbershops
-- ============================================================
CREATE TABLE IF NOT EXISTS public.barbershops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text NOT NULL,
  description text,
  phone text,
  image_url text,
  owner_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  business_type text NOT NULL DEFAULT 'barbershop'
    CHECK (business_type IN ('barbershop', 'beauty_salon', 'spa', 'other')),
  is_active boolean DEFAULT true,
  rating numeric(3,2) DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Índice para filtrado eficiente por tipo de negocio
CREATE INDEX IF NOT EXISTS idx_barbershops_business_type
  ON public.barbershops(business_type, is_active);

-- ============================================================
-- MIGRATION: Si ya tienes la tabla desplegada, ejecuta solo esto:
-- ALTER TABLE public.barbershops
--   ADD COLUMN IF NOT EXISTS business_type text NOT NULL DEFAULT 'barbershop'
--   CHECK (business_type IN ('barbershop', 'beauty_salon', 'spa', 'other'));
-- CREATE INDEX IF NOT EXISTS idx_barbershops_business_type
--   ON public.barbershops(business_type, is_active);
-- ============================================================

ALTER TABLE public.barbershops ENABLE ROW LEVEL SECURITY;

-- Cualquier usuario autenticado puede ver barberías activas
CREATE POLICY "barbershops_read_active" ON public.barbershops
  FOR SELECT USING (is_active = true OR owner_id = auth.uid());

-- Solo el dueño puede modificar
CREATE POLICY "barbershops_manage_own" ON public.barbershops
  FOR ALL USING (owner_id = auth.uid());

-- ============================================================
-- TABLA: services
-- ============================================================
CREATE TABLE IF NOT EXISTS public.services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id uuid NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  name text NOT NULL,
  duration_minutes integer NOT NULL CHECK (duration_minutes > 0),
  price numeric(10,2) NOT NULL CHECK (price >= 0),
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

-- Solo servicios activos visibles al público; el dueño ve todos los suyos
CREATE POLICY "services_read_all" ON public.services
  FOR SELECT USING (
    is_active = true OR
    EXISTS (SELECT 1 FROM public.barbershops WHERE id = services.barbershop_id AND owner_id = auth.uid())
  );

CREATE POLICY "services_manage_owner" ON public.services
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.barbershops WHERE id = services.barbershop_id AND owner_id = auth.uid())
  );

-- ============================================================
-- TABLA: availability
-- ============================================================
CREATE TABLE IF NOT EXISTS public.availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id uuid NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time time,
  end_time time,
  break_start time,
  break_end time,
  is_active boolean DEFAULT true,
  CHECK (start_time IS NULL OR end_time IS NULL OR end_time > start_time),
  CHECK (break_start IS NULL OR break_end IS NULL OR break_end > break_start),
  UNIQUE (barbershop_id, day_of_week)
);

ALTER TABLE public.availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "availability_read_all" ON public.availability
  FOR SELECT USING (true);

CREATE POLICY "availability_manage_owner" ON public.availability
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.barbershops WHERE id = availability.barbershop_id AND owner_id = auth.uid())
  );

-- ============================================================
-- TABLA: bookings
-- ============================================================
CREATE TABLE IF NOT EXISTS public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES public.services(id),
  barbershop_id uuid NOT NULL REFERENCES public.barbershops(id),
  booking_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL CHECK (end_time > start_time),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  notes text,
  created_at timestamptz DEFAULT now(),
  UNIQUE (barbershop_id, booking_date, start_time)
);

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- FUNCIÓN Y TRIGGER: validar que no haya doble reserva en el mismo slot
CREATE OR REPLACE FUNCTION public.check_no_double_booking()
RETURNS trigger AS $$
BEGIN
  IF NEW.status <> 'cancelled' THEN
    IF EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.barbershop_id = NEW.barbershop_id
      AND b.booking_date = NEW.booking_date
      AND b.status <> 'cancelled'
      AND b.id <> NEW.id
      AND (
        (b.start_time, b.end_time) OVERLAPS (NEW.start_time, NEW.end_time)
      )
    ) THEN
      RAISE EXCEPTION 'Double booking: time slot already reserved';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_double_booking_trigger
  BEFORE INSERT OR UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.check_no_double_booking();

-- Clientes ven sus propias reservas; barberos ven las de su negocio
CREATE POLICY "bookings_read_own" ON public.bookings
  FOR SELECT USING (
    user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.barbershops WHERE id = bookings.barbershop_id AND owner_id = auth.uid())
  );

CREATE POLICY "bookings_insert_client" ON public.bookings
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "bookings_update_parties" ON public.bookings
  FOR UPDATE USING (
    user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.barbershops WHERE id = bookings.barbershop_id AND owner_id = auth.uid())
  );

-- ============================================================
-- FUNCIÓN: crear usuario automáticamente en public.users
-- al registrarse en Supabase Auth
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'client')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- STORAGE: bucket para fotos de portada de negocios
-- Ejecutar en: Supabase Dashboard > SQL Editor
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('shop-images', 'shop-images', true)
ON CONFLICT (id) DO NOTHING;

-- Cualquiera puede leer las imágenes (portadas públicas)
CREATE POLICY "shop_images_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'shop-images');

-- Solo usuarios autenticados pueden subir (a su propia carpeta)
CREATE POLICY "shop_images_owner_upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'shop-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- El dueño puede actualizar y borrar sus propias imágenes
CREATE POLICY "shop_images_owner_manage" ON storage.objects
  FOR ALL USING (
    bucket_id = 'shop-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- ============================================================
-- DATOS DE EJEMPLO (opcional para testing)
-- ============================================================
-- Descomentar y adaptar después de crear un usuario barbero:
/*
INSERT INTO public.barbershops (name, address, owner_id, is_active)
VALUES ('Barbería El Padrino', 'Cra. 8 #12-34, Puerto Tejada', '<UUID-DEL-BARBERO>', true);

INSERT INTO public.services (barbershop_id, name, duration_minutes, price)
VALUES
  ('<ID-BARBERSHOP>', 'Corte', 30, 15000),
  ('<ID-BARBERSHOP>', 'Barba', 20, 10000),
  ('<ID-BARBERSHOP>', 'Corte + Barba', 45, 22000),
  ('<ID-BARBERSHOP>', 'Cejas', 10, 5000);

INSERT INTO public.availability (barbershop_id, day_of_week, start_time, end_time)
VALUES
  ('<ID-BARBERSHOP>', 1, '09:00', '19:00'),
  ('<ID-BARBERSHOP>', 2, '09:00', '19:00'),
  ('<ID-BARBERSHOP>', 3, '09:00', '19:00'),
  ('<ID-BARBERSHOP>', 4, '09:00', '19:00'),
  ('<ID-BARBERSHOP>', 5, '09:00', '19:00'),
  ('<ID-BARBERSHOP>', 6, '09:00', '15:00');
*/

-- ============================================================
-- ÍNDICES DE RENDIMIENTO (críticos para producción)
-- ============================================================

-- Hot path: dashboard del barbero y disponibilidad de slots
CREATE INDEX IF NOT EXISTS idx_bookings_barbershop_date
  ON public.bookings(barbershop_id, booking_date);

-- Hot path: "Mis citas" del cliente
CREATE INDEX IF NOT EXISTS idx_bookings_user
  ON public.bookings(user_id);

-- Hot path: cálculo de slots disponibles
CREATE INDEX IF NOT EXISTS idx_availability_shop_day
  ON public.availability(barbershop_id, day_of_week);

-- Hot path: listado de servicios del negocio (solo activos)
CREATE INDEX IF NOT EXISTS idx_services_shop_active
  ON public.services(barbershop_id, is_active);

-- Hot path: pantalla Home del cliente (negocios activos por tipo)
CREATE INDEX IF NOT EXISTS idx_barbershops_owner
  ON public.barbershops(owner_id);

-- ============================================================
-- MIGRACIÓN REQUERIDA: eliminar constraint UTC en booking_date
-- Ejecutar en Supabase Dashboard > SQL Editor si la tabla
-- ya fue creada con la versión anterior del schema.
-- ============================================================
-- ALTER TABLE public.bookings
--   DROP CONSTRAINT IF EXISTS bookings_booking_date_check;

-- ============================================================
-- MIGRACIÓN REQUERIDA: agregar columnas de descanso/almuerzo
-- Ejecutar si la tabla availability ya fue creada.
-- ============================================================
-- ALTER TABLE public.availability
--   ADD COLUMN IF NOT EXISTS break_start time,
--   ADD COLUMN IF NOT EXISTS break_end time,
--   ADD CONSTRAINT availability_break_check
--     CHECK (break_start IS NULL OR break_end IS NULL OR break_end > break_start);
-- ============================================================
