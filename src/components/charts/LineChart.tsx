"use client";

interface LineChartProps {
  data: [string, number][];
  color?: string;
}

export default function LineChart({ data, color = "#3b82f6" }: LineChartProps) {
  if (data.length === 0) return <p className="text-sm text-slate-400 text-center py-4">No data</p>;

  const values = data.map(([, v]) => v);
  const maxValue = Math.max(...values, 1);
  const leftPad = 40;
  const rightPad = 20;
  const topPad = 20;
  const bottomPad = 50;
  const chartWidth = Math.max(data.length * 60, 300);
  const chartHeight = 180;
  const width = chartWidth + leftPad + rightPad;
  const height = chartHeight + topPad + bottomPad;

  const xStep = data.length > 1 ? chartWidth / (data.length - 1) : chartWidth / 2;

  const points = data.map(([, v], i) => {
    const x = leftPad + i * xStep;
    const y = topPad + chartHeight - (v / maxValue) * chartHeight;
    return { x, y, v };
  });

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${topPad + chartHeight} L ${points[0].x} ${topPad + chartHeight} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
        const y = topPad + chartHeight - pct * chartHeight;
        return (
          <g key={pct}>
            <line x1={leftPad} y1={y} x2={leftPad + chartWidth} y2={y} stroke="#e2e8f0" strokeWidth={1} />
            <text x={leftPad - 6} y={y + 4} textAnchor="end" fontSize={9} className="fill-slate-400">
              {Math.round(maxValue * pct)}
            </text>
          </g>
        );
      })}

      {/* Area fill */}
      <path d={areaPath} fill={color} opacity={0.1} />

      {/* Line */}
      <path d={linePath} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" />

      {/* Points and labels */}
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r={3} fill={color} />
          <text
            x={p.x}
            y={topPad + chartHeight + 16}
            textAnchor="middle"
            fontSize={9}
            className="fill-slate-500"
          >
            {data[i][0].slice(5)}
          </text>
        </g>
      ))}
    </svg>
  );
}
