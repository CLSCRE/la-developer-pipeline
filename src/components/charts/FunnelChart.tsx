"use client";

interface FunnelChartProps {
  data: { label: string; value: number; color: string }[];
}

export default function FunnelChart({ data }: FunnelChartProps) {
  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const barHeight = 40;
  const gap = 8;
  const leftPad = 120;
  const width = 500;
  const height = data.length * (barHeight + gap) - gap;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full max-w-xl">
      {data.map((item, i) => {
        const barWidth = (item.value / maxValue) * (width - leftPad - 60);
        const y = i * (barHeight + gap);
        return (
          <g key={item.label}>
            <text
              x={leftPad - 8}
              y={y + barHeight / 2 + 5}
              textAnchor="end"
              className="fill-slate-600 text-xs"
              fontSize={12}
            >
              {item.label}
            </text>
            <rect
              x={leftPad}
              y={y}
              width={Math.max(barWidth, 2)}
              height={barHeight}
              rx={4}
              fill={item.color}
              opacity={0.85}
            />
            <text
              x={leftPad + barWidth + 8}
              y={y + barHeight / 2 + 5}
              className="fill-slate-700 text-xs font-medium"
              fontSize={12}
            >
              {item.value}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
