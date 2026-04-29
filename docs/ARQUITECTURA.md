# Arquitectura de Barberly

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Framework móvil | React Native + Expo SDK 54 |
| Navegación | Expo Router 6 (file-based) |
| Lenguaje | TypeScript |
| Estado global | Zustand |
| Backend / BaaS | Supabase (auth + PostgreSQL) |
| Íconos | @expo/vector-icons (Ionicons) |
| Safe area | react-native-safe-area-context |

---

## Estructura de carpetas

```
barberapp/
├── app/                        # Pantallas y layouts (Expo Router)
│   ├── _layout.tsx             # Layout raíz: escucha auth, redirige por rol
│   ├── index.tsx               # Splash: redirige a login / client / barber
│   ├── auth/                   # Flujo de autenticación
│   │   ├── login.tsx
│   │   └── register.tsx        # Selector de rol cliente/barbero
│   ├── client/                 # Tabs del cliente
│   │   ├── _layout.tsx         # Tab bar (Inicio, Mis citas, Perfil)
│   │   ├── home.tsx            # Listado de barberías con búsqueda
│   │   ├── [shopId].tsx        # Detalle + flujo de reserva (local state)
│   │   ├── bookings.tsx        # Mis citas (próximas / pasadas)
│   │   ├── profile.tsx         # Perfil + ajustes
│   │   ├── booking-confirm.tsx # Pantalla de confirmación (usa bookingStore)
│   │   ├── shop.tsx            # Flujo de reserva alternativo (usa bookingStore)
│   │   └── my-bookings.tsx     # Vista alternativa de citas (oculta)
│   └── barber/                 # Stack del barbero
│       ├── dashboard.tsx       # Agenda del día + estadísticas
│       ├── services.tsx        # Gestión de servicios
│       └── schedule.tsx        # Gestión de horarios semanales
├── components/
│   ├── ShopCard.tsx            # Tarjeta de barbería
│   ├── TimeSlotPicker.tsx      # Selector de hora disponible
│   └── ui/
│       ├── Button.tsx          # Botón (4 variantes)
│       ├── Badge.tsx           # Etiqueta de estado
│       ├── Card.tsx            # Contenedor con sombra
│       └── Input.tsx           # Input con ícono y validación
├── stores/
│   ├── authStore.ts            # Sesión y usuario activo
│   └── bookingStore.ts         # Draft de reserva en progreso
├── lib/
│   ├── supabase.ts             # Cliente Supabase
│   ├── availability.ts         # Lógica de slots disponibles
│   └── mockData.ts             # Datos de prueba
├── constants/
│   ├── colors.ts               # Paleta de colores
│   └── index.ts                # Labels, días, meses en español
└── types/
    └── index.ts                # Tipos TypeScript compartidos
```

---

## Modelos de datos (Supabase)

### `users`
| Campo | Tipo | Descripción |
|---|---|---|
| id | uuid (PK) | Igual que auth.users.id |
| name | text | Nombre del usuario |
| email | text | Email |
| role | text | `'client'` o `'barber'` |
| phone | text? | Teléfono opcional |
| avatar_url | text? | Foto de perfil |
| created_at | timestamptz | Fecha de creación |

### `barbershops`
| Campo | Tipo | Descripción |
|---|---|---|
| id | uuid (PK) | ID de la barbería |
| owner_id | uuid (FK → users) | Barbero propietario |
| name | text | Nombre |
| address | text | Dirección |
| description | text? | Descripción |
| phone | text? | Teléfono |
| image_url | text? | Foto de portada |
| rating | numeric? | Calificación promedio |
| is_active | bool | Visible en listado |
| created_at | timestamptz | |

### `services`
| Campo | Tipo | Descripción |
|---|---|---|
| id | uuid (PK) | |
| barbershop_id | uuid (FK → barbershops) | |
| name | text | Ej: "Corte clásico" |
| duration_minutes | int | Duración del servicio |
| price | int | Precio en COP |
| is_active | bool | Visible para clientes |

### `availability`
| Campo | Tipo | Descripción |
|---|---|---|
| id | uuid (PK) | |
| barbershop_id | uuid (FK → barbershops) | |
| day_of_week | int | 0=Dom … 6=Sáb |
| start_time | text | Ej: `"09:00"` |
| end_time | text | Ej: `"19:00"` |
| is_active | bool | Día laborable o no |

