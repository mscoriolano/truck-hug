import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, LayersControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useVehicleTelemetry, VehicleTelemetry } from '@/hooks/useTelemetry';
import { useVehicles } from '@/hooks/useVehicles';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, MapPin, Truck, Navigation } from 'lucide-react';
import { useSyncTelemetry } from '@/hooks/useTelemetry';
import { cn } from '@/lib/utils';

// Fix for default marker icons in Leaflet with Vite
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

/** Determine vehicle status from telemetry */
function getVehicleStatus(speed: number, ignitionOn: boolean): 'moving' | 'idle' | 'off' {
  // Safety: if speed > 0, it's definitely moving (ignition must be on)
  if (speed > 0) return 'moving';
  // If ignition flag is on but speed is 0 => idle
  if (ignitionOn) return 'idle';
  return 'off';
}

const statusColors: Record<string, string> = {
  moving: '#22c55e',
  idle: '#f59e0b',
  off: '#6b7280',
};

// Truck SVG path
const truckSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 17h4V5H2v12h3"/><path d="M20 17h2v-3.34a4 4 0 0 0-1.17-2.83L19 9h-5v8h1"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>`;

const createVehicleIcon = (speed: number, ignitionOn: boolean) => {
  const status = getVehicleStatus(speed, ignitionOn);
  const color = statusColors[status];

  return L.divIcon({
    className: 'custom-vehicle-marker',
    html: `
      <div style="
        width: 44px;
        height: 44px;
        background: ${color};
        border: 3px solid white;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 10px rgba(0,0,0,0.35);
      ">
        ${truckSvg}
      </div>
    `,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    popupAnchor: [0, -22],
  });
};

interface MapCenterProps {
  center: [number, number];
  zoom: number;
}

function MapCenter({ center, zoom }: MapCenterProps) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

interface VehicleMapProps {
  className?: string;
  showControls?: boolean;
  selectedVehicleId?: string;
  filterData?: VehicleTelemetry[] | null;
}

