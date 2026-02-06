import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useVehicleTelemetry } from '@/hooks/useTelemetry';
import { useVehicles } from '@/hooks/useVehicles';
import { SpeedGauge } from './SpeedGauge';
import { Gauge, AlertTriangle, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LiveSpeedometersProps {
  limit?: number;
  showOnlyMoving?: boolean;
}

export function LiveSpeedometers({ limit = 12, showOnlyMoving = false }: LiveSpeedometersProps) {
  const { data: telemetry } = useVehicleTelemetry();
  const { data: vehicles } = useVehicles();

  const displayVehicles = useMemo(() => {
    if (!telemetry) return [];

    let filtered = [...telemetry];

    if (showOnlyMoving) {
      filtered = filtered.filter((t) => t.speed > 0);
    }

    return filtered
      .sort((a, b) => b.speed - a.speed)
      .slice(0, limit)
      .map((t) => {
        const vehicle = vehicles?.find((v) => v.id === t.vehicle_id);
        return {
          ...t,
          model: vehicle?.model,
          brand: vehicle?.brand,
          speedLimit: 80, // Default speed limit
        };
      });
  }, [telemetry, vehicles, limit, showOnlyMoving]);

  const stats = useMemo(() => {
    if (!telemetry) return { moving: 0, speeding: 0, idle: 0, off: 0 };

    return {
      moving: telemetry.filter((t) => t.speed > 0).length,
      speeding: telemetry.filter((t) => t.speed > 80).length,
      idle: telemetry.filter((t) => t.ignition_on && t.speed === 0).length,
      off: telemetry.filter((t) => !t.ignition_on).length,
    };
  }, [telemetry]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Gauge className="h-5 w-5 text-primary" />
              Velocímetros em Tempo Real
            </CardTitle>
            <CardDescription>
              Velocidade atual baseada na tag &lt;vel&gt; da TrucksControl
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Badge variant="outline" className="flex items-center gap-1">
              <Activity className="h-3 w-3 text-success" />
              {stats.moving} em movimento
            </Badge>
            {stats.speeding > 0 && (
              <Badge variant="destructive" className="flex items-center gap-1 animate-pulse">
                <AlertTriangle className="h-3 w-3" />
                {stats.speeding} acima do limite
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Stats bar */}
        <div className="grid grid-cols-4 gap-2 mb-6">
          <div className="p-3 rounded-lg bg-success/10 text-center">
            <p className="text-2xl font-bold text-success">{stats.moving}</p>
            <p className="text-xs text-muted-foreground">Em Movimento</p>
          </div>
          <div className="p-3 rounded-lg bg-destructive/10 text-center">
            <p className="text-2xl font-bold text-destructive">{stats.speeding}</p>
            <p className="text-xs text-muted-foreground">Excesso</p>
          </div>
          <div className="p-3 rounded-lg bg-warning/10 text-center">
            <p className="text-2xl font-bold text-warning">{stats.idle}</p>
            <p className="text-xs text-muted-foreground">Ocioso</p>
          </div>
          <div className="p-3 rounded-lg bg-muted text-center">
            <p className="text-2xl font-bold text-muted-foreground">{stats.off}</p>
            <p className="text-xs text-muted-foreground">Desligado</p>
          </div>
        </div>

        {/* Speedometers Grid */}
        {displayVehicles.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {displayVehicles.map((vehicle) => (
              <div
                key={vehicle.id}
                className={cn(
                  'p-4 rounded-xl border text-center transition-all',
                  vehicle.speed > 80 && 'border-destructive bg-destructive/5 animate-pulse',
                  vehicle.speed > 0 && vehicle.speed <= 80 && 'border-success/50 bg-success/5',
                  vehicle.speed === 0 && vehicle.ignition_on && 'border-warning/50 bg-warning/5',
                  vehicle.speed === 0 && !vehicle.ignition_on && 'border-muted bg-muted/30'
                )}
              >
                <p className="text-sm font-medium mb-2 truncate">{vehicle.vehicle_plate}</p>
                <SpeedGauge value={vehicle.speed} size="sm" limit={80} />
                <div className="mt-2 space-y-1">
                  <Badge
                    variant={
                      vehicle.speed > 80
                        ? 'destructive'
                        : vehicle.speed > 0
                        ? 'default'
                        : 'secondary'
                    }
                    className="text-xs"
                  >
                    {vehicle.speed} km/h
                  </Badge>
                  {vehicle.speed > 80 && (
                    <div className="flex items-center justify-center gap-1 text-destructive text-xs">
                      <AlertTriangle className="h-3 w-3" />
                      +{vehicle.speed - 80} km/h
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <Gauge className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum veículo com telemetria disponível</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
