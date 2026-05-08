'use client';

export type ChartDay = { day: string; label: string; count: number };

export default function BookingsChart({ data }: { data: ChartDay[] }) {
  const max = Math.max(...data.map(d => d.count), 1);
  const total = data.reduce((s, d) => s + d.count, 0);
  const todayCount = data[data.length - 1]?.count ?? 0;

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Reservas — últimos 7 días</p>
          <p className="text-3xl font-bold text-gray-900 mt-1 tracking-tight">{total}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {todayCount > 0 ? `${todayCount} hoy` : 'Sin reservas hoy'}
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm bg-blue-500" />
            <span className="text-gray-400">Hoy</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm bg-blue-100" />
            <span className="text-gray-400">Días anteriores</span>
          </div>
        </div>
      </div>

      <div className="flex items-end gap-2" style={{ height: 96 }}>
        {data.map((d, i) => {
          const isToday = i === data.length - 1;
          const heightPct = d.count === 0 ? 3 : Math.max((d.count / max) * 100, 8);
          return (
            <div key={d.day} className="flex-1 flex flex-col items-center justify-end gap-1 group h-full">
              <span className="text-xs font-semibold text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity">
                {d.count}
              </span>
              <div className="w-full flex items-end" style={{ height: 72 }}>
                <div
                  className={`w-full rounded-t-md transition-all duration-300 ${
                    isToday
                      ? 'bg-blue-500 shadow-sm shadow-blue-200'
                      : 'bg-blue-100 group-hover:bg-blue-200'
                  }`}
                  style={{ height: `${heightPct}%` }}
                />
              </div>
              <span className={`text-xs ${isToday ? 'font-bold text-blue-600' : 'text-gray-400'}`}>
                {d.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
