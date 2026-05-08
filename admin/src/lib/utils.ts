export function fmtDate(str: string): string {
  const d = str.includes('T') ? new Date(str) : new Date(str + 'T12:00:00');
  return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function fmtTime(str: string): string {
  return str.slice(0, 5);
}
