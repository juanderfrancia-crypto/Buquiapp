# 🚀 Barberly - Plataforma Profesional de Servicios Personales

## 📋 Visión Empresarial

### Problema que Resolvemos
```
❌ ANTES (Cliente):
- "¿Dónde me corto el cabello cerca?"
- Googlea, llama, 20 minutos descubriendo
- ¿Tienen disponibilidad hoy?
- Tiene que ir sin confirmación
- Espera 2 horas

✅ DESPUÉS (Con Barberly):
- Abre app → ve 12 opciones en radio 5km
- Precios, fotos, calificaciones visibles
- Ve disponibilidad en TIEMPO REAL
- Reserva en 2 minutos desde casa
- Llega a la hora exacta
```

### Valor Propuesto

**Para Cliente:**
- ✅ Descubre servicios fácilmente
- ✅ Compara precios/ubicación/disponibilidad
- ✅ Reserva sin riesgo de no haber espacio
- ✅ Optimiza tiempo (no se pierde buscando)

**Para Negocio Owner:**
- ✅ Alcanza nuevos clientes
- ✅ Optimiza agenda (menos clientes perdidos por "no disponibilidad")
- ✅ Reduce tiempo en llamadas
- ✅ Datos de ocupación/demanda
- ✅ Competir en precio/calidad visible

**Para Barberly:**
- ✅ Comisión por reserva (modelo SaaS)
- ✅ Network effect (+ usuarios = + negocios, + negocios = + usuarios)
- ✅ Datos: patrones de demanda por zona/servicio

---

## 🏛️ Arquitectura Profesional (No Minimal, Sino Escalable)

### Phase 1: MVP Pro (Versión Profesional)

#### 1.1 Database Schema - Rediseño Profesional

