# Diagnóstico de la app — Barberly

Fecha: 2026-04-27  
Estado: en desarrollo activo, mock data activo

---

## Resumen ejecutivo

La app tiene una base sólida: autenticación por rol, flujo de reservas funcional, y gestión de horarios/servicios para el barbero. Sin embargo, existen **dos flujos de reserva paralelos** (solo uno visible), **falta el onboarding del barbero**, varias pantallas tienen funcionalidades incompletas, y hay deuda técnica menor de UX.

---

## Problemas encontrados

### 🔴 Crítico — afecta la funcionalidad principal

---

#### 1. Dos flujos de reserva en paralelo — solo uno está activo

**Archivos:** `client/[shopId].tsx` vs `client/shop.tsx` + `client/booking-confirm.tsx`

Existen dos implementaciones completas del flujo de reserva:

**Flujo A** (`[shopId].tsx`) — el que usan los tabs actualmente:
- Estado local (`useState`) para servicio, fecha y hora
- Al confirmar: inserta en DB y muestra un `Alert`
- No usa `bookingStore`
- No hay pantalla de resumen/confirmación dedicada

**Flujo B** (`shop.tsx` + `booking-confirm.tsx`) — oculto, sin usar:
- Usa `bookingStore` con cascada de limpieza
- Navega a `booking-confirm.tsx` con resumen detallado
- Pantalla de éxito con animación verde
- Manejo de errores más específico (código `23P01`)

**Impacto:** El Flujo B está mejor diseñado (resumen, estado global, pantalla de éxito) pero es completamente inaccesible. El Flujo A es funcional pero muestra un `Alert` nativo en lugar de una pantalla de confirmación.

**Solución:** Unificar en el Flujo B. Ver [PLAN.md](./PLAN.md) — Tarea 1.

---

#### 2. No existe flujo de onboarding para el barbero

**Archivos:** `barber/dashboard.tsx`, `barber/services.tsx`, `barber/schedule.tsx`

Cuando un usuario se registra con `role: 'barber'`, no existe ninguna pantalla para crear su barbería. Las tres pantallas del barbero consultan `barbershops` por `owner_id`. Si no existe el registro, ocurre lo siguiente:

- `dashboard.tsx`: muestra mock data (oculta el problema)
- `services.tsx`: `setBarbershopId(null)` → `setLoading(false)` → lista vacía sin CTA para crear
- `schedule.tsx`: `setLoading(false)` → lista vacía, el botón guardar no hace nada

**Impacto:** Un barbero real no puede operar la app. No puede crear su barbería, agregar servicios ni configurar horarios.

**Solución:** Agregar pantalla `barber/setup.tsx` para crear la barbería. Ver [PLAN.md](./PLAN.md) — Tarea 2.

---

### 🟡 Importante — experiencia degradada

---

#### 3. `bookingStore` existe pero no lo usa el flujo activo

**Archivos:** `stores/bookingStore.ts`, `client/[shopId].tsx`

El store tiene lógica bien pensada (cascada de limpieza al cambiar servicio/fecha). Pero `[shopId].tsx` ignora el store completamente y usa `useState` local. Resultado: si el usuario navega hacia atrás y regresa, pierde su selección.

---

#### 4. Estadísticas del perfil de cliente son decorativas

**Archivo:** `client/profile.tsx`

La pantalla muestra cards de estadísticas (total de citas, barberías visitadas, próxima cita) pero no consulta la base de datos — los valores son hardcodeados o siempre en cero.

---

#### 5. Indicador "Abierto" en ShopCard es siempre verdadero

**Archivo:** `components/ShopCard.tsx`

El badge verde "Abierto" se muestra para todas las barberías sin importar:
- Si la barbería tiene horarios configurados
- Si el día/hora actual está dentro del horario de atención

No hay consulta a `availability` en el listado de barberías.

---

#### 6. El barbero no puede editar ni eliminar servicios

**Archivo:** `barber/services.tsx`

Solo existe la opción de agregar un servicio nuevo y activar/desactivar con toggle. No hay:
- Edición del nombre, precio o duración
- Eliminación de un servicio
- Confirmación antes de desactivar

---

#### 7. El barbero no puede editar los horarios de apertura y cierre

**Archivo:** `barber/schedule.tsx`

