import { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents, LayersControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useVehicleTelemetry, useSyncTelemetry } from '@/hooks/useTelemetry';
import { useVehicles } from '@/hooks/useVehicles';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RefreshCw, MapPin, Search, Clock, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

// --- 1. ÍCONE ESTILO TRUCKS (COM ETIQUETA AMARELA) ---
const createTruckIcon = (count: number, status: string, plate: string) => {
  let color = '#ef4444'; // Vermelho (Desligado)
  if (status === 'moving') color = '#22c55e'; // Verde
  else if (status === 'idle') color = '#eab308'; // Amarelo

  // Se for agrupado, mostra a contagem, senão a placa
  const labelText = count > 1 ? `... (+${count})` : plate;
  
  // Caminhão sempre visível, mas com indicador de pilha se for grupo
  const showClusterBase = count > 1 ? 'block' : 'none';

  const html = `
    <div style="position: relative; width: 60px; height: 50px; display: flex; flex-direction: column; align-items: center;">
      <div style="
        background-color: yellow; 
        color: black; 
        font-family: Arial, sans-serif; 
        font-size: 11px; 
        font-weight: bold; 
        padding: 1px 5px; 
        border: 1px solid #999; 
        white-space: nowrap; 
        z-index: 20;
        box-shadow: 2px 2px 4px rgba(0,0,0,0.4);
      ">
        ${labelText}
      </div>

      <svg width="44" height="24" viewBox="0 0 44 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="margin-top: 2px; filter: drop-shadow(2px 2px 2px rgba(0,0,0,0.4));">
        <path d="M28 6 L38 6 L42 12 L42 20 L28 20 Z" fill="#ffffff" stroke="#333" stroke-width="1"/>
        <path d="M34 8 L38 8 L40 12 L34 12 Z" fill="#333"/>
        <rect x="0" y="0" width="30" height="20" fill="${color}" stroke="#333" stroke-width="1"/>
        <rect x="0" y="0" width="30" height="4" fill="#333"/> 
        <circle cx="8" cy="20" r="3" fill="#111"/>
        <circle cx="18" cy="20" r="3" fill="#111"/>
        <circle cx="36" cy="20" r="3" fill="#111"/>
      </svg>
      
      <div style="display: ${showClusterBase}; position: absolute; bottom: 5px; width: 34px; height: 6px; background: black; opacity: 0.2; border-radius: 50%;"></div>
    </div>
  `;

  return L.divIcon({ className: '', html: html, iconSize: [60, 50], iconAnchor: [30, 25], popupAnchor: [0, -20] });
};

