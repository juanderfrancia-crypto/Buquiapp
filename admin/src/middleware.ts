import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  // Supabase SSR requires building the response before setting cookies
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session — MUST use getUser(), never getSession() in server context
  const { data: { user } } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // /login: si ya es admin, redirigir al dashboard
  if (pathname === '/login') {
    if (user) {
      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();
      if (profile?.role === 'admin') {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    }
    return response;
  }

  // Rutas protegidas: debe haber sesión activa
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Verificar rol admin en base de datos (no confiar solo en metadata del cliente)
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL('/login?error=unauthorized', request.url));
  }

  return response;
}

export const config = {
  matcher: [
    // Aplicar a todas las rutas excepto archivos estáticos y assets
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
