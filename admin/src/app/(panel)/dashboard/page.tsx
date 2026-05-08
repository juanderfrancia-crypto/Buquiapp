import { createClient } from '@/lib/supabase-server';
import StatCard from '@/components/StatCard';
import { IconUsers, IconStore, IconCalendar, IconTrendUp, IconClock, IconCheck, IconX } from '@/components/Icons';

async function getStats() {
  const supabase = await createClient();
  const today = new Date().toISOString().split('T')[0];
  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString()
    .split('T')[0];

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
  return (data as Booking[]) ?? [];
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
  const [stats, recent] = await Promise.all([getStats(), getRecentBookings()]);

  const totalReservas = stats.pendientes + stats.confirmadas + stats.canceladas;
  const tasaConfirmacion = totalReservas > 0
    ? Math.round((stats.confirmadas / totalReservas) * 100)
    : 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {new Date().toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Usuarios registrados"
          value={stats.totalUsers}
          Icon={IconUsers}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
        />
        <StatCard
          label="Negocios activos"
          value={stats.totalNegocios}
          Icon={IconStore}
          iconBg="bg-indigo-50"
          iconColor="text-indigo-600"
        />
        <StatCard
          label="Reservas hoy"
          value={stats.reservasHoy}
          Icon={IconCalendar}
          iconBg="bg-violet-50"
          iconColor="text-violet-600"
        />
        <StatCard
          label="Reservas este mes"
          value={stats.reservasMes}
          Icon={IconTrendUp}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
              <IconClock className="w-4 h-4 text-amber-500" />
            </div>
            <span className="text-sm font-medium text-gray-600">Pendientes</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.pendientes}</p>
          <p className="text-xs text-gray-400 mt-1">Esperando confirmación</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
              <IconCheck className="w-4 h-4 text-emerald-600" />
            </div>
            <span className="text-sm font-medium text-gray-600">Confirmadas</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.confirmadas}</p>
          <p className="text-xs text-gray-400 mt-1">Tasa de confirmación: {tasaConfirmacion}%</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
              <IconX className="w-4 h-4 text-red-500" />
            </div>
            <span className="text-sm font-medium text-gray-600">Canceladas</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.canceladas}</p>
          <p className="text-xs text-gray-400 mt-1">Total histórico</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">Últimas reservas</h2>
          <a href="/reservas" className="text-xs font-medium text-blue-600 hover:text-blue-700">Ver todas →</a>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-50">
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Cliente</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Negocio</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Servicio</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Fecha</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {recent.map((b) => (
              <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-3.5">
                  <p className="font-medium text-gray-900 text-sm">{b.user?.name ?? '—'}</p>
                  <p className="text-xs text-gray-400">{b.user?.email}</p>
                </td>
                <td className="px-6 py-3.5 text-sm text-gray-600">{b.barbershop?.name ?? '—'}</td>
                <td className="px-6 py-3.5 text-sm text-gray-600">{b.notes ?? b.service?.name ?? '—'}</td>
                <td className="px-6 py-3.5 text-sm text-gray-500 whitespace-nowrap">{b.booking_date} · {b.start_time}</td>
                <td className="px-6 py-3.5">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLE[b.status] ?? 'bg-gray-100 text-gray-600'}`}>
                    {STATUS_LABEL[b.status] ?? b.status}
                  </span>
                </td>
              </tr>
            ))}
            {recent.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-sm text-gray-400">Sin reservas aún</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
