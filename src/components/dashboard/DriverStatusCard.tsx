import { Driver } from '@/types/fleet';
import { cn } from '@/lib/utils';
import { Clock, MapPin, Truck, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface DriverStatusCardProps {
  driver: Driver;
}

const statusConfig = {
  available: { label: 'Disponível', color: 'bg-success text-success-foreground' },
  driving: { label: 'Dirigindo', color: 'bg-primary text-primary-foreground' },
  resting: { label: 'Descansando', color: 'bg-warning text-warning-foreground' },
  off: { label: 'Folga', color: 'bg-muted text-muted-foreground' },
};

export function DriverStatusCard({ driver }: DriverStatusCardProps) {
  const status = statusConfig[driver.status];
  
  const formatHours = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h${m > 0 ? ` ${m}min` : ''}`;
  };

  const remainingHours = 8 - driver.totalHoursToday;
  const progressPercent = (driver.totalHoursToday / 8) * 100;

  return (
    <div className="relative overflow-hidden rounded-xl bg-card border border-border p-4 transition-all duration-300 hover:shadow-card hover:-translate-y-0.5">
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className="relative">
          <div className="w-12 h-12 rounded-full bg-gradient-primary flex items-center justify-center">
            <User className="w-6 h-6 text-primary-foreground" />
          </div>
          <div className={cn(
            "absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-card",
            driver.status === 'driving' && "bg-primary animate-pulse",
            driver.status === 'available' && "bg-success",
            driver.status === 'resting' && "bg-warning",
            driver.status === 'off' && "bg-muted",
          )} />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-foreground truncate">{driver.name}</h3>
            <Badge className={cn("text-xs", status.color)}>
              {status.label}
            </Badge>
          </div>
          
          {driver.currentVehicle && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
              <Truck className="w-3.5 h-3.5" />
              <span>{driver.currentVehicle}</span>
            </div>
          )}

          {/* Journey Progress */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Jornada hoje</span>
              <span className="font-medium text-foreground">
                {formatHours(driver.totalHoursToday)} / 8h
              </span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div 
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  progressPercent >= 90 ? "bg-destructive" :
                  progressPercent >= 70 ? "bg-warning" : "bg-primary"
                )}
                style={{ width: `${Math.min(progressPercent, 100)}%` }}
              />
            </div>
            {remainingHours > 0 && driver.status !== 'off' && (
              <p className="text-xs text-muted-foreground">
                Restam {formatHours(remainingHours)}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
