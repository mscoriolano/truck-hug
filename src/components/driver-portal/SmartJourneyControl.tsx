import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useGeofenceGuard } from '@/hooks/useGeofencing';
import { useOfflineJourney } from '@/hooks/useOfflineJourney';
import { useAuth } from '@/hooks/useAuth';
import { useVehicles } from '@/hooks/useVehicles';
import { useDrivers } from '@/hooks/useDrivers';
import { 
  Play, 
  Square, 
  Pause, 
  Coffee, 
  MapPin, 
  Wifi, 
  WifiOff, 
  AlertTriangle,
  Loader2,
  RefreshCw,
  CheckCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const eventTypes = [
  { value: 'journey_start', label: 'Início', icon: Play, color: 'bg-success text-success-foreground' },
  { value: 'break_start', label: 'Pausa', icon: Pause, color: 'bg-warning text-warning-foreground' },
  { value: 'break_end', label: 'Voltar', icon: Coffee, color: 'bg-info text-info-foreground' },
  { value: 'journey_end', label: 'Fim', icon: Square, color: 'bg-muted text-muted-foreground' },
];

interface SmartJourneyControlProps {
  vehicleId?: string;
  maxGeofenceDistance?: number;
}

export const SmartJourneyControl: React.FC<SmartJourneyControlProps> = ({
  vehicleId,
  maxGeofenceDistance = 500,
}) => {
  const { user } = useAuth();
  const { data: vehicles = [] } = useVehicles();
  const { data: drivers = [] } = useDrivers();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Find current driver's vehicle
  const currentDriver = drivers.find(d => d.id === user?.id) || drivers[0];
  const assignedVehicle = currentDriver?.current_vehicle 
    ? vehicles.find(v => v.plate === currentDriver.current_vehicle)
    : vehicleId 
      ? vehicles.find(v => v.id === vehicleId)
      : null;

  // Geofencing
  const geofence = useGeofenceGuard(assignedVehicle?.id, maxGeofenceDistance);

  // Offline support
  const offline = useOfflineJourney(user?.id);

  const handleEventClick = async (eventType: string) => {
    setIsSubmitting(true);

    try {
      // For journey_start, validate geofencing
      if (eventType === 'journey_start' && assignedVehicle) {
        const isValidLocation = await geofence.validatePosition();
        if (!isValidLocation) {
          setIsSubmitting(false);
          return;
        }
      }

      // Create event (works offline)
      await offline.createJourneyEvent({
        event_type: eventType,
        vehicle_id: assignedVehicle?.id,
        vehicle_plate: assignedVehicle?.plate,
        latitude: geofence.driverPosition?.latitude,
        longitude: geofence.driverPosition?.longitude,
      });

    } catch (error) {
      console.error('Error creating event:', error);
      toast.error('Erro ao registrar evento');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isJourneyStartDisabled = (eventType: string) => {
    // Only enforce geofencing for journey_start
    if (eventType !== 'journey_start') return false;

    // If geofencing failed with error, show warning but allow
    if (geofence.error) return false;

    // If out of range, disable
    if (!geofence.isWithinRange && geofence.distance < Infinity) return true;

    return false;
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Controle de Jornada
          </CardTitle>
          <div className="flex items-center gap-2">
            {/* Connection status */}
            {offline.isOnline ? (
              <Badge variant="outline" className="flex items-center gap-1 text-success border-success/50">
                <Wifi className="h-3 w-3" />
                Online
              </Badge>
            ) : (
              <Badge variant="outline" className="flex items-center gap-1 text-warning border-warning/50">
                <WifiOff className="h-3 w-3" />
                Offline
              </Badge>
            )}
            {/* Pending sync count */}
            {offline.pendingCount > 0 && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <RefreshCw className={cn("h-3 w-3", offline.isSyncing && "animate-spin")} />
                {offline.pendingCount} pendente(s)
              </Badge>
            )}
          </div>
        </div>
        <CardDescription>
          {assignedVehicle 
            ? `Veículo: ${assignedVehicle.plate}` 
            : 'Nenhum veículo atribuído'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Geofence Status */}
        {assignedVehicle && (
          <div className={cn(
            "p-3 rounded-lg text-sm",
            geofence.isWithinRange 
              ? "bg-success/10 border border-success/30"
              : geofence.error
                ? "bg-warning/10 border border-warning/30"
                : "bg-destructive/10 border border-destructive/30"
          )}>
            <div className="flex items-center gap-2">
              {geofence.isChecking ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : geofence.isWithinRange ? (
                <CheckCircle className="h-4 w-4 text-success" />
              ) : (
                <AlertTriangle className={cn(
                  "h-4 w-4",
                  geofence.error ? "text-warning" : "text-destructive"
                )} />
              )}
              <span className="font-medium">
                {geofence.isWithinRange
                  ? `Você está a ${geofence.distance}m do veículo`
                  : geofence.error
                    ? geofence.error
                    : `Distância: ${geofence.distance}m (máx: ${maxGeofenceDistance}m)`}
              </span>
            </div>
            {!geofence.isWithinRange && !geofence.error && (
              <p className="text-xs text-muted-foreground mt-1">
                O início de jornada só é permitido próximo ao veículo.
              </p>
            )}
          </div>
        )}

        {/* Event Buttons */}
        <div className="grid grid-cols-2 gap-3">
          {eventTypes.map((type) => {
            const Icon = type.icon;
            const isDisabled = isSubmitting || isJourneyStartDisabled(type.value);
            
            return (
              <Button
                key={type.value}
                variant="outline"
                className={cn(
                  "h-20 flex flex-col items-center justify-center gap-2",
                  "hover:bg-accent transition-colors",
                  isDisabled && "opacity-50 cursor-not-allowed"
                )}
                onClick={() => handleEventClick(type.value)}
                disabled={isDisabled}
              >
                <div className={cn("p-2 rounded-lg", type.color)}>
                  {isSubmitting ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Icon className="h-5 w-5" />
                  )}
                </div>
                <span className="text-sm font-medium">{type.label}</span>
              </Button>
            );
          })}
        </div>

        {/* Offline Queue */}
        {offline.pendingCount > 0 && (
          <div className="pt-2 border-t">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {offline.pendingCount} evento(s) aguardando sincronização
              </span>
              {offline.isOnline && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => offline.syncPendingEvents()}
                  disabled={offline.isSyncing}
                >
                  <RefreshCw className={cn("h-4 w-4 mr-1", offline.isSyncing && "animate-spin")} />
                  Sincronizar
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