```sql
-- ==================== CATEGORÍAS ====================
CREATE TABLE categories (
  id uuid PRIMARY KEY,
  name text UNIQUE,          -- "Barbería", "Salón de Belleza", "Clínica Dental"
  icon text,                 -- emoji or icon name
  description text,
  color text,                -- UI color coding
  sort_order int
);

-- ==================== NEGOCIOS (GENÉRICO) ====================
CREATE TABLE businesses (  -- ← Cambio de "barbershops"
  id uuid PRIMARY KEY,
  category_id uuid REFERENCES categories,
  name text NOT NULL,
  description text,
  address text NOT NULL,
  latitude decimal,          -- Para búsqueda geográfica
  longitude decimal,
  phone text,
  website text,
  image_url text,
  owner_id uuid REFERENCES users,
  
  -- Información de operación
  established_year int,
  staff_count int,
  languages text[],          -- ["es", "en"]
  
  -- Métricas
  rating numeric(3,2) DEFAULT 0,
  total_reviews int DEFAULT 0,
  
  -- Estado
  is_active boolean DEFAULT true,
  verification_status text CHECK (verification_status IN ('unverified', 'verified', 'premium')),
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Índices para búsqueda/filtrado rápido
CREATE INDEX idx_businesses_category ON businesses(category_id, is_active);
CREATE INDEX idx_businesses_location ON businesses USING GIST(ll_to_earth(latitude, longitude));

-- ==================== SERVICIOS (MEJORADO) ====================
CREATE TABLE services (
  id uuid PRIMARY KEY,
  business_id uuid REFERENCES businesses ON DELETE CASCADE,
  
  -- Información del servicio
  name text NOT NULL,
  description text,
  duration_minutes int NOT NULL CHECK (duration_minutes > 0),
  price numeric(10,2) NOT NULL CHECK (price >= 0),
  
  -- Variantes (ej: "Corte" → "Clásico", "Moderno", "Fade")
  variants jsonb,  -- {"classic": 15000, "modern": 20000}
  
  -- Política de cancelación
  cancellation_hours int DEFAULT 24,  -- Cancelable con 24h anticipación
  
  -- Metadata
  category text,     -- "haircut", "manicure", "consultation"
  is_available boolean DEFAULT true,
  is_popular boolean DEFAULT false,   -- Mostrar destacado
  
  created_at timestamptz DEFAULT now()
);

-- ==================== DISPONIBILIDAD (MEJORADO) ====================
CREATE TABLE availability (
  id uuid PRIMARY KEY,
  business_id uuid REFERENCES businesses ON DELETE CASCADE,
  
  day_of_week int CHECK (day_of_week BETWEEN 0 AND 6),
  
  -- Múltiples slots por día (ej: 9-1 + 2-6)
  time_slots jsonb,  -- [{"start": "09:00", "end": "13:00"}, {"start": "14:00", "end": "18:00"}]
  
  is_active boolean DEFAULT true,
  
  UNIQUE(business_id, day_of_week)
);

-- ==================== BOOKINGS (MEJORADO) ====================
CREATE TABLE bookings (
  id uuid PRIMARY KEY,
  
  -- Referencias
  user_id uuid REFERENCES users ON DELETE CASCADE,
  service_id uuid REFERENCES services,
  business_id uuid REFERENCES businesses,
  assigned_staff_id uuid,  -- Para futuro (asignación específica de barbero)
  
  -- Detalles de la reserva
  booking_date date NOT NULL CHECK (booking_date >= CURRENT_DATE),
  start_time time NOT NULL,
  end_time time NOT NULL CHECK (end_time > start_time),
  
  -- Información del servicio (snapshot)
  service_name text,
  service_price numeric(10,2),
  
  -- Status workflow
  status text NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'confirmed', 'completed', 'cancelled', 'no_show')
  ),
  
  -- Cancelación
  cancelled_at timestamptz,
  cancellation_reason text,
  
  -- Notas
  client_notes text,        -- "Quiero corte fade estilo Drake"
  staff_notes text,         -- Notas internas del barbero
  
  -- Tracking
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_bookings_user ON bookings(user_id, status);
CREATE INDEX idx_bookings_business ON bookings(business_id, booking_date);
CREATE UNIQUE INDEX idx_no_double_booking ON bookings(
  business_id, booking_date, start_time
) WHERE status IN ('pending', 'confirmed');

-- ==================== REVIEWS ====================
CREATE TABLE reviews (
  id uuid PRIMARY KEY,
  booking_id uuid REFERENCES bookings UNIQUE,
  business_id uuid REFERENCES businesses,
  user_id uuid REFERENCES users,
  
  rating int CHECK (rating BETWEEN 1 AND 5),
  comment text,
  photos text[],
  
  created_at timestamptz DEFAULT now()
);

-- Trigger: actualizar rating promedio
CREATE OR REPLACE FUNCTION update_business_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE businesses SET
    rating = (SELECT AVG(rating) FROM reviews WHERE business_id = NEW.business_id),
    total_reviews = (SELECT COUNT(*) FROM reviews WHERE business_id = NEW.business_id)
  WHERE id = NEW.business_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER review_rating_trigger AFTER INSERT ON reviews
FOR EACH ROW EXECUTE FUNCTION update_business_rating();

-- ==================== FAVORITE BUSINESSES ====================
CREATE TABLE favorites (
  user_id uuid REFERENCES users ON DELETE CASCADE,
  business_id uuid REFERENCES businesses ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, business_id)
);

-- ==================== STAFF (FUTURO) ====================
CREATE TABLE staff (
  id uuid PRIMARY KEY,
  business_id uuid REFERENCES businesses ON DELETE CASCADE,
  
  name text NOT NULL,
  role text,  -- "barber", "nail_technician", "receptionist"
  bio text,
  photo_url text,
  
  specialties text[],  -- ["fade", "beard", "design"]
  rating numeric(3,2),
  
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
```

---

## 🎨 UI/UX - Arquitectura de Navegación

### App Structure (Rediseñado)

```
CLIENT APP:
├── Tabs (Bottom Navigation)
│   ├── 🔍 DISCOVER
│   │   ├── /home (mapa + lista)
│   │   ├── /search (búsqueda avanzada)
│   │   └── /category/[id] (filtrado por categoría)
│   │
│   ├── ❤️ FAVORITES
│   │   └── /favorites (negocios guardados)
│   │
│   ├── 📅 BOOKINGS
│   │   ├── /bookings (próximas + pasadas)
│   │   ├── /booking/[id] (detalle + reschedule)
│   │   └── /review (calificar después)
│   │
│   └── 👤 PROFILE
│       ├── /profile
│       ├── /profile/edit
│       └── /settings
│
├── Flow: Booking
│   ├── /[category]/discover (listar negocios)
│   ├── /business/[id] (detalle + servicios)
│   ├── /booking/create (seleccionar servicio)
│   ├── /booking/date-time (agenda real-time)
│   ├── /booking/confirm (resumen)
│   └── /booking/success (confirmación)

BUSINESS APP:
├── Tabs (Bottom Navigation)
│   ├── 📊 DASHBOARD
│   │   ├── /dashboard (hoy, ingresos, ocupación)
│   │   └── /stats (gráficas: ocupación por día/hora)
│   │
│   ├── 📅 AGENDA
│   │   ├── /bookings (citas del día)
│   │   └── /booking/[id] (ver detalles)
│   │
│   ├── 🛠 MANAGEMENT
│   │   ├── /services (gestionar servicios)
│   │   ├── /schedule (horarios semanales)
│   │   ├── /staff (equipo)
│   │   └── /settings (información del negocio)
│   │
│   └── 📈 INSIGHTS
│       ├── /analytics (ocupación, ingresos, clientes top)
│       └── /reviews (calificaciones)
```

