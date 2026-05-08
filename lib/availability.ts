import { supabase } from './supabase';
import { TimeSlot } from '@/types';

/** Devuelve 'YYYY-MM-DD' usando la fecha LOCAL del dispositivo, no UTC. */
export function toLocalDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Genera slots de tiempo entre start y end cada `durationMinutes`
 */
function generateTimeSlots(
  startTime: string,
  endTime: string,
  durationMinutes: number
): string[] {
  const slots: string[] = [];
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);

  let current = startH * 60 + startM;
  const end = endH * 60 + endM;

  while (current + durationMinutes <= end) {
    const h = Math.floor(current / 60).toString().padStart(2, '0');
    const m = (current % 60).toString().padStart(2, '0');
    slots.push(`${h}:${m}`);
    current += durationMinutes;
  }
  return slots;
}

/** Devuelve true si el slot cae dentro del bloque de descanso. */
function isInBreak(
  slotTime: string,
  durationMinutes: number,
  breakStart?: string | null,
  breakEnd?: string | null
): boolean {
  if (!breakStart || !breakEnd) return false;
  const [sH, sM] = slotTime.split(':').map(Number);
  const slotStartMin = sH * 60 + sM;
  const slotEndMin = slotStartMin + durationMinutes;
  const [bsH, bsM] = breakStart.split(':').map(Number);
  const [beH, beM] = breakEnd.split(':').map(Number);
  const breakStartMin = bsH * 60 + bsM;
  const breakEndMin = beH * 60 + beM;
  return slotStartMin < breakEndMin && slotEndMin > breakStartMin;
}

/**
 * Verifica si un slot se solapa con reservas existentes
 */
function isSlotOccupied(
  slotTime: string,
  durationMinutes: number,
  existingBookings: { start_time: string; end_time: string }[]
): boolean {
  const [slotH, slotM] = slotTime.split(':').map(Number);
  const slotStart = slotH * 60 + slotM;
  const slotEnd = slotStart + durationMinutes;

  return existingBookings.some(({ start_time, end_time }) => {
    const [bStartH, bStartM] = start_time.split(':').map(Number);
    const [bEndH, bEndM] = end_time.split(':').map(Number);
    const bStart = bStartH * 60 + bStartM;
    const bEnd = bEndH * 60 + bEndM;
    return slotStart < bEnd && slotEnd > bStart;
  });
}

/**
 * Retorna los slots disponibles para una barbería, día y servicio dados.
 * excludeBookingId: cuando se reprograma, excluye esa reserva para que su
 * propio slot no aparezca como ocupado.
 */
export async function getAvailableSlots(
  barbershopId: string,
  date: Date,
  durationMinutes: number,
  excludeBookingId?: string
): Promise<TimeSlot[]> {
  const dayOfWeek = date.getDay();
  const dateStr = toLocalDateStr(date);

  // 1. Obtener horario laboral (incluyendo pausa)
  const { data: availability, error: availError } = await supabase
    .from('availability')
    .select('start_time, end_time, break_start, break_end')
    .eq('barbershop_id', barbershopId)
    .eq('day_of_week', dayOfWeek)
    .eq('is_active', true)
    .single();

  if (availError || !availability) return [];

  // 2. Obtener reservas existentes para esa fecha (excluyendo la que se reprograma)
  let bookingsQuery = supabase
    .from('bookings')
    .select('start_time, end_time')
    .eq('barbershop_id', barbershopId)
    .eq('booking_date', dateStr)
    .neq('status', 'cancelled');

  if (excludeBookingId) {
    bookingsQuery = bookingsQuery.neq('id', excludeBookingId);
  }

  const { data: bookings } = await bookingsQuery;

  const existingBookings = bookings ?? [];

  // 3. Generar todos los slots y marcar ocupados
  const allSlots = generateTimeSlots(
    availability.start_time,
    availability.end_time,
    durationMinutes
  );

  return allSlots.map((time) => ({
    time,
    available:
      !isSlotOccupied(time, durationMinutes, existingBookings) &&
      !isInBreak(time, durationMinutes, availability.break_start, availability.break_end),
  }));
}

/**
 * Calcula la hora de fin dado inicio y duración
 */
export function calculateEndTime(startTime: string, durationMinutes: number): string {
  const [h, m] = startTime.split(':').map(Number);
  const totalMinutes = h * 60 + m + durationMinutes;
  const capped = Math.min(totalMinutes, 23 * 60 + 59);
  const endH = Math.floor(capped / 60).toString().padStart(2, '0');
  const endM = (capped % 60).toString().padStart(2, '0');
  return `${endH}:${endM}`;
}
