interface BarChartProps {
  data: { label: string; value: number; color?: string }[];
  maxValue?: number;
}

export default function BarChart({ data, maxValue }: BarChartProps) {
  const max = maxValue || Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="flex items-end gap-2 h-32">
      {data.map((item, index) => (
        <div key={index} className="flex-1 flex flex-col items-center gap-1">
          <span className="text-xs font-medium text-surface-600">{item.value}</span>
          <div
            className={`w-full rounded-t-md transition-all duration-500 ${item.color || 'bg-brand-500'}`}
            style={{ height: `${(item.value / max) * 100}%`, minHeight: item.value > 0 ? '8px' : '2px' }}
          />
          <span className="text-xs text-surface-500 text-center leading-tight">{item.label}</span>
        </div>
      ))}
    </div>
  );
}