export function VehicleMap({ className, showControls = true, selectedVehicleId, filterData }: VehicleMapProps) {
  const { data: telemetryData, isLoading: telemetryLoading, refetch } = useVehicleTelemetry();
  const { data: vehicles } = useVehicles();
  const syncTelemetry = useSyncTelemetry();
  const [mapCenter, setMapCenter] = useState<[number, number]>([-19.9167, -43.9345]);
  const [mapZoom, setMapZoom] = useState(10);

  const sourceData = filterData || telemetryData;

  const vehiclesWithLocation = sourceData?.filter(
    (t) => t.latitude && t.longitude && t.latitude !== 0 && t.longitude !== 0
  ) || [];

  useEffect(() => {
    if (selectedVehicleId && vehiclesWithLocation.length > 0) {
      const selected = vehiclesWithLocation.find((v) => v.vehicle_id === selectedVehicleId);
      if (selected && selected.latitude && selected.longitude) {
        setMapCenter([selected.latitude, selected.longitude]);
        setMapZoom(15);
      }
    }
  }, [selectedVehicleId, vehiclesWithLocation]);

  useEffect(() => {
    if (!selectedVehicleId && vehiclesWithLocation.length > 0) {
      const lats = vehiclesWithLocation.map((v) => v.latitude!);
      const lngs = vehiclesWithLocation.map((v) => v.longitude!);
      const centerLat = lats.reduce((a, b) => a + b, 0) / lats.length;
      const centerLng = lngs.reduce((a, b) => a + b, 0) / lngs.length;
      setMapCenter([centerLat, centerLng]);
    }
  }, [vehiclesWithLocation.length, selectedVehicleId]);

  const handleSync = async () => {
    await syncTelemetry.mutateAsync({ debug: false });
    refetch();
  };

  const getVehicleInfo = (vehicleId: string) => vehicles?.find((v) => v.id === vehicleId);

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Mapa de Veículos
          </CardTitle>
          {showControls && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSync}
              disabled={syncTelemetry.isPending}
            >
              <RefreshCw className={cn("h-4 w-4 mr-2", syncTelemetry.isPending && "animate-spin")} />
              Atualizar
            </Button>
          )}
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded" style={{ background: statusColors.moving }} />
            <span>Em movimento</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded" style={{ background: statusColors.idle }} />
            <span>Parado (ignição ligada)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded" style={{ background: statusColors.off }} />
            <span>Ignição desligada</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="h-[500px] relative">
          {telemetryLoading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-muted">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : vehiclesWithLocation.length === 0 ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted gap-4">
              <Truck className="h-16 w-16 text-muted-foreground" />
              <p className="text-muted-foreground text-center">
                Nenhum veículo com localização disponível.
                <br />
                Clique em "Atualizar" para sincronizar a telemetria.
              </p>
              <Button onClick={handleSync} disabled={syncTelemetry.isPending}>
                <RefreshCw className={cn("h-4 w-4 mr-2", syncTelemetry.isPending && "animate-spin")} />
                Sincronizar Telemetria
              </Button>
            </div>
          ) : (
            <MapContainer
              center={mapCenter}
              zoom={mapZoom}
              style={{ height: '100%', width: '100%' }}
              scrollWheelZoom={true}
            >
              <LayersControl position="topright">
                <LayersControl.BaseLayer checked name="Mapa">
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                </LayersControl.BaseLayer>
                <LayersControl.BaseLayer name="Satélite">
                  <TileLayer
                    attribution='Imagery &copy; Esri'
                    url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                  />
                </LayersControl.BaseLayer>
              </LayersControl>
              <MapCenter center={mapCenter} zoom={mapZoom} />

              {vehiclesWithLocation.map((telemetry) => {
                const vehicleInfo = getVehicleInfo(telemetry.vehicle_id);
                const status = getVehicleStatus(telemetry.speed, telemetry.ignition_on);
                const statusLabel = status === 'moving' ? 'Em movimento' : status === 'idle' ? 'Parado (Ign. Ligada)' : 'Desligado';

                return (
                  <Marker
                    key={telemetry.id}
                    position={[telemetry.latitude!, telemetry.longitude!]}
                    icon={createVehicleIcon(telemetry.speed, telemetry.ignition_on)}
                  >
                    <Popup>
                      <div className="min-w-[200px]">
                        <div className="font-bold text-lg mb-2 flex items-center gap-2">
                          <Truck className="h-4 w-4" />
                          {telemetry.vehicle_plate}
                        </div>
                        {vehicleInfo && (
                          <p className="text-sm text-gray-600 mb-2">
                            {vehicleInfo.brand} {vehicleInfo.model}
                          </p>
                        )}
                        <div className="space-y-1 text-sm">
                          <div className="flex items-center justify-between">
                            <span>Status:</span>
                            <Badge
                              style={{ background: statusColors[status], color: 'white' }}
                            >
                              {statusLabel}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Velocidade:</span>
                            <Badge variant={telemetry.speed > 80 ? "destructive" : "secondary"}>
                              {telemetry.speed} km/h
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Ignição:</span>
                            <Badge variant={status !== 'off' ? "default" : "secondary"}>
                              {status !== 'off' ? 'Ligada' : 'Desligada'}
                            </Badge>
                          </div>
                          {telemetry.heading > 0 && (
                            <div className="flex items-center justify-between">
                              <span>Direção:</span>
                              <span className="flex items-center gap-1">
                                <Navigation
                                  className="h-4 w-4"
                                  style={{ transform: `rotate(${telemetry.heading}deg)` }}
                                />
                                {telemetry.heading}°
                              </span>
                            </div>
                          )}
                          {telemetry.odometer > 0 && (
                            <div className="flex items-center justify-between">
                              <span>Odômetro:</span>
                              <span>{telemetry.odometer.toLocaleString()} km</span>
                            </div>
                          )}
                          <div className="text-xs text-gray-400 mt-2 pt-2 border-t">
                            Última atualização: {new Date(telemetry.received_at).toLocaleString('pt-BR')}
                          </div>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
