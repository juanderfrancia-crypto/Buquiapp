'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';

type Reserva = {
  id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  status: string;
  notes: string | null;
  created_at: string;
  service: { name: string; price: number } | null;
  barbershop: { name: string } | null;
  user: { name: string; email: string } | null;
};

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmada',
  cancelled: 'Cancelada',
};
const STATUS_STYLE: Record<string, string> = {
  pending:   'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  confirmed: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  cancelled: 'bg-red-50 text-red-600 ring-1 ring-red-200',
};

type StatusFilter = 'all' | 'pending' | 'confirmed' | 'cancelled';

export default function ReservasPage() {
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<StatusFilter>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [search, setSearch] = useState('');

  async function load() {
    setLoading(true);
    const supabase = createClient();
    let query = supabase
      .from('bookings')
      .select('*, service:services(name,price), barbershop:barbershops(name), user:users(name,email)')
      .order('booking_date', { ascending: false })
      .order('start_time', { ascending: false })
      .limit(200);

    if (status !== 'all') query = query.eq('status', status);
    if (dateFrom) query = query.gte('booking_date', dateFrom);
    if (dateTo) query = query.lte('booking_date', dateTo);

    const { data } = await query;
    setReservas((data as any) ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, [status, dateFrom, dateTo]);

  const filtered = reservas.filter(r => {
    if (!search) return true;
    const q = search.toLowerCase();
    return r.user?.name?.toLowerCase().includes(q) || r.barbershop?.name?.toLowerCase().includes(q);
  });

  const tabs: { key: StatusFilter; label: string }[] = [
    { key: 'all',       label: 'Todas' },
    { key: 'pending',   label: 'Pendientes' },
    { key: 'confirmed', label: 'Confirmadas' },
    { key: 'cancelled', label: 'Canceladas' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Reservas</h1>
        <p className="text-sm text-gray-500 mt-0.5">{filtered.length} reservas encontradas</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
          {tabs.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setStatus(key)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                status === key
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar cliente o negocio..."
          className="flex-1 min-w-48 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        />
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
          <span className="text-gray-400 text-sm">—</span>
          <input
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Cliente</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Negocio</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Servicio</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Fecha y hora</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Precio</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading && (
              <tr><td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-400">Cargando...</td></tr>
            )}
            {!loading && filtered.map(r => (
              <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <p className="font-medium text-gray-900">{r.user?.name ?? '—'}</p>
                  <p className="text-xs text-gray-400">{r.user?.email}</p>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">{r.barbershop?.name ?? '—'}</td>
                <td className="px-6 py-4 text-sm text-gray-600 max-w-36 truncate">{r.notes ?? r.service?.name ?? '—'}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <p className="text-sm text-gray-900">{r.booking_date}</p>
                  <p className="text-xs text-gray-400">{r.start_time} – {r.end_time}</p>
                </td>
                <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                  {r.service?.price ? `$${r.service.price.toLocaleString('es-CO')}` : '—'}
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLE[r.status]}`}>
                    {STATUS_LABEL[r.status]}
                  </span>
                </td>
              </tr>
            ))}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-400">Sin reservas</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
