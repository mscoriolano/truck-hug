import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useVehicleTelemetry } from '@/hooks/useTelemetry';
import { useVehicles } from '@/hooks/useVehicles';
import { Timer, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface IdleVehicle {
  vehicle_id: string;
  vehicle_plate: string;
  model?: string;
  idleMinutes: number;
  ignition_on: boolean;
  speed: number;
}

export function IdleTimeChart() {
  const { data: telemetry } = useVehicleTelemetry();
  const { data: vehicles } = useVehicles();

  // Calculate idle vehicles: ignition ON + speed = 0
  const idleVehicles = useMemo<IdleVehicle[]>(() => {
    if (!telemetry) return [];

    return telemetry
      .filter((t) => t.ignition_on && t.speed === 0)
      .map((t) => {
        const vehicle = vehicles?.find((v) => v.id === t.vehicle_id);
        // Calculate idle time based on received_at
        const receivedAt = new Date(t.received_at);
        const now = new Date();
        const idleMinutes = Math.floor((now.getTime() - receivedAt.getTime()) / 60000);

        return {
          vehicle_id: t.vehicle_id,
          vehicle_plate: t.vehicle_plate,
          model: vehicle?.model,
          idleMinutes: Math.max(idleMinutes, 1),
          ignition_on: t.ignition_on,
          speed: t.speed,
        };
      })
      .sort((a, b) => b.idleMinutes - a.idleMinutes);
  }, [telemetry, vehicles]);

  const getIdleSeverity = (minutes: number) => {
    if (minutes >= 30) return { label: 'Crítico', color: 'bg-destructive text-destructive-foreground' };
    if (minutes >= 15) return { label: 'Alto', color: 'bg-warning text-warning-foreground' };
    if (minutes >= 5) return { label: 'Médio', color: 'bg-amber-500 text-white' };
    return { label: 'Baixo', color: 'bg-muted text-muted-foreground' };
  };

  const totalIdleTime = idleVehicles.reduce((acc, v) => acc + v.idleMinutes, 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Timer className="h-5 w-5 text-amber-500" />
              Motor Ocioso
            </CardTitle>
            <CardDescription>
              Veículos com ignição ligada e velocidade zero
            </CardDescription>
          </div>
          <Badge variant="secondary" className="text-lg px-4">
            {idleVehicles.length} veículos
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 rounded-lg bg-muted/50 text-center">
            <p className="text-3xl font-bold text-foreground">{idleVehicles.length}</p>
            <p className="text-sm text-muted-foreground">Ociosos Agora</p>
          </div>
          <div className="p-4 rounded-lg bg-muted/50 text-center">
            <p className="text-3xl font-bold text-foreground">{totalIdleTime}</p>
            <p className="text-sm text-muted-foreground">Minutos Totais</p>
          </div>
          <div className="p-4 rounded-lg bg-muted/50 text-center">
            <p className="text-3xl font-bold text-foreground">
              {idleVehicles.filter((v) => v.idleMinutes >= 15).length}
            </p>
            <p className="text-sm text-muted-foreground">Críticos (15+ min)</p>
          </div>
        </div>

        {/* Vehicle List */}
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {idleVehicles.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Timer className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Nenhum veículo ocioso no momento</p>
            </div>
          ) : (
            idleVehicles.map((vehicle) => {
              const severity = getIdleSeverity(vehicle.idleMinutes);
              return (
                <div
                  key={vehicle.vehicle_id}
                  className={cn(
                    'flex items-center justify-between p-3 rounded-lg border',
                    vehicle.idleMinutes >= 15 && 'border-destructive/50 bg-destructive/5'
                  )}
                >
                  <div className="flex items-center gap-3">
                    {vehicle.idleMinutes >= 15 && (
                      <AlertTriangle className="h-5 w-5 text-destructive animate-pulse" />
                    )}
                    <div>
                      <p className="font-medium">{vehicle.vehicle_plate}</p>
                      {vehicle.model && (
                        <p className="text-sm text-muted-foreground">{vehicle.model}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={severity.color}>{severity.label}</Badge>
                    <span className="text-lg font-bold">{vehicle.idleMinutes} min</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
