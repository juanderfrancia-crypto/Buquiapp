# Plan de implementación — Barberly

Fecha: 2026-04-27  
Basado en: [DIAGNOSTICO.md](./DIAGNOSTICO.md)

Las tareas están ordenadas por impacto. Las críticas desbloquean el uso real de la app.

---

## Tarea 1 — Unificar el flujo de reserva (Crítico)

**Problema:** Existen dos flujos paralelos. El activo (`[shopId].tsx`) usa un Alert en lugar de una pantalla de confirmación. El bien diseñado (`shop.tsx` + `booking-confirm.tsx`) no está conectado a la navegación.

**Solución:** Conectar `[shopId].tsx` al `bookingStore` y navegar a `booking-confirm.tsx` al confirmar.

### Cambios necesarios

**`client/[shopId].tsx`**
1. Importar `useBookingStore`
2. Al seleccionar servicio: `setDraftService(svc)` + actualizar estado local visual
3. Al seleccionar fecha: `setDraftDate(date)`
4. Al seleccionar hora: `setDraftTime(time)`
5. En `handleBooking()`: reemplazar el insert + Alert por `router.push('/client/booking-confirm')`
6. Eliminar la función `handleBooking` actual (el insert lo hará `booking-confirm.tsx`)

**`client/booking-confirm.tsx`**  
Ya está implementado y funcional. Solo necesita ser alcanzable.

**`client/shop.tsx`**  
Ya no es necesario — puede eliminarse o mantenerse como archivo legado oculto.

**`client/_layout.tsx`**  
Verificar que `booking-confirm` está registrado como pantalla oculta (ya está en la lista `href: null`).

### Resultado esperado
```
home → [shopId] (selecciona servicio/fecha/hora) → booking-confirm (resumen + confirmar) → pantalla éxito
```

---

## Tarea 2 — Onboarding del barbero (Crítico)

**Problema:** Un barbero registrado no puede crear su barbería. Sin ella, todas las funciones del barbero fallan silenciosamente.

**Solución:** Agregar una pantalla de setup y detectar si el barbero ya tiene barbería.

### Archivos nuevos

**`barber/setup.tsx`** — Pantalla de creación de barbería
```
Campos:
- Nombre de la barbería (requerido)
- Dirección (requerido)  
- Teléfono (opcional)
- Descripción (opcional)

Acción: supabase.from('barbershops').insert({ owner_id: user.id, ...fields, is_active: true })
Después: router.replace('/barber/dashboard')
```

### Cambios en pantallas existentes

**`barber/dashboard.tsx`**  
Si `!shop` después de consultar Supabase:
```tsx
if (!shop) {
  router.replace('/barber/setup');
  return;
}
```
Actualmente carga mock data en este caso, lo que oculta el problema. Quitar ese fallback o dejarlo solo cuando hay shop pero no hay citas.

**`barber/services.tsx`** y **`barber/schedule.tsx`**  
Mismo patrón: si no hay shop, redirigir a setup.

### Flujo completo del barbero
```
Registro (role: barber) → onAuthStateChange → /barber/dashboard
  ├── shop existe → muestra agenda
  └── shop no existe → /barber/setup → llena formulario → /barber/dashboard
```

---

## Tarea 3 — Editar y eliminar servicios (Importante)

**Archivo:** `barber/services.tsx`

### Cambios necesarios

1. Agregar botón de edición en cada tarjeta de servicio (ícono de lápiz)
2. Reutilizar el modal actual pero en modo edición (pre-llenar campos)
3. Agregar estado `editingService: Service | null`
4. En `handleSave`: si `editingService` existe → `UPDATE`, si no → `INSERT`
5. Agregar swipe-to-delete o botón de eliminar con `Alert.alert` de confirmación
   - Acción: `UPDATE is_active = false` (soft delete) o `DELETE` real

```tsx
// Lógica de guardado unificada
const handleSave = async () => {
  if (editingService) {
    await supabase.from('services').update({ name, duration_minutes, price }).eq('id', editingService.id);
  } else {
    await supabase.from('services').insert({ barbershop_id, name, duration_minutes, price, is_active: true });
  }
};
```

---

## Tarea 4 — Editar horarios de apertura y cierre (Importante)

**Archivo:** `barber/schedule.tsx`