---

## 🔍 Búsqueda & Discovery (Profesional)

### Home Screen Rediseñado

```
┌──────────────────────────────────┐
│ 📍 Selecciona tu ubicación        │ ← Geolocalización
├──────────────────────────────────┤
│ 🔍 Busca servicios...            │ ← Búsqueda inteligente
├──────────────────────────────────┤
│ CATEGORÍAS POPULARES              │
│ ✂️ Barberías  💅 Salones  🦷 Dental
│ 🧖 Spas       💄 Makeup   🏥 Clínicas
├──────────────────────────────────┤
│ ⭐ DESTACADOS (Verificados)       │
│ [Barbería Don Julio - 4.8 ⭐]    │
│ [Salón María - 4.9 ⭐]            │
│ [Clínica Sonrisa - 4.7 ⭐]        │
└──────────────────────────────────┘
```

### Búsqueda Avanzada

```
Filtros:
- 📍 Distancia: (< 1km, < 5km, < 10km)
- 💰 Precio: ($-$$$$)
- ⭐ Rating: (4+, 4.5+, 4.8+)
- ⏰ Disponibilidad: (Hoy, Mañana, Esta semana)
- ✓ Verificado: (Mostrar solo verificados)
- 🌟 Popular: (Top-rated)
```

---

## 🎯 Features MVP Pro (Profesional)

### Fase 1: Core Functionality (Weeks 1-2)

✅ **Cliente:**
- Búsqueda por geolocalización
- Filtro por categoría
- Ver servicios + precios + duración
- Reservar con confirmación real-time
- Ver disponibilidad en vivo
- Historial de reservas

✅ **Owner:**
- Dashboard: citas del día
- Gestionar servicios
- Configurar horarios
- Ver calificaciones
- Analytics básicos (ocupación)

### Fase 2: Diferenciación (Weeks 3-4)

✅ **Cliente:**
- Favoritos/guardar negocios
- Calificar y reseñar
- Notificaciones (confirmación, recordatorio)
- Ver reviews de otros clientes

✅ **Owner:**
- Responder reviews
- Analytics avanzado (ingresos, clientes recurrentes)
- Gestionar personal (staff)
- Promociones/descuentos

### Fase 3: Premium (Weeks 5-6)

✅ **Owner Premium:**
- Fotos de trabajos (portfolio)
- Videos de antes/después
- Mensajería con clientes
- Posicionamiento premium (aparece primero)
- API para integración externa

---

## 💰 Monetización (Profesional)

### Modelo de Negocio

```
COMISIÓN POR RESERVA (Principal):
- Barbería: 15-20% por reserva
- Salón: 12-15% por reserva
- Clínica: 10-12% por reserva

PREMIUM TIER (Opcional):
- Owner: $99/mes = Sin comisión
- Owner: $49/mes = Comisión reducida 10%

PUBLICIDAD (Futuro):
- Posicionamiento destacado: $200/mes
- Promoción en home: $500/mes
```

### Proyección

```
100 negocios × 20 reservas/mes × $20 promedio × 15% comisión
= $60,000/mes en comisiones (cuando escales)

En año 1:
- Mes 1-3: $2-5k (testing)
- Mes 4-6: $15-20k (growth)
- Mes 7-12: $40-60k (consolidation)
```

---

## 🌍 Go-to-Market Strategy

### Phase 1: Local Domination (Mes 1-3)

1. **Target City:** Puerto Tejada (o tu ciudad)
2. **Owner Outreach:** 
   - Visita personalmente 50 negocios
   - Demuestra beneficio (4 clientes nuevos = paga la comisión)
   - Incentivo: 30 días gratis

3. **User Acquisition:**
   - Boca a boca (clientes comparten)
   - Flyers en negocios participantes
   - Social media local

**Meta:** 500 clientes + 30 negocios en mes 3

### Phase 2: Expansion (Mes 4-9)

1. **Ciudades cercanas:** Cali, Popayán, etc
2. **Owner Recruitment:** 
   - Team pequeño en cada ciudad
   - Marketing local

3. **App Marketing:**
   - Google App Store optimization (keywords)
   - Ads locales pequeños

**Meta:** 5k clientes + 150 negocios

### Phase 3: Regional (Mes 10+)

1. **Todo Valle del Cauca**
2. **Expansion a otras regiones** (modelo probado)

