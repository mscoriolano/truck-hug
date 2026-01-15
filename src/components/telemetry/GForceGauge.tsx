import { cn } from '@/lib/utils';

interface GForceGaugeProps {
  value: number;
  max?: number;
  threshold?: number;
  label: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function GForceGauge({ 
  value, 
  max = 1, 
  threshold = 0.4, 
  label,
  size = 'md',
  className 
}: GForceGaugeProps) {
  const absValue = Math.abs(value);
  const percentage = Math.min((absValue / max) * 100, 100);
  const thresholdPercentage = (threshold / max) * 100;
  
  const isOverThreshold = absValue > threshold;
  const isCritical = absValue > threshold * 1.5;
  
  const sizeClasses = {
    sm: { height: 'h-20', text: 'text-sm', label: 'text-xs' },
    md: { height: 'h-32', text: 'text-lg', label: 'text-sm' },
    lg: { height: 'h-48', text: 'text-2xl', label: 'text-base' },
  };

  const getColor = () => {
    if (absValue < 0.1) return 'bg-muted';
    if (isCritical) return 'bg-destructive';
    if (isOverThreshold) return 'bg-warning';
    return 'bg-success';
  };

  const getTextColor = () => {
    if (absValue < 0.1) return 'text-muted-foreground';
    if (isCritical) return 'text-destructive';
    if (isOverThreshold) return 'text-warning';
    return 'text-success';
  };

  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <span className={cn("font-medium text-center", sizeClasses[size].label)}>
        {label}
      </span>
      
      <div className={cn(
        "relative w-8 rounded-full overflow-hidden bg-muted/30",
        sizeClasses[size].height
      )}>
        {/* Threshold line */}
        <div 
          className="absolute left-0 right-0 h-0.5 bg-warning z-10"
          style={{ bottom: `${thresholdPercentage}%` }}
        />
        
        {/* Value bar */}
        <div 
          className={cn(
            "absolute bottom-0 left-0 right-0 rounded-full transition-all duration-300",
            getColor()
          )}
          style={{ height: `${percentage}%` }}
        />
      </div>
      
      <span className={cn("font-bold", sizeClasses[size].text, getTextColor())}>
        {absValue.toFixed(2)}g
      </span>
    </div>
  );
}

interface GForceDisplayProps {
  x: number;
  y: number;
  z?: number;
  thresholds?: {
    brake: number;
    accel: number;
    turn: number;
  };
  showDetails?: boolean;
  className?: string;
}

export function GForceDisplay({ 
  x, 
  y, 
  z = 0,
  thresholds = { brake: 0.4, accel: 0.35, turn: 0.3 },
  showDetails = true,
  className 
}: GForceDisplayProps) {
  // x = lateral (curva), y = longitudinal (frenagem/aceleração)
  const totalG = Math.sqrt(x * x + y * y);
  const isBraking = y < -thresholds.brake;
  const isAccelerating = y > thresholds.accel;
  const isTurning = Math.abs(x) > thresholds.turn;
  
  const getOverallStatus = () => {
    if (totalG > 0.6) return { label: 'Crítico', color: 'text-destructive' };
    if (totalG > 0.4) return { label: 'Alerta', color: 'text-warning' };
    if (totalG > 0.2) return { label: 'Moderado', color: 'text-amber-500' };
    return { label: 'Normal', color: 'text-success' };
  };

  const status = getOverallStatus();
  
  // Calcular posição do ponto no gráfico polar
  const centerX = 50;
  const centerY = 50;
  const maxRadius = 40;
  const pointX = centerX + (x / 1) * maxRadius;
  const pointY = centerY - (y / 1) * maxRadius;

  return (
    <div className={cn("flex flex-col items-center gap-4", className)}>
      {/* Gráfico polar de Força G */}
      <div className="relative">
        <svg width="140" height="140" viewBox="0 0 100 100">
          {/* Círculos de referência */}
          <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-muted/50" />
          <circle cx="50" cy="50" r="30" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-muted/50" />
          <circle cx="50" cy="50" r="20" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-muted/50" />
          <circle cx="50" cy="50" r="10" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-muted/50" />
          
          {/* Linhas de eixo */}
          <line x1="50" y1="10" x2="50" y2="90" stroke="currentColor" strokeWidth="0.5" className="text-muted/30" />
          <line x1="10" y1="50" x2="90" y2="50" stroke="currentColor" strokeWidth="0.5" className="text-muted/30" />
          
          {/* Zona de alerta */}
          <circle 
            cx="50" 
            cy="50" 
            r={thresholds.brake * maxRadius} 
            fill="none" 
            stroke="#f59e0b" 
            strokeWidth="1" 
            strokeDasharray="4 2"
            className="opacity-50"
          />
          
          {/* Ponto atual */}
          <circle 
            cx={pointX} 
            cy={pointY} 
            r="5" 
            fill={totalG > 0.4 ? '#ef4444' : totalG > 0.2 ? '#f59e0b' : '#22c55e'}
            className="transition-all duration-150"
          />
          
          {/* Linha do centro ao ponto */}
          <line 
            x1="50" 
            y1="50" 
            x2={pointX} 
            y2={pointY} 
            stroke={totalG > 0.4 ? '#ef4444' : totalG > 0.2 ? '#f59e0b' : '#22c55e'}
            strokeWidth="2"
            className="transition-all duration-150"
          />
          
          {/* Labels */}
          <text x="50" y="5" textAnchor="middle" className="text-[6px] fill-muted-foreground">ACEL</text>
          <text x="50" y="98" textAnchor="middle" className="text-[6px] fill-muted-foreground">FREIA</text>
          <text x="5" y="52" textAnchor="middle" className="text-[6px] fill-muted-foreground">ESQ</text>
          <text x="95" y="52" textAnchor="middle" className="text-[6px] fill-muted-foreground">DIR</text>
        </svg>
      </div>
      
      {/* Valor total */}
      <div className="text-center">
        <div className={cn("text-3xl font-bold", status.color)}>
          {totalG.toFixed(2)}g
        </div>
        <div className={cn("text-sm", status.color)}>
          {status.label}
        </div>
      </div>
      
      {showDetails && (
        <div className="flex gap-4 text-sm">
          <div className="text-center">
            <div className="text-muted-foreground">Lateral</div>
            <div className={cn("font-medium", Math.abs(x) > thresholds.turn ? 'text-warning' : 'text-foreground')}>
              {x.toFixed(2)}g
            </div>
          </div>
          <div className="text-center">
            <div className="text-muted-foreground">Long.</div>
            <div className={cn("font-medium", Math.abs(y) > thresholds.brake ? 'text-warning' : 'text-foreground')}>
              {y.toFixed(2)}g
            </div>
          </div>
          {z !== 0 && (
            <div className="text-center">
              <div className="text-muted-foreground">Vert.</div>
              <div className="font-medium">{z.toFixed(2)}g</div>
            </div>
          )}
        </div>
      )}
      
      {/* Eventos detectados */}
      {(isBraking || isAccelerating || isTurning) && (
        <div className="flex flex-wrap gap-2 justify-center">
          {isBraking && (
            <span className="text-xs px-2 py-1 bg-destructive/20 text-destructive rounded-full">
              Frenagem Brusca
            </span>
          )}
          {isAccelerating && (
            <span className="text-xs px-2 py-1 bg-warning/20 text-warning rounded-full">
              Aceleração Brusca
            </span>
          )}
          {isTurning && (
            <span className="text-xs px-2 py-1 bg-amber-500/20 text-amber-600 rounded-full">
              Curva Agressiva
            </span>
          )}
        </div>
      )}
    </div>
  );
}
