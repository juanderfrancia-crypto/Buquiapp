'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { SkeletonTable } from '@/components/Skeleton';
import EmptyState from '@/components/EmptyState';
import ConfirmModal from '@/components/ConfirmModal';
import { IconStore } from '@/components/Icons';
import { fmtDate } from '@/lib/utils';
import { logAdminAction } from '@/lib/audit';

type Negocio = {
  id: string;
  name: string;
  address: string;
  business_type: string;
  is_active: boolean;
  created_at: string;
  owner: { name: string; email: string } | null;
};

const TYPE_LABEL: Record<string, string> = {
  barbershop:   'Barbería',
  beauty_salon: 'Salón de belleza',
  spa:          'Spa',
  other:        'Otro',
};

const TYPE_STYLE: Record<string, string> = {
  barbershop:   'bg-blue-50 text-blue-700',
  beauty_salon: 'bg-pink-50 text-pink-700',
  spa:          'bg-teal-50 text-teal-700',
  other:        'bg-gray-100 text-gray-600',
};

type Filter = 'all' | 'active' | 'inactive';

type PendingToggle = { id: string; current: boolean } | null;

export default function NegociosPage() {
  const [negocios, setNegocios] = useState<Negocio[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [pending, setPending] = useState<PendingToggle>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { data, error: err } = await supabase
      .from('barbershops')
      .select('id, name, address, business_type, is_active, created_at, owner:users(name,email)')
      .order('created_at', { ascending: false });
    if (err) setError('No se pudieron cargar los negocios.');
    else setNegocios((data as unknown as Negocio[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function confirmToggle() {
    if (!pending) return;
    const supabase = createClient();
    const newState = !pending.current;
    const { error: err } = await supabase
      .from('barbershops')
      .update({ is_active: newState })
      .eq('id', pending.id);
    if (!err) {
      setNegocios(prev => prev.map(n => n.id === pending.id ? { ...n, is_active: newState } : n));
      await logAdminAction(
        newState ? 'shop_activated' : 'shop_deactivated',
        'barbershop',
        pending.id,
        { name: pending.name, new_state: newState }
      );
    }
    setPending(null);
  }

  const filtered = negocios.filter(n => {
    const matchFilter = filter === 'all' ? true : filter === 'active' ? n.is_active : !n.is_active;
    const q = search.toLowerCase();
    const matchSearch = !search
      || n.name.toLowerCase().includes(q)
      || (n.owner?.name?.toLowerCase().includes(q) ?? false);
    return matchFilter && matchSearch;
  });

  const tabs: { key: Filter; label: string }[] = [
    { key: 'all',      label: `Todos (${negocios.length})` },
    { key: 'active',   label: `Activos (${negocios.filter(n => n.is_active).length})` },
    { key: 'inactive', label: `Inactivos (${negocios.filter(n => !n.is_active).length})` },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
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
          placeholder="Buscar por nombre o propietario..."
          className="flex-1 min-w-48 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
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
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Negocio</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Tipo</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Propietario</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Registro</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Estado</th>
              <th className="px-6 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading && <SkeletonTable cols={6} />}
            {!loading && !error && filtered.map(n => (
              <tr key={n.id} className="hover:bg-gray-50/70 transition-colors">
                <td className="px-6 py-4">
                  <p className="font-medium text-gray-900">{n.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{n.address}</p>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${TYPE_STYLE[n.business_type] ?? 'bg-gray-100 text-gray-600'}`}>
                    {TYPE_LABEL[n.business_type] ?? n.business_type}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <p className="text-sm text-gray-900">{n.owner?.name ?? '—'}</p>
                  <p className="text-xs text-gray-400">{n.owner?.email}</p>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">{fmtDate(n.created_at)}</td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ring-1 ${
                    n.is_active ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-gray-100 text-gray-500 ring-gray-200'
                  }`}>
                    {n.is_active ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <button
                    onClick={() => setPending({ id: n.id, current: n.is_active })}
                    className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-all ${
                      n.is_active ? 'border-red-200 text-red-600 hover:bg-red-50' : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                    }`}>
                    {n.is_active ? 'Desactivar' : 'Activar'}
                  </button>
                </td>
              </tr>
            ))}
            {!loading && !error && filtered.length === 0 && (
              <EmptyState colSpan={6} Icon={IconStore} title="Sin negocios" description="No hay negocios que coincidan con los filtros aplicados." />
            )}
          </tbody>
        </table>
      </div>

      {pending && (
        <ConfirmModal
          title={pending.current ? 'Desactivar negocio' : 'Activar negocio'}
          message={pending.current
            ? 'El negocio dejará de ser visible para los clientes.'
            : 'El negocio volverá a estar disponible para reservas.'}
          confirmLabel={pending.current ? 'Sí, desactivar' : 'Sí, activar'}
          danger={pending.current}
          onConfirm={confirmToggle}
          onCancel={() => setPending(null)}
        />
      )}
    </div>
  );
}
