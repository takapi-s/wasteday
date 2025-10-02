import React from 'react';
import type { WeeklyData } from '../../types';

interface WeeklyDailyChartProps {
  weeklyData: WeeklyData;
}

// Weekly Daily Chart component (responsive width support)
export const WeeklyDailyChart: React.FC<WeeklyDailyChartProps> = ({ weeklyData }) => {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = React.useState<number>(600);

  React.useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        const cr = entry.contentRect;
        setContainerWidth(cr.width);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const paddingLeft = 30; // y-axis label margin
  const paddingRight = 10;
  const paddingTop = 10;
  const paddingBottom = 24; // x-axis label margin
  const width = Math.max(320, containerWidth);
  const height = 220;
  const plotWidth = width - paddingLeft - paddingRight;
  const plotHeight = height - paddingTop - paddingBottom;
  const days = weeklyData.dailyBreakdown;
  const maxValue = Math.max(1, ...days.map(d => Math.max(d.wasteSeconds, d.productiveSeconds)));
  const xStep = plotWidth / Math.max(1, days.length - 1);
  const x = (i: number) => paddingLeft + i * xStep;
  const y = (v: number) => paddingTop + (plotHeight - (v / maxValue) * plotHeight);
  const path = (values: number[]) => values.map((v, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(v)}`).join(' ');
  const daysShort = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  const wasteValues = days.map(d => d.wasteSeconds);
  const prodValues  = days.map(d => d.productiveSeconds);

  return (
    <div ref={containerRef} className="absolute inset-0 bg-transparent">
      <svg width={width} height={height} className="bg-transparent">
        {[0,0.25,0.5,0.75,1].map((p, idx) => (
          <line key={idx} x1={paddingLeft} x2={width - paddingRight} y1={paddingTop + plotHeight * p} y2={paddingTop + plotHeight * p} className="stroke-gray-200/60 dark:stroke-white/10" strokeWidth="1" />
        ))}
        {[0,0.5,1].map((p, idx) => (
          <text key={idx} x={paddingLeft - 6} y={paddingTop + plotHeight * (1 - p)} textAnchor="end" dominantBaseline="middle" className="fill-gray-400" style={{ fontSize: 10 }}>
            {Math.round(maxValue * p / 3600)}h
          </text>
        ))}
        <path d={path(prodValues)} stroke="#22c55e" strokeWidth="2" fill="none" />
        <path d={path(wasteValues)} stroke="#ef4444" strokeWidth="2" fill="none" />
        {prodValues.map((v, i) => (
          <circle key={`p-${i}`} cx={x(i)} cy={y(v)} r="3" fill="#22c55e" />
        ))}
        {wasteValues.map((v, i) => (
          <circle key={`w-${i}`} cx={x(i)} cy={y(v)} r="3" fill="#ef4444" />
        ))}
        {days.map((d, i) => (
          <text key={`x-${i}`} x={x(i)} y={height - 6} textAnchor="middle" className="fill-gray-500" style={{ fontSize: 10 }}>
            {daysShort[new Date(d.date).getDay()]}
          </text>
        ))}
      </svg>
    </div>
  );
};
