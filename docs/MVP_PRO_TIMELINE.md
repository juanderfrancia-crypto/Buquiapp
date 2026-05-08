# 🚀 MVP PRO - Plan de Implementación (4 Semanas)

## FASE ACTUAL: REFACTOR VISUAL (ESTA SEMANA)
**Objetivo:** Convertir MVP Barbería → Plataforma Profesional Multi-Negocio

### ✅ Completado
- Paleta de colores profesional (azul + oro)
- Componente GradientView reutilizable
- Types actualizado con BusinessType
- Home.tsx con filtros multi-negocio

### 🔄 PENDIENTE ESTA SEMANA (2 DÍAS)

#### 1. Completar Aplicación Visual Gradientes
```
Archivos a modificar:
- app/client/home.tsx → Envolver header con GradientView
- app/barber/dashboard.tsx → Header gradient
- app/client/booking-confirm.tsx → Header gradient
- app/client/profile.tsx → Header gradient
- app/barber/schedule.tsx → Header gradient

Pattern:
<GradientView style={styles.gradientHeader}>
  <SafeAreaView ...>
    {/* Content */}
  </SafeAreaView>
</GradientView>
```

#### 2. Database Refactor (CRÍTICO)
```sql
-- Renombrar: barbershops → businesses
-- Agregar: business_type (barbershop|beauty_salon|spa|other)
-- Agregar: latitude/longitude (para geolocalización)
-- Agregar: verification_status (unverified|verified|premium)

Scripts:
1. ALTER TABLE barbershops RENAME TO businesses;
2. ADD business_type, latitude, longitude, verification_status;
3. UPDATE fixtures de negocios
```

#### 3. Auth Refactor
```
app/auth/register.tsx:
- Agregar selector de business_type al registrarse
- Guardar en auth.user.meta_data

barber/setup.tsx:
- Mostrar "¿Qué tipo de negocio?"
- Radio buttons: Barbería, Salón, Spa, Otro
```

---

## FASE 2: FEATURES CORE (SEMANA 2)

### Discovery & Search
```
app/client/home.tsx (ya casi listo):
- ✅ Filtros por categoría
- ✅ Búsqueda por nombre
- 🔄 Búsqueda por geolocalización (necesita PostGIS)

app/client/[businessId].tsx (RENOMBRAR):
- De [shopId] → [businessId]
- Mostrar tipo de negocio
- Mostrar servicios (igual funciona)
```

### Booking Real-Time
```
app/client/booking/create.tsx (NUEVO):
- Seleccionar servicio de cualquier tipo
- Ver disponibilidad real-time
- Confirmar reserva

app/client/booking/confirm.tsx:
- Resumen profesional
- Información del negocio
```

### Dashboard Owner Multi-Negocio
```
app/business/dashboard.tsx (RENOMBRAR):
- De /barber → /business
- Funciona para todos los tipos
- Muestra tipo de negocio
- Stats ocupación
```

---

## FASE 3: ANALYTICS & PREMIUM (SEMANA 3-4)

### Analytics para Owner
```
app/business/analytics.tsx (NUEVO):
- Gráficas: ocupación por día/hora
- Ingresos estimados
- Clientes recurrentes
- Reviews/calificaciones

Datos:
- Utilization rate (% agenda llena)
- Peak hours (horas más concurridas)
- Average revenue per booking
```

### Reviews & Ratings
```
app/client/review/[bookingId].tsx (NUEVO):
- Post-booking review
- Rating 1-5 estrellas
- Texto + fotos
- Conectar a reviews table

app/business/reviews.tsx:
- Ver todas las reviews
- Responder reviews
- Analytics de ratings
```

### Premium Tier
```
Enable/Disable en business settings:
- Sin comisión (vs 15% default)
- Posicionamiento destacado
- Fotos de portfolio
```

---

## 📊 DATABASE: Cambios Necesarios (CRÍTICOS)

### Current (MVP Barbería)
```
barbershops
├─ id, name, address
├─ owner_id, is_active
└─ rating

services
├─ barbershop_id
├─ name, price, duration
└─ is_active

availability
├─ barbershop_id, day_of_week
├─ start_time, end_time
└─ is_active

bookings
├─ user_id, barbershop_id, service_id
├─ booking_date, start_time, status
└─ created_at
```

### Target (MVP Pro)
```
categories (NEW)
├─ id, name, icon, color
└─ description

businesses (RENAMED from barbershops)
├─ category_id (NUEVO)
├─ business_type (NUEVO) ← barbershop|beauty_salon|spa|other
├─ latitude, longitude (NUEVO) ← geolocalización
├─ verification_status (NUEVO) ← unverified|verified|premium
├─ established_year, staff_count (NUEVO)
└─ [existing fields]

services
├─ [same, pero references businesses ahora]
├─ category (NUEVO) ← haircut|manicure|facial|etc
└─ [variants jsonb FUTURO]

availability
├─ [same]

bookings
├─ assigned_staff_id (NUEVO) ← para futuro
├─ cancelled_at, cancellation_reason (NUEVO)
├─ status workflow mejorado (NUEVO)
└─ [existing]

reviews (NEW TABLE)
├─ booking_id, business_id, user_id
├─ rating (1-5), comment
└─ created_at

staff (NEW TABLE FUTURO)
├─ business_id, name, role
├─ specialties[], rating
└─ created_at
```

