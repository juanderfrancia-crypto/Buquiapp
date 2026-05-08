'use client';

import { usePathname } from 'next/navigation';
import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';

const PAGE_TITLES: Record<string, { title: string; subtitle: string }> = {
  '/dashboard': { title: 'Dashboard',  subtitle: 'Resumen general de la plataforma' },
  '/negocios':  { title: 'Negocios',   subtitle: 'Gestión de negocios registrados' },
  '/usuarios':  { title: 'Usuarios',   subtitle: 'Gestión de cuentas de la plataforma' },
  '/reservas':  { title: 'Reservas',   subtitle: 'Historial y estado de reservas' },
};

type Notif = {
  id: string;
  booking_date: string;
  start_time: string;
  created_at: string;
  user: { name: string } | null;
  barbershop: { name: string } | null;
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'hace un momento';
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h}h`;
  return `hace ${Math.floor(h / 24)}d`;
}

export default function Topbar({ userEmail }: { userEmail: string }) {
  const pathname = usePathname();
  const page = PAGE_TITLES[pathname] ?? { title: 'Admin', subtitle: '' };
  const initial = userEmail.charAt(0).toUpperCase();

  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Count pending on mount
  useEffect(() => {
    const supabase = createClient();
    supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')
      .then(({ count }) => setUnread(count ?? 0));
  }, []);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const openPanel = useCallback(async () => {
    setOpen(o => !o);
    if (notifs.length === 0) {
      setLoading(true);
      const supabase = createClient();
      const { data } = await supabase
        .from('bookings')
        .select('id, booking_date, start_time, created_at, user:users(name), barbershop:barbershops(name)')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(6);
      setNotifs((data as unknown as Notif[]) ?? []);
      setLoading(false);
    }
    setUnread(0);
  }, [notifs.length]);

  return (
    <header className="h-16 bg-white border-b border-gray-100 shadow-[0_1px_12px_rgba(0,0,0,0.06)] flex items-center justify-between px-8 flex-shrink-0 z-10">
      <div className="flex flex-col">
        <h2 className="text-sm font-bold text-gray-900 leading-tight">{page.title}</h2>
        <p className="text-xs text-gray-400 leading-tight">{page.subtitle}</p>
      </div>

      <div className="flex items-center gap-4">
        {/* Notification bell */}
        <div className="relative" ref={ref}>
          <button
            onClick={openPanel}
            className="relative w-8 h-8 flex items-center justify-center rounded-xl text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="w-[18px] h-[18px]">
              <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {unread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 bg-blue-500 rounded-full flex items-center justify-center text-[9px] font-bold text-white leading-none">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>

          {open && (
            <div className="absolute right-0 top-10 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50">
              {/* Header */}
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-gray-900">Notificaciones</p>
                  <p className="text-xs text-gray-400">Reservas pendientes de confirmación</p>
                </div>
                <Link
                  href="/reservas"
                  onClick={() => setOpen(false)}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                >
                  Ver todas
                </Link>
              </div>

              {/* List */}
              <div className="max-h-72 overflow-y-auto divide-y divide-gray-50">
                {loading && (
                  <div className="py-8 text-center text-xs text-gray-400">Cargando...</div>
                )}
                {!loading && notifs.length === 0 && (
                  <div className="py-10 text-center">
                    <p className="text-sm font-medium text-gray-600">Todo al día</p>
                    <p className="text-xs text-gray-400 mt-0.5">No hay reservas pendientes</p>
                  </div>
                )}
                {!loading && notifs.map(n => (
                  <Link
                    key={n.id}
                    href="/reservas"
                    onClick={() => setOpen(false)}
                    className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5 text-amber-600">
                        <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-900 truncate">
                        {n.user?.name ?? 'Cliente'} · {n.barbershop?.name ?? 'Negocio'}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {n.booking_date} a las {n.start_time?.slice(0, 5)}
                      </p>
                    </div>
                    <span className="text-[10px] text-gray-400 whitespace-nowrap mt-0.5 flex-shrink-0">
                      {timeAgo(n.created_at)}
                    </span>
                  </Link>
                ))}
              </div>

              {/* Footer */}
              {!loading && notifs.length > 0 && (
                <div className="px-4 py-3 border-t border-gray-100 bg-gray-50/50">
                  <Link
                    href="/reservas?status=pending"
                    onClick={() => setOpen(false)}
                    className="block w-full text-center text-xs font-semibold text-blue-600 hover:text-blue-700"
                  >
                    Gestionar reservas pendientes →
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="w-px h-5 bg-gray-200" />

        <div className="flex items-center gap-2.5">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-semibold text-gray-700 leading-tight">Administrador</p>
            <p className="text-xs text-gray-400 leading-tight">{userEmail}</p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center flex-shrink-0 shadow-md shadow-blue-200 cursor-pointer hover:shadow-lg hover:shadow-blue-300 transition-shadow">
            <span className="text-xs font-bold text-white">{initial}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