### `bookings`
| Campo | Tipo | Descripción |
|---|---|---|
| id | uuid (PK) | |
| user_id | uuid (FK → users) | Cliente |
| service_id | uuid (FK → services) | |
| barbershop_id | uuid (FK → barbershops) | |
| booking_date | date | Fecha de la cita |
| start_time | text | Hora de inicio |
| end_time | text | Hora de fin (calculada) |
| status | text | `pending`, `confirmed`, `cancelled` |
| notes | text? | Notas del cliente |
| created_at | timestamptz | |

---

## Flujos principales

### 1. Autenticación y enrutamiento
```
app/index.tsx
  └── authStore.loading = true → muestra spinner
  └── session = null → /auth/login
  └── user.role = 'barber' → /barber/dashboard
  └── user.role = 'client' → /client/home

app/_layout.tsx
  └── supabase.auth.getSession() → setSession() + fetchUser()
  └── onAuthStateChange() → actualiza authStore en tiempo real
```

### 2. Registro de usuario
```
register.tsx
  └── supabase.auth.signUp({ email, password, options: { data: { name, role } } })
  └── trigger handle_new_user en Supabase → inserta en public.users automáticamente
  └── Se envía email de confirmación
  └── onAuthStateChange dispara → fetchUser() → redirige por rol
```

### 3. Reserva de cita — Flujo A (activo en tabs)
```
client/home.tsx
  └── ShopCard.onPress → router.push('/client/[shopId]')

client/[shopId].tsx
  └── Estado local: selectedService, selectedDate, selectedTime
  └── getAvailableSlots(shopId, date, duration) → TimeSlotPicker
  └── handleBooking() → supabase.from('bookings').insert()
  └── Éxito → Alert con opciones (ver citas / volver)
```

### 4. Reserva de cita — Flujo B (oculto, sin usar en navegación actual)
```
client/shop.tsx (usa bookingStore)
  └── setDraftService → setDraftDate → setDraftTime
  └── router.push('/client/booking-confirm')

client/booking-confirm.tsx (usa bookingStore)
  └── Muestra resumen completo
  └── handleConfirm() → supabase.from('bookings').insert()
  └── setConfirmed(true) → pantalla de éxito
```

### 5. Dashboard del barbero
```
barber/dashboard.tsx
  └── fetchData() al hacer focus en pantalla
  └── Obtiene shop por owner_id → obtiene bookings de hoy
  └── handleAction('confirmed' | 'cancelled') → UPDATE booking
  └── Recarga automática
```

### 6. Gestión de disponibilidad
```
barber/schedule.tsx
  └── Carga 7 días (0-6) con upsert de availability
  └── toggleDay → is_active = !is_active
  └── handleSave → upsert con onConflict: 'barbershop_id,day_of_week'
```

---

## Lógica de slots disponibles (`lib/availability.ts`)

```
getAvailableSlots(barbershopId, date, durationMinutes)
  1. Consulta availability donde day_of_week = date.getDay() y is_active = true
  2. Si no hay resultado → retorna []
  3. Consulta bookings del mismo día (status != 'cancelled')
  4. generateTimeSlots(start, end, duration) → array de "HH:MM"
  5. Para cada slot: isSlotOccupied() compara minutos de inicio/fin
  6. Retorna TimeSlot[] con { time, available }
```

Detección de colisiones: `slotStart < bEnd && slotEnd > bStart` (superposición de intervalos).

---

## Estado global

### `authStore` (Zustand)
```ts
{ user, session, loading }
setSession(session)   // llamado por onAuthStateChange
fetchUser(userId)     // lee public.users por id
signOut()             // limpia sesión y estado
```

### `bookingStore` (Zustand)
```ts
{ draft: { barbershop, service, date, startTime } }
setDraftBarbershop()  // resetea service, date, startTime
setDraftService()     // resetea date, startTime
setDraftDate()        // resetea startTime
setDraftTime()
clearDraft()
```

El store cascadea limpieza: cambiar el servicio borra la fecha y hora automáticamente.

---

## Mock data (desarrollo)

Activado como fallback cuando Supabase retorna vacío:

| Screen | Mock usado |
|---|---|
| `client/home.tsx` | `MOCK_SHOPS` (4 barberías) |
| `client/[shopId].tsx` | `MOCK_SHOPS` + `MOCK_SERVICES` + slots generados desde `MOCK_AVAILABILITY` |
| `client/bookings.tsx` | `MOCK_BOOKINGS` (4 citas con estados variados) |
| `barber/dashboard.tsx` | `MOCK_BARBER_BOOKINGS` (4 citas de hoy) |
