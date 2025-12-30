import { Tire } from '@/types/fleet';
import { cn } from '@/lib/utils';
import { CircleDot, Truck, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface TireStatusCardProps {
  tire: Tire;
}

const statusConfig = {
  good: { label: 'Bom', color: 'bg-success/20 text-success border-success/30' },
  warning: { label: 'Atenção', color: 'bg-warning/20 text-warning border-warning/30' },
  critical: { label: 'Crítico', color: 'bg-destructive/20 text-destructive border-destructive/30' },
  replaced: { label: 'Substituído', color: 'bg-muted text-muted-foreground border-muted' },
};

export function TireStatusCard({ tire }: TireStatusCardProps) {
  const status = statusConfig[tire.status];
  const usedMileage = tire.currentMileage - tire.installMileage;
  const totalCapacity = tire.maxMileage - tire.installMileage;
  const usagePercent = (usedMileage / totalCapacity) * 100;
  const remainingMileage = tire.maxMileage - tire.currentMileage;

  return (
    <div className={cn(
      "relative overflow-hidden rounded-xl bg-card border p-4 transition-all duration-300 hover:shadow-card hover:-translate-y-0.5",
      tire.status === 'critical' && "border-destructive/50"
    )}>
      {tire.status === 'critical' && (
        <div className="absolute top-2 right-2">
          <AlertTriangle className="w-5 h-5 text-destructive animate-pulse" />
        </div>
      )}

      <div className="flex items-start gap-3 mb-3">
        <div className={cn(
          "p-2 rounded-lg",
          tire.status === 'good' ? "bg-success/20" :
          tire.status === 'warning' ? "bg-warning/20" : "bg-destructive/20"
        )}>
          <CircleDot className={cn(
            "w-5 h-5",
            tire.status === 'good' ? "text-success" :
            tire.status === 'warning' ? "text-warning" : "text-destructive"
          )} />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-foreground text-sm">{tire.position}</p>
          <p className="text-xs text-muted-foreground">{tire.brand} {tire.model}</p>
        </div>
        <Badge className={cn("text-xs border", status.color)}>
          {status.label}
        </Badge>
      </div>

      <div className="flex items-center gap-1 text-sm text-muted-foreground mb-3">
        <Truck className="w-3.5 h-3.5" />
        <span>{tire.vehiclePlate}</span>
      </div>

      {/* Usage Progress */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Quilometragem</span>
          <span className="font-medium text-foreground">
            {usedMileage.toLocaleString('pt-BR')} / {totalCapacity.toLocaleString('pt-BR')} km
          </span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className={cn(
              "h-full rounded-full transition-all duration-500",
              usagePercent >= 90 ? "bg-destructive" :
              usagePercent >= 70 ? "bg-warning" : "bg-success"
            )}
            style={{ width: `${Math.min(usagePercent, 100)}%` }}
          />
        </div>
        <p className={cn(
          "text-xs",
          remainingMileage <= 0 ? "text-destructive font-medium" : "text-muted-foreground"
        )}>
          {remainingMileage > 0 
            ? `Restam ${remainingMileage.toLocaleString('pt-BR')} km`
            : 'Substituição necessária!'
          }
        </p>
      </div>
    </div>
  );
}
