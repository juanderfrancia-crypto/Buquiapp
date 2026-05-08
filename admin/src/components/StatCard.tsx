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
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${iconBg}`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
        {trend && (
          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${trendUp ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-gray-500'}`}>
            {trend}
          </span>
        )}
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900 tracking-tight">{value}</p>
        <p className="text-sm text-gray-500 mt-0.5">{label}</p>
      </div>
    </div>
  );
}
