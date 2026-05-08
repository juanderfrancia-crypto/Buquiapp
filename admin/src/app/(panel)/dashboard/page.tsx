import { createClient } from '@/lib/supabase';
import StatCard from '@/components/StatCard';

async function getStats() {
  const supabase = createClient();
  const today = new Date().toISOString().split('T')[0];
  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

  const [
    { count: totalUsers },
    { count: totalNegocios },
    { count: reservasHoy },
    { count: reservasMes },
    { count: pendientes },
    { count: confirmadas },
    { count: canceladas },
  ] = await Promise.all([
    supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'client'),
    supabase.from('barbershops').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('booking_date', today),
    supabase.from('bookings').select('*', { count: 'exact', head: true }).gte('booking_date', firstOfMonth),
    supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('status', 'confirmed'),
    supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('status', 'cancelled'),
  ]);

  return { totalUsers, totalNegocios, reservasHoy, reservasMes, pendientes, confirmadas, canceladas };
}

async function getRecentBookings() {
  const supabase = createClient();
  const { data } = await supabase
    .from('bookings')
    .select('*, service:services(name), barbershop:barbershops(name), user:users(name,email)')
    .order('created_at', { ascending: false })
    .limit(8);
  return data ?? [];
}

const STATUS_LABEL: Record<string, string> = { pending: 'Pendiente', confirmed: 'Confirmada', cancelled: 'Cancelada' };
const STATUS_COLOR: Record<string, string> = { pending: 'bg-yellow-100 text-yellow-700', confirmed: 'bg-green-100 text-green-700', cancelled: 'bg-red-100 text-red-700' };

export default async function DashboardPage() {
  const [stats, recent] = await Promise.all([getStats(), getRecentBookings()]);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-black text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Resumen general de la plataforma</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Usuarios" value={stats.totalUsers ?? 0} icon="👥" color="#2F6BFF" />
        <StatCard label="Negocios activos" value={stats.totalNegocios ?? 0} icon="🏪" color="#0F2FA8" />
        <StatCard label="Reservas hoy" value={stats.reservasHoy ?? 0} icon="📅" color="#E8B86D" />
        <StatCard label="Reservas este mes" value={stats.reservasMes ?? 0} icon="📈" color="#16A34A" />
      </div>

      {/* Status cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-yellow-50 border border-yellow-100 rounded-2xl p-5">
          <p className="text-3xl font-black text-yellow-600">{stats.pendientes ?? 0}</p>
          <p className="text-sm font-semibold text-yellow-700 mt-1">Pendientes de confirmar</p>
        </div>
        <div className="bg-green-50 border border-green-100 rounded-2xl p-5">
          <p className="text-3xl font-black text-green-600">{stats.confirmadas ?? 0}</p>
          <p className="text-sm font-semibold text-green-700 mt-1">Confirmadas totales</p>
        </div>
        <div className="bg-red-50 border border-red-100 rounded-2xl p-5">
          <p className="text-3xl font-black text-red-500">{stats.canceladas ?? 0}</p>
          <p className="text-sm font-semibold text-red-600 mt-1">Canceladas totales</p>
        </div>
      </div>

      {/* Recent bookings */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-900">Últimas reservas</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Cliente</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Negocio</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Servicio</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Fecha</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {recent.map((b: any) => (
                <tr key={b.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{b.user?.name ?? '—'}</td>
                  <td className="px-6 py-4 text-gray-600">{b.barbershop?.name ?? '—'}</td>
                  <td className="px-6 py-4 text-gray-600">{b.notes ?? b.service?.name ?? '—'}</td>
                  <td className="px-6 py-4 text-gray-600">{b.booking_date} {b.start_time}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_COLOR[b.status]}`}>
                      {STATUS_LABEL[b.status]}
                    </span>
                  </td>
                </tr>
              ))}
              {recent.length === 0 && (
                <tr><td colSpan={5} className="px-6 py-10 text-center text-gray-400">Sin reservas aún</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
