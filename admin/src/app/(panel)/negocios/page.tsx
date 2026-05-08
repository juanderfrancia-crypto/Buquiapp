'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';

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
  barbershop: 'Barbería',
  beauty_salon: 'Salón de belleza',
  spa: 'Spa',
  other: 'Otro',
};

type Filter = 'all' | 'active' | 'inactive';

export default function NegociosPage() {
  const [negocios, setNegocios] = useState<Negocio[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('all');

  async function load() {
    const supabase = createClient();
    const { data } = await supabase
      .from('barbershops')
      .select('*, owner:users(name,email)')
      .order('created_at', { ascending: false });
    setNegocios((data as any) ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function toggleActive(id: string, current: boolean) {
    const supabase = createClient();
    await supabase.from('barbershops').update({ is_active: !current }).eq('id', id);
    setNegocios(prev => prev.map(n => n.id === id ? { ...n, is_active: !current } : n));
  }

  const filtered = negocios.filter(n =>
    filter === 'all' ? true : filter === 'active' ? n.is_active : !n.is_active
  );

  const tabs: { key: Filter; label: string }[] = [
    { key: 'all',      label: `Todos (${negocios.length})` },
    { key: 'active',   label: `Activos (${negocios.filter(n => n.is_active).length})` },
    { key: 'inactive', label: `Inactivos (${negocios.filter(n => !n.is_active).length})` },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Negocios</h1>
        <p className="text-sm text-gray-500 mt-0.5">Gestiona los negocios registrados en la plataforma</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
              filter === key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Negocio</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Tipo</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Propietario</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Registro</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Estado</th>
              <th className="px-6 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading && (
              <tr><td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-400">Cargando...</td></tr>
            )}
            {!loading && filtered.map(n => (
              <tr key={n.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <p className="font-medium text-gray-900">{n.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{n.address}</p>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-gray-600">{TYPE_LABEL[n.business_type] ?? n.business_type}</span>
                </td>
                <td className="px-6 py-4">
                  <p className="text-sm text-gray-900">{n.owner?.name ?? '—'}</p>
                  <p className="text-xs text-gray-400">{n.owner?.email}</p>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                  {new Date(n.created_at).toLocaleDateString('es-CO')}
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ring-1 ${
                    n.is_active
                      ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                      : 'bg-gray-100 text-gray-500 ring-gray-200'
                  }`}>
                    {n.is_active ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <button
                    onClick={() => toggleActive(n.id, n.is_active)}
                    className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-all ${
                      n.is_active
                        ? 'border-red-200 text-red-600 hover:bg-red-50'
                        : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                    }`}
                  >
                    {n.is_active ? 'Desactivar' : 'Activar'}
                  </button>
                </td>
              </tr>
            ))}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-400">Sin negocios</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
