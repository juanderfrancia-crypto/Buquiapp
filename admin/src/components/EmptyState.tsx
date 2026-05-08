import { type ComponentType } from 'react';

interface EmptyStateProps {
  colSpan: number;
  title: string;
  description?: string;
  Icon: ComponentType<{ className?: string }>;
}

export default function EmptyState({ colSpan, title, description, Icon }: EmptyStateProps) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-6 py-20 text-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center">
            <Icon className="w-6 h-6 text-gray-300" />
          </div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          {description && <p className="text-xs text-gray-400">{description}</p>}
        </div>
      </td>
    </tr>
  );
}
