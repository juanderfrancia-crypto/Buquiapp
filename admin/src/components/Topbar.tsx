'use client';

import { usePathname } from 'next/navigation';

const PAGE_TITLES: Record<string, { title: string; subtitle: string }> = {
  '/dashboard': { title: 'Dashboard',  subtitle: 'Resumen general de la plataforma' },
  '/negocios':  { title: 'Negocios',   subtitle: 'Gestión de negocios registrados' },
  '/usuarios':  { title: 'Usuarios',   subtitle: 'Gestión de cuentas de la plataforma' },
  '/reservas':  { title: 'Reservas',   subtitle: 'Historial y estado de reservas' },
};

interface TopbarProps {
  userEmail: string;
}

export default function Topbar({ userEmail }: TopbarProps) {
  const pathname = usePathname();
  const page = PAGE_TITLES[pathname] ?? { title: 'Admin', subtitle: '' };
  const initial = userEmail.charAt(0).toUpperCase();

  return (
    <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-8 flex-shrink-0">
      <div className="flex flex-col">
        <h2 className="text-sm font-bold text-gray-900 leading-tight">{page.title}</h2>
        <p className="text-xs text-gray-400 leading-tight">{page.subtitle}</p>
      </div>

      <div className="flex items-center gap-4">
        {/* Notification bell */}
        <button className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors relative">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="w-4.5 h-4.5 w-[18px] h-[18px]">
            <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {/* Divider */}
        <div className="w-px h-5 bg-gray-200" />

        {/* User */}
        <div className="flex items-center gap-2.5">
          <div className="text-right">
            <p className="text-xs font-semibold text-gray-700 leading-tight">Administrador</p>
            <p className="text-xs text-gray-400 leading-tight">{userEmail}</p>
          </div>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center flex-shrink-0 shadow-sm">
            <span className="text-xs font-bold text-white">{initial}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
