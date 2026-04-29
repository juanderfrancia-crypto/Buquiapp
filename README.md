# BarberApp 💈

App móvil multiplataforma para reservas en peluquerías y barberías.
Construida con **Expo (React Native)** + **Supabase**.

---

## 🚀 Configuración inicial

### 1. Instalar dependencias
```bash
npm install
```

### 2. Configurar Supabase

1. Crea un proyecto en [supabase.com](https://supabase.com)
2. Ve a **SQL Editor** y pega el contenido de `supabase_schema.sql`
3. Copia el archivo de variables de entorno:
```bash
cp .env.example .env
```
4. Rellena `.env` con tus credenciales de Supabase:
```
EXPO_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
```
Encuéntralas en: **Supabase Dashboard → Settings → API**

### 3. Correr la app
```bash
npm start
```
Luego escanea el QR con la app **Expo Go** en tu celular.

---

## 📁 Estructura del proyecto

```
barberapp/
├── app/
│   ├── _layout.tsx          # Navegación raíz + auth listener
│   ├── index.tsx            # Redirección según rol
│   ├── auth/
│   │   ├── login.tsx        # Pantalla de login
│   │   └── register.tsx     # Registro (cliente o barbero)
│   ├── client/
│   │   ├── index.tsx        # Listado de barberías
│   │   ├── shop.tsx         # Detalle + selección de turno
│   │   ├── booking-confirm.tsx  # Confirmación de reserva
│   │   └── my-bookings.tsx  # Mis citas
│   └── barber/
│       ├── dashboard.tsx    # Agenda del día
│       ├── services.tsx     # CRUD de servicios
│       └── schedule.tsx     # Horarios laborales
├── components/
│   ├── ShopCard.tsx         # Tarjeta de barbería
│   ├── TimeSlotPicker.tsx   # Selector de horario
│   └── ui/                  # Button, Card, Badge, Input
├── lib/
│   ├── supabase.ts          # Cliente Supabase
│   └── availability.ts      # Lógica de slots disponibles
├── stores/
│   ├── authStore.ts         # Estado de sesión (Zustand)
│   └── bookingStore.ts      # Draft de reserva en progreso
├── types/index.ts            # Tipos TypeScript
├── constants/               # Colores, días, meses, labels
└── supabase_schema.sql      # Schema completo de la BD
```

---

## 🔄 Flujos principales

### Cliente
1. Login / Registro como `client`
2. Ver listado de barberías → buscar por nombre
3. Seleccionar barbería → elegir servicio → elegir día → elegir hora
4. Confirmar reserva → guardada en Supabase como `pending`
5. Ver y cancelar mis citas

### Barbero
1. Registro como `barber`
2. Dashboard: ver agenda del día, confirmar/rechazar turnos
3. Servicios: crear/activar/desactivar servicios
4. Horarios: definir días y horas de trabajo

---

## 🗄️ Base de datos

| Tabla | Descripción |
|-------|-------------|
| `users` | Clientes y barberos |
| `barbershops` | Negocios de barbería |
| `services` | Servicios con precio y duración |
| `availability` | Horario laboral por día de la semana |
| `bookings` | Reservas con constraint de no-solapamiento |

---

## ⚡ Próximos pasos (post-MVP)

- [ ] Time picker visual para horarios del barbero
- [ ] Notificaciones push (Expo Notifications)
- [ ] Integración WhatsApp API (Twilio / Meta)
- [ ] Crear perfil de barbería desde la app
- [ ] Pagos online (MercadoPago / Stripe)
- [ ] Sistema de reseñas
- [ ] Realtime con Supabase Subscriptions

---

## 🛠️ Stack

- **Frontend**: Expo SDK 51, React Native, Expo Router v3
- **Estado**: Zustand
- **Backend**: Supabase (PostgreSQL + Auth + RLS)
- **Lenguaje**: TypeScript