---

## 🎯 PRÓXIMOS PASOS (ESTA SEMANA)

### HOY-MAÑANA (2 horas)
1. [ ] Completar gradientes visuales en 5 screens
2. [ ] Verificar que home.tsx + dashboard.tsx lucen profesionales

### MAÑANA-PASADO (3 horas)
1. [ ] SQL migration: renombrar barbershops → businesses
2. [ ] SQL: agregar business_type, lat/long, verification_status
3. [ ] Actualizar todas las queries (de barbershops → businesses)

### JUEVES (2 horas)
1. [ ] Auth register: agregar selector business_type
2. [ ] Barber setup → Business setup (mostrar tipo)
3. [ ] Test: registrar como barbería, salón, spa

### VIERNES (1 hora)
1. [ ] Deploy v1.1
2. [ ] Verificar en producción

---

## 📋 CHECKLIST VISUAL (ESTA SEMANA)

- [ ] home.tsx: Header gradient + filtros visibles
- [ ] dashboard.tsx: Header gradient + info del día
- [ ] booking-confirm.tsx: Resumen con gradiente
- [ ] profile.tsx: Perfil con tema
- [ ] schedule.tsx: Horarios con tema
- [ ] Setup: Selector de tipo negocio visible
- [ ] All screens: Paleta de colores consistente

---

## 🔄 CAMBIOS NO-BREAKING (Importante)

Todos estos cambios se pueden hacer SIN romper MVP actual:

1. **Gradientes visuales:** Pure UI, sin lógica
2. **BusinessType en auth:** Meta data, no afecta auth
3. **Renamed routes:** Solo URLs, lógica igual
4. **DB migration:** Agregar columnas (nunca eliminar)

**Riesgo:** BAJO  
**Testing necesario:** Verificar login + booking flow

---

## 🚀 DESPUÉS (Semana 2+)

Después de esta semana:
- Tienes: MVP Pro visual + multi-negocio
- Ready para: Agregar geolocalización
- Ready para: Analytics
- Ready para: Premium tier
- Ready para: Go-to-market

---

## ⏱ TIMELINE REALISTA

```
ESTA SEMANA (Semana 1):
├─ Lunes-Martes: Gradientes visuales (4h)
├─ Miércoles: DB migration (3h)
├─ Jueves: Auth + Setup (2h)
└─ Viernes: Testing + Deploy (1h)
   TOTAL: 10 horas

SEMANA 2 (Feature Development):
├─ Lunes-Martes: Booking flow (8h)
├─ Miércoles: Dashboard mejorado (6h)
├─ Jueves: Real-time updates (6h)
└─ Viernes: Polish + deploy (4h)
   TOTAL: 24 horas

SEMANA 3 (Analytics + Reviews):
├─ Lunes-Miércoles: Analytics (10h)
├─ Miércoles-Jueves: Reviews system (8h)
└─ Viernes: Testing (4h)
   TOTAL: 22 horas

SEMANA 4 (Polish + Launch):
├─ Testing end-to-end (8h)
├─ Bug fixes (8h)
├─ Owner onboarding materials (4h)
└─ Deploy MVP Pro (2h)
   TOTAL: 22 horas

GRAND TOTAL: 78 horas ≈ 2 sprints full-time
```

---

## ✅ DEFINICIÓN DE DONE (MVP Pro v1)

**Cliente:**
- [ ] Buscar negocios por categoría (barbería, salón, spa, etc)
- [ ] Ver precios + disponibilidad real-time
- [ ] Reservar en 2 taps
- [ ] Ver historial de reservas
- [ ] Calificar después de ir

**Owner:**
- [ ] Crear negocio (cualquier tipo)
- [ ] Agregar servicios
- [ ] Configurar horarios
- [ ] Ver citas del día
- [ ] Ver calificaciones
- [ ] Ver occupancy rate

**Platform:**
- [ ] Multi-negocio funcionando
- [ ] Geolocalización (básica)
- [ ] Real-time disponibilidad
- [ ] Reviews funcionales
- [ ] Analytics básicos

---

## 📞 DECISIONES QUE NECESITO DE TI

1. **¿Confirmamos esta estrategia?**
   - [ ] Sí, procedo con MVP Pro esta semana
   - [ ] Espero feedback adicional

2. **¿Geolocalización es crítica para lanzar?**
   - [ ] Sí, (requiere +1 semana)
   - [ ] No, solo búsqueda por nombre está bien para MVP

3. **¿Lanzar con Reviews desde día 1?**
   - [ ] Sí, es parte del producto
   - [ ] Mejor para v1.2

**Esperando tu confirmación para proceder con implementación esta semana.**
