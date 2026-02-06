import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
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

// Custom icons for vehicles
const createVehicleIcon = (ignition: boolean, speed: number) => {
  const color = ignition ? (speed > 0 ? '#22c55e' : '#f59e0b') : '#6b7280';
  
  return L.divIcon({
    className: 'custom-vehicle-marker',
    html: `
      <div style="
        width: 40px;
        height: 40px;
        background: ${color};
        border: 3px solid white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      ">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
          <path d="M8.5 18.5h-3l-1-4v-4l1-3h12l1 3v4l-1 4h-3m-6 0v1a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1v-1m12 0v1a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1v-1M7 13h.01M17 13h.01"/>
        </svg>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20],
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
  const [mapCenter, setMapCenter] = useState<[number, number]>([-19.9167, -43.9345]); // Belo Horizonte
  const [mapZoom, setMapZoom] = useState(10);

  // Use filtered data if provided, otherwise full telemetry
  const sourceData = filterData || telemetryData;

  // Filtrar veículos com coordenadas válidas
  const vehiclesWithLocation = sourceData?.filter(
    (t) => t.latitude && t.longitude && t.latitude !== 0 && t.longitude !== 0
  ) || [];

  // Centralizar no veículo selecionado
  useEffect(() => {
    if (selectedVehicleId && vehiclesWithLocation.length > 0) {
      const selected = vehiclesWithLocation.find((v) => v.vehicle_id === selectedVehicleId);
      if (selected && selected.latitude && selected.longitude) {
        setMapCenter([selected.latitude, selected.longitude]);
        setMapZoom(15);
      }
    }
  }, [selectedVehicleId, vehiclesWithLocation]);

  // Centralizar em todos os veículos se não houver seleção
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

  const getVehicleInfo = (vehicleId: string) => {
    return vehicles?.find((v) => v.id === vehicleId);
  };

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
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span>Em movimento</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-amber-500" />
            <span>Parado (ignição ligada)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-gray-500" />
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
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapCenter center={mapCenter} zoom={mapZoom} />
              
              {vehiclesWithLocation.map((telemetry) => {
                const vehicleInfo = getVehicleInfo(telemetry.vehicle_id);
                
                return (
                  <Marker
                    key={telemetry.id}
                    position={[telemetry.latitude!, telemetry.longitude!]}
                    icon={createVehicleIcon(telemetry.ignition_on, telemetry.speed)}
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
                            <span>Velocidade:</span>
                            <Badge variant={telemetry.speed > 80 ? "destructive" : "secondary"}>
                              {telemetry.speed} km/h
                            </Badge>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <span>Ignição:</span>
                            <Badge variant={telemetry.ignition_on ? "default" : "secondary"}>
                              {telemetry.ignition_on ? 'Ligada' : 'Desligada'}
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
