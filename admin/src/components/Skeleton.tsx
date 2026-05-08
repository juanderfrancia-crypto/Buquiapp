export function SkeletonTable({ rows = 6, cols }: { rows?: number; cols: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i}>
          {Array.from({ length: cols }).map((_, j) => (
            <td key={j} className="px-6 py-4">
              <div className="h-3.5 bg-gray-100 rounded-full animate-pulse" style={{ width: `${60 + ((i + j) % 3) * 15}%` }} />
              {j === 0 && (
                <div className="h-2.5 bg-gray-100 rounded-full animate-pulse mt-2" style={{ width: '45%' }} />
              )}
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
