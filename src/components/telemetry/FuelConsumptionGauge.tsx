import { cn } from '@/lib/utils';
import { Fuel, TrendingUp, TrendingDown } from 'lucide-react';

interface FuelConsumptionGaugeProps {
  consumption: number; // km/l
  target?: number;
  trend?: number; // percentual de variação
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function FuelConsumptionGauge({ 
  consumption, 
  target = 2.5,
  trend,
  size = 'md',
  className 
}: FuelConsumptionGaugeProps) {
  const percentage = Math.min((consumption / (target * 1.5)) * 100, 100);
  const isAboveTarget = consumption >= target;
  const efficiency = ((consumption / target) * 100).toFixed(0);
  
  const sizeClasses = {
    sm: { container: 'w-24', text: 'text-lg', label: 'text-xs', icon: 'h-4 w-4' },
    md: { container: 'w-32', text: 'text-2xl', label: 'text-sm', icon: 'h-5 w-5' },
    lg: { container: 'w-48', text: 'text-4xl', label: 'text-base', icon: 'h-6 w-6' },
  };

  const getColor = () => {
    if (consumption < target * 0.7) return { bg: 'bg-destructive', text: 'text-destructive' };
    if (consumption < target * 0.9) return { bg: 'bg-warning', text: 'text-warning' };
    if (consumption >= target) return { bg: 'bg-success', text: 'text-success' };
    return { bg: 'bg-amber-500', text: 'text-amber-500' };
  };

  const colors = getColor();

  return (
    <div className={cn("flex flex-col items-center gap-3", sizeClasses[size].container, className)}>
      <div className="flex items-center gap-2">
        <Fuel className={cn(sizeClasses[size].icon, colors.text)} />
        <span className={cn("font-medium", sizeClasses[size].label)}>Consumo</span>
      </div>
      
      {/* Barra de progresso */}
      <div className="w-full h-3 rounded-full bg-muted/30 overflow-hidden">
        <div 
          className={cn("h-full rounded-full transition-all duration-500", colors.bg)}
          style={{ width: `${percentage}%` }}
        />
      </div>
      
      {/* Valor principal */}
      <div className="text-center">
        <span className={cn("font-bold", sizeClasses[size].text, colors.text)}>
          {consumption.toFixed(2)}
        </span>
        <span className={cn("ml-1", sizeClasses[size].label, "text-muted-foreground")}>
          km/l
        </span>
      </div>
      
      {/* Meta e eficiência */}
      <div className="flex items-center gap-2 text-xs">
        <span className="text-muted-foreground">Meta: {target} km/l</span>
        <span className={cn("font-medium", colors.text)}>
          ({efficiency}%)
        </span>
      </div>
      
      {/* Tendência */}
      {trend !== undefined && (
        <div className={cn(
          "flex items-center gap-1 text-xs px-2 py-1 rounded-full",
          trend > 0 ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive"
        )}>
          {trend > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {Math.abs(trend).toFixed(1)}%
        </div>
      )}
    </div>
  );
}

interface FuelSummaryProps {
  totalDistance: number;
  totalFuel: number;
  avgConsumption: number;
  target?: number;
  className?: string;
}

export function FuelSummary({ 
  totalDistance, 
  totalFuel, 
  avgConsumption,
  target = 2.5,
  className 
}: FuelSummaryProps) {
  const efficiency = ((avgConsumption / target) * 100).toFixed(0);
  const isEfficient = avgConsumption >= target;
  const costSaved = isEfficient 
    ? ((avgConsumption - target) * totalFuel / avgConsumption * 6.5).toFixed(2) // R$6.50 por litro
    : 0;

  return (
    <div className={cn("grid grid-cols-2 md:grid-cols-4 gap-4", className)}>
      <div className="text-center p-4 rounded-lg bg-muted/30">
        <div className="text-2xl font-bold">{totalDistance.toFixed(0)}</div>
        <div className="text-sm text-muted-foreground">km rodados</div>
      </div>
      
      <div className="text-center p-4 rounded-lg bg-muted/30">
        <div className="text-2xl font-bold">{totalFuel.toFixed(0)}</div>
        <div className="text-sm text-muted-foreground">litros</div>
      </div>
      
      <div className={cn(
        "text-center p-4 rounded-lg",
        isEfficient ? "bg-success/20" : "bg-warning/20"
      )}>
        <div className={cn(
          "text-2xl font-bold",
          isEfficient ? "text-success" : "text-warning"
        )}>
          {avgConsumption.toFixed(2)}
        </div>
        <div className="text-sm text-muted-foreground">km/l média</div>
      </div>
      
      <div className="text-center p-4 rounded-lg bg-muted/30">
        <div className={cn(
          "text-2xl font-bold",
          isEfficient ? "text-success" : "text-muted-foreground"
        )}>
          {efficiency}%
        </div>
        <div className="text-sm text-muted-foreground">eficiência</div>
      </div>
    </div>
  );
}
