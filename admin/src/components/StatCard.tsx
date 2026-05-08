import { type ComponentType } from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  Icon: ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
  trend?: string;
  trendUp?: boolean;
}

export default function StatCard({ label, value, Icon, iconBg, iconColor, trend, trendUp }: StatCardProps) {
  const displayValue = typeof value === 'number' ? value.toLocaleString('es-CO') : value;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 flex flex-col gap-4 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 group">
      <div className="flex items-start justify-between">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${iconBg} shadow-lg`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
        {trend && (
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
            trendUp ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'
          }`}>
            {trend}
          </span>
        )}
      </div>
      <div>
        <p className="text-3xl font-bold text-gray-900 tracking-tight group-hover:text-blue-600 transition-colors">
          {displayValue}
        </p>
        <p className="text-sm text-gray-500 mt-0.5 font-medium">{label}</p>
      </div>
    </div>
  );
}
