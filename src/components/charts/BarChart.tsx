"use client";

interface BarChartProps {
  data: { label: string; value: number }[];
  color?: string;
}

export default function BarChart({ data, color = "#3b82f6" }: BarChartProps) {
  if (data.length === 0) return <p className="text-sm text-slate-400 text-center py-4">No data</p>;

  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const barWidth = 36;
  const gap = 8;
  const topPad = 20;
  const bottomPad = 60;
  const chartHeight = 200;
  const width = Math.max(data.length * (barWidth + gap) + gap, 200);
  const height = chartHeight + topPad + bottomPad;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full overflow-x-auto">
      {data.map((item, i) => {
        const barH = (item.value / maxValue) * chartHeight;
        const x = gap + i * (barWidth + gap);
        const y = topPad + chartHeight - barH;
        return (
          <g key={i}>
            <rect
              x={x}
              y={y}
              width={barWidth}
              height={barH}
              rx={3}
              fill={color}
              opacity={0.8}
            />
            <text
              x={x + barWidth / 2}
              y={y - 4}
              textAnchor="middle"
              className="fill-slate-600"
              fontSize={10}
            >
              {item.value}
            </text>
            <text
              x={x + barWidth / 2}
              y={topPad + chartHeight + 14}
              textAnchor="middle"
              className="fill-slate-500"
              fontSize={9}
              transform={`rotate(45, ${x + barWidth / 2}, ${topPad + chartHeight + 14})`}
            >
              {item.label.length > 8 ? item.label.slice(0, 8) + "…" : item.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
