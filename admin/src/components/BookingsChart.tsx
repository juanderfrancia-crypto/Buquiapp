'use client';

export type ChartDay = { day: string; label: string; count: number };

export default function BookingsChart({ data }: { data: ChartDay[] }) {
  const max = Math.max(...data.map(d => d.count), 1);
  const total = data.reduce((s, d) => s + d.count, 0);
  const todayCount = data[data.length - 1]?.count ?? 0;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow duration-200">
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Reservas · 7 días</p>
          <p className="text-4xl font-black text-gray-900 mt-1 tracking-tight">{total}</p>
          <p className={`text-xs mt-1 font-semibold ${todayCount > 0 ? 'text-blue-500' : 'text-gray-400'}`}>
            {todayCount > 0 ? `+${todayCount} hoy` : 'Sin reservas hoy'}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ background: 'linear-gradient(135deg,#3B82F6,#1D4ED8)' }} />
            <span className="text-gray-400">Hoy</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm bg-blue-100" />
            <span className="text-gray-400">Anteriores</span>
          </div>
        </div>
      </div>

      <div className="flex items-end gap-2" style={{ height: 120 }}>
        {data.map((d, i) => {
          const isToday = i === data.length - 1;
          const heightPct = d.count === 0 ? 2 : Math.max((d.count / max) * 100, 6);
          return (
            <div key={d.day} className="flex-1 flex flex-col items-center justify-end gap-1.5 group h-full">
              <span className="text-xs font-bold text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white px-1.5 py-0.5 rounded-md text-[10px]">
                {d.count}
              </span>
              <div className="w-full flex items-end" style={{ height: 88 }}>
                <div
                  className={`w-full rounded-t-lg transition-all duration-500 ease-out ${
                    isToday ? 'shadow-lg shadow-blue-300/50' : 'group-hover:brightness-90'
                  }`}
                  style={{
                    height: `${heightPct}%`,
                    background: isToday
                      ? 'linear-gradient(180deg,#60A5FA 0%,#1D4ED8 100%)'
                      : 'linear-gradient(180deg,#BFDBFE 0%,#93C5FD 100%)',
                  }}
                />
              </div>
              <span className={`text-[11px] font-semibold ${isToday ? 'text-blue-600' : 'text-gray-400'}`}>
                {d.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