// --- 2. COMPONENTE DE ENDEREÇO ---
const VehicleAddress = ({ lat, lng }: { lat: number, lng: number }) => {
  const [address, setAddress] = useState<string>('Localizando...');

  useEffect(() => {
    let active = true;
    const fetchAddress = async () => {
      try {
        await new Promise(r => setTimeout(r, 200)); 
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`);
        const data = await res.json();
        
        if (active && data.address) {
          const road = data.address.road || '';
          const suburb = data.address.suburb || data.address.neighbourhood || '';
          const city = data.address.city || data.address.town || data.address.municipality || '';
          const state = data.address.state || '';
          setAddress(`${state} - ${city.toUpperCase()} - ${road ? 'Próx. ' + road : suburb}`);
        } else if (active) {
          setAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
        }
      } catch (e) {
        if (active) setAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
      }
    };
    fetchAddress();
    return () => { active = false; };
  }, [lat, lng]);

  return <div style={{ marginBottom: '5px', color: '#000', fontWeight: 'bold' }}>{address}</div>;
};

// --- 3. POPUP ---
const VehiclePopupContent = ({ vehicle }: { vehicle: any }) => {
  return (
    <div style={{ fontFamily: 'Arial, Verdana', fontSize: '11px', color: '#666', width: '420px', textAlign: 'left' }}>
      <div style={{ marginBottom: '8px', borderBottom: '1px solid #eee', paddingBottom: '4px' }}>
         <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'Blue' }}>Veículo: {vehicle.vehicle_plate}</span>
      </div>
      <div style={{ display: 'flex' }}>
        <div style={{ float: 'left', marginRight: '10px', width: '140px' }}>
          <div style={{ fontWeight: 'bold' }}>Placa</div>
          <div style={{ marginBottom: '4px', color: '#000' }}>{vehicle.vehicle_plate}</div>
          <div style={{ fontWeight: 'bold' }}>Modelo</div>
          <div style={{ marginBottom: '4px', color: '#000' }}>{vehicle.model}</div>
          <div style={{ fontWeight: 'bold' }}>Identificador</div>
          <div style={{ marginBottom: '4px', color: '#000' }}>{vehicle.identifier}</div>
        </div>
        <div style={{ float: 'left', paddingLeft: '10px', borderLeft: '1px dotted black', width: '230px' }}>
          <div style={{ fontWeight: 'bold' }}>Data/Hora</div>
          <div style={{ marginBottom: '4px', color: 'Blue', fontWeight: 'bold' }}>{new Date(vehicle.received_at).toLocaleString()}</div>
          <div style={{ fontWeight: 'bold' }}>Localização</div>
          <VehicleAddress lat={vehicle.lat} lng={vehicle.lng} />
          <div style={{ fontWeight: 'bold' }}>Ignição</div>
          <div style={{ marginBottom: '4px', color: '#000', fontWeight: 'bold' }}>
             <span style={{ color: vehicle.ignition_on ? (vehicle.speed > 0 ? 'green' : '#eab308') : 'red' }}>
                {vehicle.ignition_on ? (vehicle.speed > 0 ? 'Ligada (Movimento)' : 'Ligada (Parado)') : 'Desligada'}
             </span>
          </div>
          <div style={{ fontSize: '14px', paddingTop: '4px', fontWeight: 'bold', color: '#000' }}>
            {vehicle.speed} Km/h
          </div>
        </div>
      </div>
      <div style={{ clear: 'both', width: '100%', paddingTop: '8px', marginTop: '5px', borderTop: '1px solid #eee', textAlign: 'center' }}>
        <a href={`https://www.google.com.br/maps/place/${vehicle.lat},${vehicle.lng}`} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: 'blue', cursor: 'pointer', textDecoration: 'none', fontWeight: 'bold' }}>
          <ExternalLink size={12} /> Visualizar no Google Maps
        </a>
      </div>
    </div>
  );
};

// Handler de Zoom
function ZoomHandler({ onZoom }: { onZoom: (z: number) => void }) {
  const map = useMapEvents({
    zoomend: () => onZoom(map.getZoom()),
  });
  return null;
}

// Controlador de Posição
function MapController({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => { 
    if (center) map.setView(center, map.getZoom()); 
  }, [center]); 
  return null;
}

export function VehicleMap() {
  const { data: telemetryData, refetch, isLoading } = useVehicleTelemetry();
  const { data: vehiclesRegistry } = useVehicles();
  const syncTelemetry = useSyncTelemetry();

  const [searchTerm, setSearchTerm] = useState('');
  // SUAS COORDENADAS FIXAS:
  const [mapCenter, setMapCenter] = useState<[number, number]>([-19.52880, -42.63600]);
  const [currentZoom, setCurrentZoom] = useState(14);
  const [countdown, setCountdown] = useState(30); // INICIA COM 30s
  const [lastUpdate, setLastUpdate] = useState(new Date());

  // --- ALTERAÇÃO SOLICITADA: Timer de 30 segundos ---
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(p => {
        if (p <= 1) {
          syncTelemetry.mutateAsync({ debug: false }).then(() => { refetch(); setLastUpdate(new Date()); });
          return 30; // RESETA PARA 30s
        }
        return p - 1;
      });
    }, 1000);
    
    // Sincronização extra a cada 30s
    const syncer = setInterval(() => {
       syncTelemetry.mutateAsync({ debug: false }).then(() => refetch());
    }, 30000);

    return () => { clearInterval(timer); clearInterval(syncer); };
  }, [syncTelemetry, refetch]);

  // --- LÓGICA DE AGRUPAMENTO (CLUSTER) ---
  const groupedVehicles = useMemo(() => {
    if (!telemetryData || !Array.isArray(telemetryData)) return [];

    const valid = telemetryData.filter(t => t && !isNaN(Number(t.latitude)) && !isNaN(Number(t.longitude)) && Number(t.latitude) !== 0);

    const enriched = valid.map(t => {
        const plateClean = (t.vehicle_plate || '').replace(/[^a-zA-Z0-9]/g, '');
        
        const registry = (vehiclesRegistry || []).find(v => {
            const regPlate = (v.license_plate || '').replace(/[^a-zA-Z0-9]/g, '');
            return regPlate === plateClean || v.id === t.vehicle_id;
        });

        const isIgnitionOn = !!t.ignition_on;
        const isMoving = (t.speed || 0) > 0;
        let status = 'off';
        if (isIgnitionOn) status = isMoving ? 'moving' : 'idle';

        return {
            ...t,
            lat: Number(t.latitude),
            lng: Number(t.longitude),
            model: registry?.model || 'Não Identificado',
            identifier: registry?.brand || 'FROTA PRÓPRIA',
            status
        };
    }).filter(v => searchTerm === '' || v.vehicle_plate.toLowerCase().includes(searchTerm.toLowerCase()));

    // Sensibilidade do Cluster baseada no Zoom
    let precision = 0.0001; 
    if (currentZoom <= 17) precision = 0.002; 
    if (currentZoom <= 15) precision = 0.01;
    if (currentZoom <= 12) precision = 0.1;

    const groups: { [key: string]: typeof enriched } = {};
    
    enriched.forEach(v => {
        const latKey = Math.floor(v.lat / precision);
        const lngKey = Math.floor(v.lng / precision);
        const key = `${latKey}_${lngKey}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(v);
    });

    return Object.values(groups);
  }, [telemetryData, vehiclesRegistry, searchTerm, currentZoom]);

  return (
    <Card className="col-span-12 shadow-lg border-slate-200 overflow-hidden">
      <CardHeader className="pb-3 bg-slate-50 border-b">
        <div className="flex flex-col md:flex-row justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-slate-800 text-lg">
                <MapPin className="h-5 w-5 text-blue-600" />
                Monitoramento da Frota
            </CardTitle>
            <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-[#22c55e]" /> Em movimento</div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-[#eab308]" /> Ocioso</div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-[#ef4444]" /> Desligado</div>
            </div>
          </div>
          <div className="flex gap-2 items-center">
             <div className="bg-white border px-3 py-1.5 rounded text-[10px] font-bold text-slate-600 shadow-sm flex items-center gap-2">
                <Clock className="w-3 h-3 text-blue-500" />
                {countdown}s | {lastUpdate.toLocaleTimeString()}
             </div>
             <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <Input placeholder="Buscar placa..." className="pl-9 h-9 w-40 bg-white" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
             </div>
             <Button variant="outline" size="icon" onClick={() => { refetch(); setCountdown(30); setLastUpdate(new Date()); }} className="h-9 w-9 bg-white">
                <RefreshCw className={cn("h-4 w-4 text-blue-600", isLoading && "animate-spin")} />
             </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="h-[700px] w-full relative bg-slate-100">
            <MapContainer center={mapCenter} zoom={14} style={{ height: '100%', width: '100%' }}>
                <LayersControl position="topright">
                    <LayersControl.BaseLayer checked name="Mapa">
                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    </LayersControl.BaseLayer>
                    <LayersControl.BaseLayer name="Satélite">
                        <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
                    </LayersControl.BaseLayer>
                </LayersControl>
                
                <ZoomHandler onZoom={setCurrentZoom} />
                <MapController center={mapCenter} zoom={14} />
                
                {groupedVehicles.map((group, index) => {
                    const mainVehicle = group[0];
                    const count = group.length;

                    return (
                        <Marker 
                            key={`${mainVehicle.id}-${index}`} 
                            position={[mainVehicle.lat, mainVehicle.lng]} 
                            icon={createTruckIcon(count, mainVehicle.status, mainVehicle.vehicle_plate)}
                        >
                            <Popup minWidth={420} maxWidth={450}>
                                {count > 1 ? (
                                    <div className="max-h-[350px] overflow-y-auto custom-scrollbar">
                                        <div className="bg-yellow-100 p-2 text-xs font-bold text-center border-b mb-2 text-black sticky top-0 z-10">
                                            {count} Equipamentos nesta região
                                        </div>
                                        {group.map((v, idx) => (
                                            <div key={v.id} className={idx > 0 ? "border-t pt-3 mt-3" : ""}>
                                                <VehiclePopupContent vehicle={v} />
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <VehiclePopupContent vehicle={mainVehicle} />
                                )}
                            </Popup>
                        </Marker>
                    );
                })}
            </MapContainer>
        </div>
      </CardContent>
    </Card>
  );
}