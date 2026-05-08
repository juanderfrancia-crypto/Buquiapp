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

const STATUS_LABEL: Record<string, string> = { pending: 'Pendiente', confirmed: 'Confirmada', cancelled: 'Cancelada' };
const STATUS_COLOR: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

export default function ReservasPage() {
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<'all' | 'pending' | 'confirmed' | 'cancelled'>('all');
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

  const filtered = reservas.filter(r =>
    !search ||
    r.user?.name?.toLowerCase().includes(search.toLowerCase()) ||
    r.barbershop?.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Reservas</h1>
          <p className="text-gray-500 text-sm mt-1">{filtered.length} reservas encontradas</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar cliente o negocio..."
          className="flex-1 min-w-48 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        />
        <input
          type="date"
          value={dateFrom}
          onChange={e => setDateFrom(e.target.value)}
          className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        />
        <input
          type="date"
          value={dateTo}
          onChange={e => setDateTo(e.target.value)}
          className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        />
        <div className="flex gap-2">
          {(['all', 'pending', 'confirmed', 'cancelled'] as const).map(s => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                status === s ? 'text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
              style={status === s ? { background: 'linear-gradient(135deg,#2F6BFF,#1E4ED8)' } : {}}
            >
              {s === 'all' ? 'Todas' : STATUS_LABEL[s]}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Cliente</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Negocio</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Servicio</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Fecha y hora</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Precio</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading && (
                <tr><td colSpan={6} className="px-6 py-10 text-center text-gray-400">Cargando...</td></tr>
              )}
              {!loading && filtered.map(r => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <p className="font-semibold text-gray-900">{r.user?.name ?? '—'}</p>
                    <p className="text-xs text-gray-400">{r.user?.email}</p>
                  </td>
                  <td className="px-6 py-4 text-gray-600">{r.barbershop?.name ?? '—'}</td>
                  <td className="px-6 py-4 text-gray-600">{r.notes ?? r.service?.name ?? '—'}</td>
                  <td className="px-6 py-4 text-gray-600">
                    <p>{r.booking_date}</p>
                    <p className="text-xs text-gray-400">{r.start_time} – {r.end_time}</p>
                  </td>
                  <td className="px-6 py-4 font-semibold" style={{ color: '#2F6BFF' }}>
                    {r.service?.price ? `$${r.service.price.toLocaleString('es-CO')}` : '—'}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_COLOR[r.status]}`}>
                      {STATUS_LABEL[r.status]}
                    </span>
                  </td>
                </tr>
              ))}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={6} className="px-6 py-10 text-center text-gray-400">Sin reservas</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
