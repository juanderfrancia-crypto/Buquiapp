export type UserRole = 'client' | 'barber';
export type BookingStatus = 'pending' | 'confirmed' | 'cancelled';
export type BusinessType = 'barbershop' | 'beauty_salon' | 'spa' | 'other';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  avatar_url?: string;
  created_at: string;
}

export interface Barbershop {
  id: string;
  name: string;
  address: string;
  description?: string;
  phone?: string;
  image_url?: string;
  owner_id: string;
  business_type: BusinessType;
  rating?: number;
  is_active: boolean;
  created_at: string;
}

export interface Service {
  id: string;
  barbershop_id: string;
  name: string;
  duration_minutes: number;
  price: number;
  description?: string;
  is_active: boolean;
}

export interface Availability {
  id: string;
  barbershop_id: string;
  day_of_week: number; // 0=domingo, 6=sábado
  start_time: string;  // "09:00"
  end_time: string;    // "19:00"
  break_start?: string | null;
  break_end?: string | null;
  is_active: boolean;
}

export interface Booking {
  id: string;
  user_id: string;
  service_id: string;
  barbershop_id: string;
  booking_date: string; // "2025-04-27"
  start_time: string;   // "10:00"
  end_time: string;     // "10:30"
  status: BookingStatus;
  notes?: string;
  created_at: string;
  // Joins
  service?: Service;
  barbershop?: Barbershop;
  user?: User;
}

export interface TimeSlot {
  time: string;
  available: boolean;
}
