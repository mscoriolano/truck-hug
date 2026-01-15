import { cn } from '@/lib/utils';

interface SpeedGaugeProps {
  value: number;
  max?: number;
  limit?: number;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  className?: string;
}

export function SpeedGauge({ 
  value, 
  max = 120, 
  limit = 80, 
  size = 'md',
  label,
  className 
}: SpeedGaugeProps) {
  const percentage = Math.min((value / max) * 100, 100);
  const limitPercentage = (limit / max) * 100;
  
  const isOverLimit = value > limit;
  
  const sizeClasses = {
    sm: { container: 'w-24 h-24', text: 'text-lg', label: 'text-xs' },
    md: { container: 'w-32 h-32', text: 'text-2xl', label: 'text-sm' },
    lg: { container: 'w-48 h-48', text: 'text-4xl', label: 'text-base' },
  };

  const getColor = () => {
    if (value === 0) return 'text-muted-foreground';
    if (isOverLimit) return 'text-destructive';
    if (value > limit * 0.8) return 'text-warning';
    return 'text-success';
  };

  const getStrokeColor = () => {
    if (value === 0) return '#6b7280';
    if (isOverLimit) return '#ef4444';
    if (value > limit * 0.8) return '#f59e0b';
    return '#22c55e';
  };

  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference * 0.75; // 270 degrees

  return (
    <div className={cn("relative flex flex-col items-center justify-center", sizeClasses[size].container, className)}>
      <svg className="transform -rotate-135 w-full h-full" viewBox="0 0 100 100">
        {/* Background arc */}
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          strokeDasharray={`${circumference * 0.75} ${circumference * 0.25}`}
          className="text-muted/30"
        />
        
        {/* Limit marker */}
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="#f59e0b"
          strokeWidth="8"
          strokeDasharray={`${(limitPercentage / 100) * circumference * 0.75} ${circumference}`}
          strokeDashoffset={0}
          className="opacity-30"
        />
        
        {/* Value arc */}
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke={getStrokeColor()}
          strokeWidth="8"
          strokeDasharray={`${circumference * 0.75} ${circumference * 0.25}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-500 ease-out"
        />
      </svg>
      
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn("font-bold", sizeClasses[size].text, getColor())}>
          {value}
        </span>
        <span className={cn("text-muted-foreground", sizeClasses[size].label)}>
          {label || 'km/h'}
        </span>
      </div>
    </div>
  );
}
