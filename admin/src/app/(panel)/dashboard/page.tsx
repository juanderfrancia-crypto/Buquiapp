import { createClient } from '@/lib/supabase-server';
import StatCard from '@/components/StatCard';
import BookingsChart, { type ChartDay } from '@/components/BookingsChart';
import { IconUsers, IconStore, IconCalendar, IconTrendUp, IconClock, IconCheck, IconX } from '@/components/Icons';
import { fmtDate, fmtTime } from '@/lib/utils';

async function getStats() {
  const supabase = await createClient();
  const today = new Date().toISOString().split('T')[0];
  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString().split('T')[0];

  const results = await Promise.allSettled([
    supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'client'),
    supabase.from('barbershops').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('booking_date', today),
    supabase.from('bookings').select('*', { count: 'exact', head: true }).gte('booking_date', firstOfMonth),
    supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('status', 'confirmed'),
    supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('status', 'cancelled'),
  ]);

  const getValue = (r: PromiseSettledResult<{ count: number | null }>) =>
    r.status === 'fulfilled' ? (r.value.count ?? 0) : 0;

  const [totalUsers, totalNegocios, reservasHoy, reservasMes, pendientes, confirmadas, canceladas] =
    results.map(getValue);

  return { totalUsers, totalNegocios, reservasHoy, reservasMes, pendientes, confirmadas, canceladas };
}

async function getBookingsTrend(): Promise<ChartDay[]> {
  const supabase = await createClient();
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return {
      date: d.toISOString().split('T')[0],
      label: d.toLocaleDateString('es-CO', { weekday: 'short' }).slice(0, 3),
    };
  });

  const { data } = await supabase
    .from('bookings')
    .select('booking_date')
    .gte('booking_date', days[0].date)
    .lte('booking_date', days[6].date);

  return days.map(({ date, label }) => ({
    day: date,
    label,
    count: data?.filter((b: { booking_date: string }) => b.booking_date === date).length ?? 0,
  }));
}

type Booking = {
  id: string;
  booking_date: string;
  start_time: string;
  status: string;
  notes: string | null;
  service: { name: string } | null;
  barbershop: { name: string } | null;
  user: { name: string; email: string } | null;
};

async function getRecentBookings(): Promise<Booking[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('bookings')
    .select('id, booking_date, start_time, status, notes, service:services(name), barbershop:barbershops(name), user:users(name,email)')
    .order('created_at', { ascending: false })
    .limit(8);
  if (error) return [];
  return (data as unknown as Booking[]) ?? [];
}

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

export default async function DashboardPage() {
  const [stats, trend, recent] = await Promise.all([
    getStats(),
    getBookingsTrend(),
    getRecentBookings(),
  ]);

  const totalReservas = stats.pendientes + stats.confirmadas + stats.canceladas;
  const tasaConfirmacion = totalReservas > 0
    ? Math.round((stats.confirmadas / totalReservas) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Clientes registrados" value={stats.totalUsers}     Icon={IconUsers}    iconBg="bg-gradient-to-br from-blue-500 to-blue-700"     iconColor="text-white" />
        <StatCard label="Negocios activos"      value={stats.totalNegocios}  Icon={IconStore}    iconBg="bg-gradient-to-br from-indigo-500 to-violet-700"  iconColor="text-white" />
        <StatCard label="Reservas hoy"          value={stats.reservasHoy}   Icon={IconCalendar} iconBg="bg-gradient-to-br from-violet-500 to-purple-700"  iconColor="text-white" />
        <StatCard label="Reservas este mes"     value={stats.reservasMes}   Icon={IconTrendUp}  iconBg="bg-gradient-to-br from-emerald-500 to-green-700"  iconColor="text-white" />
      </div>

      {/* Chart + estado de reservas */}
      <div className="grid grid-cols-5 gap-4">
        {/* Gráfica */}
        <div className="col-span-3">
          <BookingsChart data={trend} />
        </div>

        {/* Estado cards */}
        <div className="col-span-2 flex flex-col gap-4">
          <div className="bg-white rounded-2xl border border-amber-100 p-5 flex items-center gap-4 flex-1 shadow-sm hover:shadow-md transition-shadow group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center flex-shrink-0 shadow-md shadow-amber-200">
              <IconClock className="w-4.5 h-4.5 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-3xl font-black text-gray-900 tracking-tight group-hover:text-amber-500 transition-colors">{stats.pendientes}</p>
              <p className="text-xs font-semibold text-gray-600">Pendientes</p>
              <p className="text-xs text-gray-400">Esperando confirmación</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-emerald-100 p-5 flex items-center gap-4 flex-1 shadow-sm hover:shadow-md transition-shadow group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-green-600 flex items-center justify-center flex-shrink-0 shadow-md shadow-emerald-200">
              <IconCheck className="w-4.5 h-4.5 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-3xl font-black text-gray-900 tracking-tight group-hover:text-emerald-600 transition-colors">{stats.confirmadas}</p>
              <p className="text-xs font-semibold text-gray-600">Confirmadas</p>
              <p className="text-xs text-gray-400">Tasa: {tasaConfirmacion}%</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-red-100 p-5 flex items-center gap-4 flex-1 shadow-sm hover:shadow-md transition-shadow group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-400 to-rose-600 flex items-center justify-center flex-shrink-0 shadow-md shadow-red-200">
              <IconX className="w-4.5 h-4.5 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-3xl font-black text-gray-900 tracking-tight group-hover:text-red-500 transition-colors">{stats.canceladas}</p>
              <p className="text-xs font-semibold text-gray-600">Canceladas</p>
              <p className="text-xs text-gray-400">Total histórico</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabla últimas reservas */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-gray-900">Últimas reservas</h2>
            <p className="text-xs text-gray-400 mt-0.5">Las 8 más recientes</p>
          </div>
          <a href="/reservas" className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1">
            Ver todas
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3">
              <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-50 bg-gray-50/50">
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Cliente</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Negocio</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Servicio</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Fecha</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {recent.map((b) => (
              <tr key={b.id} className="hover:bg-gray-50/70 transition-colors">
                <td className="px-6 py-3.5">
                  <p className="font-medium text-gray-900 text-sm">{b.user?.name ?? '—'}</p>
                  <p className="text-xs text-gray-400">{b.user?.email}</p>
                </td>
                <td className="px-6 py-3.5 text-sm text-gray-600">{b.barbershop?.name ?? '—'}</td>
                <td className="px-6 py-3.5 text-sm text-gray-600">{b.notes ?? b.service?.name ?? '—'}</td>
                <td className="px-6 py-3.5 whitespace-nowrap">
                  <p className="text-sm text-gray-900">{fmtDate(b.booking_date)}</p>
                  <p className="text-xs text-gray-400">{fmtTime(b.start_time)}</p>
                </td>
                <td className="px-6 py-3.5">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLE[b.status] ?? 'bg-gray-100 text-gray-600'}`}>
                    {STATUS_LABEL[b.status] ?? b.status}
                  </span>
                </td>
              </tr>
            ))}
            {recent.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-16 text-center text-sm text-gray-400">
                  Sin reservas aún
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
