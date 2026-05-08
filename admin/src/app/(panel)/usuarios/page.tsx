'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { SkeletonTable } from '@/components/Skeleton';
import EmptyState from '@/components/EmptyState';
import ConfirmModal from '@/components/ConfirmModal';
import { IconUsers } from '@/components/Icons';
import { fmtDate } from '@/lib/utils';

type Usuario = {
  id: string;
  name: string;
  email: string;
  role: string;
  phone: string | null;
  is_active: boolean;
  created_at: string;
};

const ROLE_LABEL: Record<string, string> = { client: 'Cliente', barber: 'Barbero', admin: 'Admin' };
const ROLE_STYLE: Record<string, string> = {
  client: 'bg-blue-50 text-blue-700 ring-blue-200',
  barber: 'bg-violet-50 text-violet-700 ring-violet-200',
  admin:  'bg-amber-50 text-amber-700 ring-amber-200',
};

const AVATAR_BG = ['bg-blue-500', 'bg-violet-500', 'bg-emerald-500', 'bg-orange-500', 'bg-pink-500'];

type RoleFilter = 'all' | 'client' | 'barber';
type PendingToggle = { id: string; current: boolean; name: string } | null;

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<RoleFilter>('all');
  const [search, setSearch] = useState('');
  const [pending, setPending] = useState<PendingToggle>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { data, error: err } = await supabase
      .from('users')
      .select('id, name, email, role, phone, is_active, created_at')
      .order('created_at', { ascending: false });
    if (err) setError('No se pudieron cargar los usuarios.');
    else setUsuarios((data as Usuario[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function confirmToggle() {
    if (!pending) return;
    const supabase = createClient();
    const { error: err } = await supabase
      .from('users')
      .update({ is_active: !pending.current })
      .eq('id', pending.id);
    if (!err) setUsuarios(prev => prev.map(u => u.id === pending.id ? { ...u, is_active: !pending.current } : u));
    setPending(null);
  }

  const nonAdmins = usuarios.filter(u => u.role !== 'admin');

  const filtered = nonAdmins.filter(u => {
    const matchRole = filter === 'all' || u.role === filter;
    const q = search.toLowerCase();
    const matchSearch = !search || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    return matchRole && matchSearch;
  });

  const tabs: { key: RoleFilter; label: string }[] = [
    { key: 'all',    label: `Todos (${nonAdmins.length})` },
    { key: 'client', label: `Clientes (${nonAdmins.filter(u => u.role === 'client').length})` },
    { key: 'barber', label: `Barberos (${nonAdmins.filter(u => u.role === 'barber').length})` },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
          {tabs.map(({ key, label }) => (
            <button key={key} onClick={() => setFilter(key)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                filter === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}>
              {label}
            </button>
          ))}
        </div>
        <input
          type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nombre o correo..."
          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
          <span>{error}</span>
          <button onClick={load} className="ml-auto text-xs font-medium underline">Reintentar</button>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Usuario</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Teléfono</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Rol</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Registro</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Estado</th>
              <th className="px-6 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading && <SkeletonTable cols={6} />}
            {!loading && !error && filtered.map((u, idx) => {
              const avatarBg = AVATAR_BG[u.name.charCodeAt(0) % AVATAR_BG.length];
              return (
                <tr key={u.id} className="hover:bg-gray-50/70 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full ${avatarBg} flex items-center justify-center flex-shrink-0`}>
                        <span className="text-xs font-bold text-white">{u.name.charAt(0).toUpperCase()}</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{u.name}</p>
                        <p className="text-xs text-gray-400">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{u.phone ?? '—'}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ring-1 ${ROLE_STYLE[u.role] ?? 'bg-gray-100 text-gray-600 ring-gray-200'}`}>
                      {ROLE_LABEL[u.role] ?? u.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">{fmtDate(u.created_at)}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ring-1 ${
                      u.is_active ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-gray-100 text-gray-500 ring-gray-200'
                    }`}>
                      {u.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => setPending({ id: u.id, current: u.is_active, name: u.name })}
                      className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-all ${
                        u.is_active ? 'border-red-200 text-red-600 hover:bg-red-50' : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                      }`}>
                      {u.is_active ? 'Desactivar' : 'Activar'}
                    </button>
                  </td>
                </tr>
              );
            })}
            {!loading && !error && filtered.length === 0 && (
              <EmptyState colSpan={6} Icon={IconUsers} title="Sin usuarios" description="No hay usuarios que coincidan con la búsqueda." />
            )}
          </tbody>
        </table>
      </div>

      {pending && (
        <ConfirmModal
          title={pending.current ? 'Desactivar usuario' : 'Activar usuario'}
          message={pending.current
            ? `${pending.name} no podrá iniciar sesión ni hacer reservas.`
            : `${pending.name} recuperará acceso completo a la plataforma.`}
          confirmLabel={pending.current ? 'Sí, desactivar' : 'Sí, activar'}
          danger={pending.current}
          onConfirm={confirmToggle}
          onCancel={() => setPending(null)}
        />
      )}
    </div>
  );
}
