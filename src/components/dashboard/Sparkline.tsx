import { useMemo } from 'react';

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  showGradient?: boolean;
  className?: string;
}

export function Sparkline({ 
  data, 
  width = 80, 
  height = 32, 
  color = 'hsl(var(--primary))',
  showGradient = true,
  className = '' 
}: SparklineProps) {
  const path = useMemo(() => {
    if (!data.length) return '';
    
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    
    const stepX = width / (data.length - 1);
    const padding = 2;
    const availableHeight = height - padding * 2;
    
    const points = data.map((value, index) => {
      const x = index * stepX;
      const y = padding + availableHeight - ((value - min) / range) * availableHeight;
      return `${x},${y}`;
    });
    
    return `M${points.join(' L')}`;
  }, [data, width, height]);

  const areaPath = useMemo(() => {
    if (!data.length) return '';
    return `${path} L${width},${height} L0,${height} Z`;
  }, [path, width, height, data.length]);

  const gradientId = useMemo(() => `sparkline-gradient-${Math.random().toString(36).slice(2)}`, []);

  if (!data.length) return null;

  return (
    <svg 
      width={width} 
      height={height} 
      className={`overflow-visible ${className}`}
      viewBox={`0 0 ${width} ${height}`}
    >
      {showGradient && (
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
      )}
      
      {showGradient && (
        <path
          d={areaPath}
          fill={`url(#${gradientId})`}
        />
      )}
      
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      
      {/* End point dot */}
      {data.length > 0 && (
        <circle
          cx={width}
          cy={(() => {
            const min = Math.min(...data);
            const max = Math.max(...data);
            const range = max - min || 1;
            const padding = 2;
            const availableHeight = height - padding * 2;
            return padding + availableHeight - ((data[data.length - 1] - min) / range) * availableHeight;
          })()}
          r="3"
          fill={color}
        />
      )}
    </svg>
  );
}