---

## 🔒 Diferenciación vs Competencia

### Por Qué Barberly Gana

| Aspecto | Barberly | Google | Uber eats |
|---------|----------|--------|-----------|
| **Especialización** | Servicios personales | Genérico | Comida |
| **Reserva Fácil** | 2 taps | 10 acciones | N/A |
| **Confirmación Real-time** | ✅ Sí | ❌ No | N/A |
| **Ver Disponibilidad** | ✅ Sí | ❌ Estimado | N/A |
| **Reseñas Verificadas** | ✅ Solo bookings | Mixtas | Mixtas |
| **Comisión Baja** | 15% | N/A | 30% |
| **Support Owner** | Premium tier | N/A | Sí pero caro |

---

## 📊 Métricas de Éxito (North Star)

### KPIs Críticos

```
CLIENTE:
- MAU (Monthly Active Users): Meta 5k mes 3
- Bookings/usuario/mes: 2-3
- Retention (30 días): 60%+
- NPS: 50+

OWNER:
- Bookings/negocio/mes: 20+
- Revenue/reserva: $15-50 (según tipo)
- Churn: < 5% (si están satisfechos)
- Satisfaction: 4.5+ estrellas

PLATFORM:
- GMV: $500/mes (mes 1) → $60k/mes (año 1)
- Commission: $75/mes (mes 1) → $9k/mes (año 1)
- Utilization Rate: 60%+ (agenda llena)
```

---

## 🛠 Tech Stack (Profesional)

```
Frontend:
- React Native + Expo (iOS + Android)
- TypeScript
- Zustand + React Query
- Mapbox (mapas + geolocalización)

Backend:
- Supabase (auth, DB, real-time)
- PostgreSQL (queries complejas)
- PostGIS (búsqueda geográfica)

DevOps:
- EAS Build (CI/CD)
- Sentry (error tracking)
- Datadog (analytics)

APIs:
- Google Maps (reversa geocoding)
- Stripe (pagos, futuro)
- Twilio (SMS recordatorios)
```

---

## 🚀 Timeline Realista

### MVP Pro (Professional Grade)

```
Week 1-2: Database + Core API
- ✅ Schema rediseñado
- ✅ Auth + RLS
- ✅ APIs CRUD

Week 2-3: Frontend Client + Owner
- ✅ Home/Discovery
- ✅ Booking flow
- ✅ Dashboard owner

Week 3-4: Real-time + Polish
- ✅ Availability real-time
- ✅ Notifications
- ✅ UI/UX refinement

Week 4: Testing + Deployment
- ✅ End-to-end testing
- ✅ Production deployment
- ✅ Owner onboarding

TOTAL: 4 semanas (1 mes)

Comparar con:
- MVP Barbería: 1 semana ✅
- MVP Pro (Multi-negocios): +3 semanas
```

---

## ⚠️ Consideraciones Importantes

### Retos Reales

1. **Fricción en Onboarding Owner**
   - Solución: Visitas personales
   - Costo: Tiempo inicial

2. **Disponibilidad Real-time**
   - Solución: Sync con sistema del negocio (API)
   - Fallback: Usuarios confirman

3. **No-shows (cliente reserva pero no va)**
   - Solución: Notificaciones + cancelación con penalidad

4. **Competencia Fuerte (Google, Otros)**
   - Solución: Mejor UX + mejor data + network effect

---

## 📝 Recomendación Final

### Opción 1: MVP Barbería AHORA (1 semana)
- Lanza puro barbería
- Valida mercado
- Después expande

### Opción 2: MVP Pro AHORA (4 semanas) ⭐ RECOMENDADO
- Lanza multi-negocios profesional
- Posiciónate como plataforma
- Network effect desde día 1
- Mejor para fundraising/inversión

**Mi Recomendación:** **Opción 2**

¿Por qué?
- Esfuerzo adicional: +3 semanas (manageable)
- Impacto: 5x mayor
- Market positioning: Eres plataforma, no app barbería
- Defensibilidad: Difícil copiar dato
- Monetización: Múltiples verticales

---

## ✅ Siguiente Paso

¿Quieres que proceda con MVP Pro?

Si sí, confirma:

1. ✅ Mantener todas las ciudades/categorías?
   - [ ] Sí, múltiples
   - [ ] Solo barbería + salones por ahora

2. ✅ Incluir geolocalización?
   - [ ] Sí, es crítico
   - [ ] No, por dirección solo

3. ✅ Timeline:
   - [ ] 4 semanas (profesional, completo)
   - [ ] 2 semanas (core mini)

**Espero tu confirmación para proceder con implementación profesional.**
