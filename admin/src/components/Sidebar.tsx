'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { IconGrid, IconStore, IconUsers, IconCalendar, IconLogOut } from './Icons';

const nav = [
  { href: '/dashboard', label: 'Dashboard',  Icon: IconGrid },
  { href: '/negocios',  label: 'Negocios',   Icon: IconStore },
  { href: '/usuarios',  label: 'Usuarios',   Icon: IconUsers },
  { href: '/reservas',  label: 'Reservas',   Icon: IconCalendar },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  }

  return (
    <aside className="w-60 min-h-screen flex flex-col bg-gray-950 flex-shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-white/5">
        <img src="/icono.png" alt="Buqui" className="w-9 h-9 rounded-xl shadow-lg shadow-blue-900/40" />
        <div>
          <p className="text-white font-bold text-sm leading-tight">Buqui</p>
          <p className="text-gray-500 text-xs">Admin Panel</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-5 flex flex-col gap-0.5">
        <p className="text-xs font-semibold text-gray-600 uppercase tracking-widest px-3 mb-3">Menú</p>
        {nav.map(({ href, label, Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                active
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50'
                  : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
              }`}
            >
              <Icon className={`w-4 h-4 flex-shrink-0 ${active ? 'text-white' : 'text-gray-500'}`} />
              {label}
              {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white/60" />}
            </Link>
          );
        })}
      </nav>

      {/* User logout */}
      <div className="px-3 pb-5 border-t border-white/5 pt-4">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:bg-red-500/10 hover:text-red-400 transition-all"
        >
          <IconLogOut className="w-4 h-4 flex-shrink-0" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