### Cambios necesarios

Los hour pills (`hourPill`) deben ser tocables para abrir un selector de hora.

**Opción A — Selector simple (ruedas):**  
Instalar `@react-native-community/datetimepicker` y mostrar un TimePicker al tocar la hora.

**Opción B — Modal manual (sin dependencia extra):**  
Crear un modal con una lista de horas en intervalos de 30 minutos (06:00–22:00) en un ScrollView seleccionable.

La Opción B es más rápida y no agrega dependencias.

```tsx
// Estado adicional
const [editingDay, setEditingDay] = useState<number | null>(null);
const [editingField, setEditingField] = useState<'start' | 'end' | null>(null);

// Al tocar hour pill:
onPress={() => { setEditingDay(i); setEditingField('start'); }}
```

---

## Tarea 5 — Estadísticas reales en el perfil del cliente (Importante)

**Archivo:** `client/profile.tsx`

### Consultas necesarias

```tsx
const fetchStats = async () => {
  const { count: totalBookings } = await supabase
    .from('bookings').select('*', { count: 'exact', head: true })
    .eq('user_id', user.id);

  const { data: nextBooking } = await supabase
    .from('bookings').select('*, barbershop:barbershops(name)')
    .eq('user_id', user.id).eq('status', 'confirmed')
    .gte('booking_date', today).order('booking_date').limit(1).single();

  const { data: shops } = await supabase
    .from('bookings').select('barbershop_id')
    .eq('user_id', user.id).neq('status', 'cancelled');
  const uniqueShops = new Set(shops?.map(b => b.barbershop_id)).size;
};
```

---

## Tarea 6 — Tiempo real en el dashboard del barbero (Menor)

**Archivo:** `barber/dashboard.tsx`

### Implementación

```tsx
useEffect(() => {
  if (!barbershopId) return;
  const channel = supabase
    .channel('bookings-today')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'bookings',
      filter: `barbershop_id=eq.${barbershopId}`,
    }, () => fetchData())
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}, [barbershopId]);
```

---

## Tarea 7 — Recuperar contraseña (Menor)

**Archivo:** `auth/login.tsx`

```tsx
const handleForgotPassword = async () => {
  if (!email) { Alert.alert('Ingresa tu email primero'); return; }
  await supabase.auth.resetPasswordForEmail(email);
  Alert.alert('Revisa tu correo', 'Te enviamos un link para restablecer tu contraseña.');
};
```

---

## Tarea 8 — Correcciones rápidas (Menor)

Todas son cambios de una o dos líneas:

| # | Archivo | Cambio |
|---|---|---|
| 8a | `barber/schedule.tsx:81` | `{i}` → `{DAYS_ES[i][0]}` (inicial del día) |
| 8b | `barber/dashboard.tsx:119` | Agregar `onPress={() => Alert.alert('Próximamente', 'Estadísticas en construcción')}` |
| 8c | `client/booking-confirm.tsx:43` | Cambiar `'23P01'` por `'23505'` o eliminar el check específico |
| 8d | `client/my-bookings.tsx` | Eliminar el archivo (es código duplicado sin uso) |

---

## Orden de ejecución sugerido

```
Semana 1 (base funcional):
  ✦ Tarea 2 — Onboarding del barbero
  ✦ Tarea 1 — Unificar flujo de reserva

Semana 2 (funcionalidades completas):
  ✦ Tarea 3 — Editar/eliminar servicios
  ✦ Tarea 4 — Editar horarios
  ✦ Tarea 8 — Correcciones rápidas

Semana 3 (calidad y datos reales):
  ✦ Tarea 5 — Stats reales en perfil
  ✦ Tarea 6 — Tiempo real dashboard
  ✦ Tarea 7 — Recuperar contraseña
```

---

## Lo que funciona bien y no debe tocarse

- Lógica de detección de colisiones en `lib/availability.ts` — correcta y eficiente
- Estructura de navegación por rol (index → barber/client) — limpia
- Cascada de limpieza en `bookingStore` — bien diseñada
- Componentes UI (`Button`, `Badge`, `Input`, `Card`) — reutilizables y consistentes
- Paleta de colores y tipografía — lista para producción
- `onAuthStateChange` en el layout raíz — maneja correctamente sesiones persistentes
