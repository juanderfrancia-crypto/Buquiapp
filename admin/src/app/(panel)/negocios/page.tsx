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
  _count?: number;
};

const TYPE_LABEL: Record<string, string> = {
  barbershop: 'Barbería',
  beauty_salon: 'Salón de belleza',
  spa: 'Spa',
  other: 'Otro',
};

export default function NegociosPage() {
  const [negocios, setNegocios] = useState<Negocio[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');

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

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Negocios</h1>
          <p className="text-gray-500 text-sm mt-1">{negocios.length} registrados en total</p>
        </div>
        <div className="flex gap-2">
          {(['all', 'active', 'inactive'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                filter === f ? 'text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
              style={filter === f ? { background: 'linear-gradient(135deg,#2F6BFF,#1E4ED8)' } : {}}
            >
              {f === 'all' ? 'Todos' : f === 'active' ? 'Activos' : 'Inactivos'}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Negocio</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Tipo</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Dueño</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Registro</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Estado</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading && (
                <tr><td colSpan={6} className="px-6 py-10 text-center text-gray-400">Cargando...</td></tr>
              )}
              {!loading && filtered.map(n => (
                <tr key={n.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <p className="font-semibold text-gray-900">{n.name}</p>
                    <p className="text-xs text-gray-400">{n.address}</p>
                  </td>
                  <td className="px-6 py-4 text-gray-600">{TYPE_LABEL[n.business_type] ?? n.business_type}</td>
                  <td className="px-6 py-4">
                    <p className="text-gray-900">{n.owner?.name ?? '—'}</p>
                    <p className="text-xs text-gray-400">{n.owner?.email}</p>
                  </td>
                  <td className="px-6 py-4 text-gray-500">{new Date(n.created_at).toLocaleDateString('es-CO')}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${n.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {n.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => toggleActive(n.id, n.is_active)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        n.is_active
                          ? 'bg-red-50 text-red-600 hover:bg-red-100'
                          : 'bg-green-50 text-green-600 hover:bg-green-100'
                      }`}
                    >
                      {n.is_active ? 'Desactivar' : 'Activar'}
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={6} className="px-6 py-10 text-center text-gray-400">Sin negocios</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
