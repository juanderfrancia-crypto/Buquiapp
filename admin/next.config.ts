import type { NextConfig } from "next";

const securityHeaders = [
  // Previene clickjacking (la app no se puede incrustar en un iframe)
  { key: 'X-Frame-Options', value: 'DENY' },
  // Previene MIME-type sniffing
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Solo envía referrer al mismo origen
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Fuerza HTTPS por 1 año (solo activo en producción)
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
  // Desactiva funciones sensibles del navegador
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  },
  // Content Security Policy
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      // Next.js necesita unsafe-inline e unsafe-eval para hydration
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      // Imágenes: mismo origen, data URIs y Supabase Storage
      "img-src 'self' data: blob: https://*.supabase.co",
      // Conexiones: mismo origen + Supabase (REST y Realtime)
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
      "font-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      // Bloquea ser embebido en frames desde cualquier origen
      "frame-ancestors 'none'",
    ].join('; '),
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