Los días se pueden activar/desactivar, pero el horario de apertura (`09:00`) y cierre (`18:00`) están fijados por defecto y no se pueden cambiar desde la UI. Los hour pills son solo visualización.

---

#### 8. El número en el círculo del día en Schedule muestra el índice

**Archivo:** `barber/schedule.tsx`, línea 81

```tsx
<Text>{i}</Text>  // muestra 0,1,2,3,4,5,6 — confuso para el usuario
```

Debería mostrar la inicial del día (`L`, `M`, `X`…) o nada.

---

### 🟢 Menor — detalles de pulido

---

#### 9. Botón "Estadísticas" en dashboard del barbero no tiene acción

**Archivo:** `barber/dashboard.tsx`, línea 119

```tsx
<TouchableOpacity style={styles.qaBtn} activeOpacity={0.75}>
  {/* Sin onPress */}
</TouchableOpacity>
```

Toca el botón y no pasa nada. Debería navegar a una pantalla o mostrar un `Alert` indicando que está en construcción.

---

#### 10. Botón de notificaciones en home del cliente es decorativo

**Archivo:** `client/home.tsx`

El ícono de campana se renderiza pero `onPress` no está definido. No hay sistema de notificaciones implementado.

---

#### 11. "Olvidé mi contraseña" no está implementado

**Archivo:** `auth/login.tsx`

El link existe visualmente pero no ejecuta ninguna acción. Supabase tiene el método `resetPasswordForEmail()` disponible.

---

#### 12. Configuración del perfil no está implementada

**Archivo:** `client/profile.tsx`

Todas las filas de configuración (Editar perfil, Notificaciones, Privacidad, Ayuda, Acerca de) ejecutan `onPress` sin implementar. Cuando el usuario toca, no pasa nada.

---

#### 13. No hay actualización en tiempo real en el dashboard del barbero

**Archivo:** `barber/dashboard.tsx`

Las citas solo se recargan cuando el barbero hace focus en la pantalla (`useFocusEffect`). Si un cliente reserva mientras el barbero tiene la pantalla abierta, no se verá hasta que navegue y regrese.

Supabase ofrece `supabase.channel().on('postgres_changes', ...)` para tiempo real.

---

#### 14. `my-bookings.tsx` es código duplicado

**Archivo:** `client/my-bookings.tsx`

Es una versión anterior de `bookings.tsx`, registrada como ruta oculta en el tab layout. Tiene lógica similar pero diseño anterior. No está referenciada en ningún flujo activo. Candidata a eliminación.

---

#### 15. Error code `23P01` incorrecto para reservas duplicadas

**Archivo:** `client/booking-confirm.tsx`, línea 43

```tsx
error.code === '23P01'  // exclusion violation de PostgreSQL
```

El código `23P01` es para "exclusion constraint violation". Para que funcione, la tabla `bookings` debe tener una restricción `EXCLUDE` basada en tiempo (no una unique constraint). Si la restricción es `UNIQUE`, el código sería `23505`. Debe verificarse qué constraint está definida en Supabase.

---

## Resumen de severidades

| # | Problema | Severidad | Esfuerzo |
|---|---|---|---|
| 1 | Dos flujos de reserva paralelos | 🔴 Crítico | Medio |
| 2 | Sin onboarding para barbero | 🔴 Crítico | Alto |
| 3 | bookingStore sin usar en flujo activo | 🟡 Importante | Bajo |
| 4 | Stats de perfil hardcodeadas | 🟡 Importante | Bajo |
| 5 | Badge "Abierto" siempre verdadero | 🟡 Importante | Medio |
| 6 | Sin editar/eliminar servicios | 🟡 Importante | Medio |
| 7 | Sin editar horarios de apertura | 🟡 Importante | Medio |
| 8 | Índice numérico en Schedule | 🟢 Menor | Mínimo |
| 9 | Botón Estadísticas sin acción | 🟢 Menor | Mínimo |
| 10 | Notificaciones decorativas | 🟢 Menor | Bajo |
| 11 | Recuperar contraseña sin implementar | 🟢 Menor | Bajo |
| 12 | Settings de perfil sin implementar | 🟢 Menor | Alto |
| 13 | Sin tiempo real en dashboard | 🟢 Menor | Bajo |
| 14 | my-bookings.tsx duplicado | 🟢 Menor | Mínimo |
| 15 | Código de error 23P01 incorrecto | 🟢 Menor | Mínimo |
