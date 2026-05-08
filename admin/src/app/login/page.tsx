'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { Suspense } from 'react';

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(params.get('error') === 'unauthorized' ? 'No tienes permisos de administrador.' : '');

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      setError('Correo o contraseña incorrectos.');
      setLoading(false);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError('Error de autenticación.'); setLoading(false); return; }

    const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
    if (profile?.role !== 'admin') {
      await supabase.auth.signOut();
      setError('No tienes permisos de administrador.');
      setLoading(false);
      return;
    }

    router.push('/dashboard');
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg,#0F172A 0%,#1E3A8A 50%,#1D4ED8 100%)' }}
    >
      {/* Decorative blobs */}
      <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full opacity-20" style={{ background: 'radial-gradient(circle,#60A5FA,transparent 70%)' }} />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full opacity-15" style={{ background: 'radial-gradient(circle,#818CF8,transparent 70%)' }} />
      <div className="absolute top-1/2 left-1/4 w-64 h-64 rounded-full opacity-10" style={{ background: 'radial-gradient(circle,#38BDF8,transparent 70%)' }} />

      <div className="w-full max-w-sm relative z-10">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="w-20 h-20 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center mx-auto mb-5 shadow-2xl shadow-black/40">
            <img src="/icono.png" alt="Buqui" className="w-12 h-12 rounded-xl" />
          </div>
          <h1 className="text-white font-black text-3xl tracking-tight">Buqui</h1>
          <p className="text-white/50 text-sm mt-1.5 font-medium tracking-wide uppercase">Panel de Administración</p>
        </div>

        {/* Card */}
        <form
          onSubmit={handleLogin}
          className="rounded-2xl p-8 shadow-2xl shadow-black/40 border border-white/10"
          style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(24px)' }}
        >
          <h2 className="text-white font-bold text-lg mb-6">Iniciar sesión</h2>

          {error && (
            <div className="bg-red-500/20 border border-red-400/30 rounded-xl px-4 py-3 mb-4 text-red-200 text-sm backdrop-blur-sm">
              {error}
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-semibold text-white/70 mb-1.5">Correo</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="admin@buqui.app"
              required
              className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-blue-400/60 border border-white/10 bg-white/10 backdrop-blur-sm"
            />
          </div>

          <div className="mb-7">
            <label className="block text-sm font-semibold text-white/70 mb-1.5">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-blue-400/60 border border-white/10 bg-white/10 backdrop-blur-sm"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl text-white font-bold text-sm transition-all disabled:opacity-60 shadow-lg shadow-blue-900/50 hover:shadow-blue-800/60 hover:scale-[1.01] active:scale-[0.99]"
            style={{ background: 'linear-gradient(135deg,#3B82F6,#1D4ED8)' }}
          >
            {loading ? 'Ingresando...' : 'Ingresar al panel'}
          </button>
        </form>

        <p className="text-center text-white/30 text-xs mt-6">© 2025 Buqui · Acceso restringido</p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
