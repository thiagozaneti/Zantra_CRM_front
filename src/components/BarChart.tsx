interface BarChartProps {
  data: { label: string; value: number; color?: string }[];
  maxValue?: number;
}

export default function BarChart({ data, maxValue }: BarChartProps) {
  const max = maxValue || Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="flex h-24 items-end gap-2 border-b border-surface-100">
      {data.map((item, index) => (
        <div key={index} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1">
          <span className="text-[10px] font-medium tabular-nums text-surface-500">{item.value}</span>
          <div
            className={`w-full max-w-16 rounded-t-sm transition-all duration-500 ${item.color || 'bg-brand-500'}`}
            style={{ height: `${Math.min(68, (item.value / max) * 68)}px`, minHeight: item.value > 0 ? '5px' : '1px' }}
          />
          <span className="max-w-full truncate text-center text-[10px] leading-tight text-surface-400">{item.label}</span>
        </div>
      ))}
    </div>
  );
}
