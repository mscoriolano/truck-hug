import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useVehicleTelemetry } from '@/hooks/useTelemetry';
import { useVehicles } from '@/hooks/useVehicles';
import { useFuelEntries } from '@/hooks/useFuelEntries'; // Se der erro aqui, me avise
import { Fuel } from 'lucide-react';

// --- CORREÇÃO AQUI: export function (sem default) ---
export function FuelConsumptionChart() {
  const { data: telemetry } = useVehicleTelemetry();
  const { data: vehicles } = useVehicles();
  const fuelEntriesQuery = useFuelEntries(); 
  const fuelEntries = fuelEntriesQuery?.data || [];

  const chartData = useMemo(() => {
    if (!vehicles || !Array.isArray(vehicles)) return [];

    // Filtra ativos
    const activeVehicles = vehicles.filter(v => v.status === 'active');
    
    return activeVehicles.map(vehicle => {
      const target = Number(vehicle.consumption_target) || 2.5;
      const plate = vehicle.license_plate || vehicle.plate || 'S/ Placa';
      let consumption = 0;
      
      try {
        const vehicleFuel = fuelEntries.filter(f => f.vehicle_id === vehicle.id).sort((a, b) => a.mileage - b.mileage);
        if (vehicleFuel.length >= 2) {
          const dist = vehicleFuel[vehicleFuel.length - 1].mileage - vehicleFuel[0].mileage;
          const liters = vehicleFuel.reduce((acc, f) => acc + Number(f.liters), 0);
          if (dist > 0 && liters > 0) consumption = dist / liters;
        }
      } catch (e) { console.error(e); }

      let status: 'good' | 'warning' | 'bad' | 'nodata' = 'nodata';
      if (consumption > 0) {
        if (consumption >= target) status = 'good';
        else if (consumption >= target * 0.9) status = 'warning';
        else status = 'bad';
      }

      return { plate, value: consumption, target, status };
    }).sort((a, b) => {
        if (a.value > 0 && b.value === 0) return -1;
        if (a.value === 0 && b.value > 0) return 1;
        return a.plate.localeCompare(b.plate);
    });
  }, [vehicles, fuelEntries, telemetry]);

  const validData = chartData.filter(d => d.value > 0);
  const avgConsumption = validData.length > 0 ? validData.reduce((acc, v) => acc + v.value, 0) / validData.length : 0;
  const avgTarget = validData.length > 0 ? validData.reduce((acc, v) => acc + v.target, 0) / validData.length : 2.5;
  const variation = avgConsumption > 0 ? ((avgConsumption - avgTarget) / avgTarget) * 100 : 0;

  return (
    <Card className="col-span-4 shadow-md border-slate-200">
      <CardHeader>
        <div className="flex items-center justify-between">
            <div><CardTitle className="flex items-center gap-2 text-slate-800"><Fuel className="h-5 w-5 text-blue-600" />Consumo de Combustível</CardTitle><CardDescription>Frota total: {chartData.length} veículos</CardDescription></div>
             <Badge variant={variation >= 0 ? "default" : "destructive"} className="h-6">{variation >= 0 ? "Economia" : "Abaixo da Meta"}</Badge>
        </div>
        <div className="grid grid-cols-3 gap-4 mt-4 bg-slate-900 text-white p-4 rounded-xl shadow-inner">
            <div className="text-center border-r border-slate-700"><div className="text-2xl font-bold">{avgConsumption.toFixed(2)}</div><div className="text-xs text-slate-400">Média Real (km/L)</div></div>
            <div className="text-center border-r border-slate-700"><div className="text-2xl font-bold">{avgTarget.toFixed(2)}</div><div className="text-xs text-slate-400">Meta (km/L)</div></div>
            <div className="text-center"><div className={`text-2xl font-bold ${variation >= 0 ? 'text-green-400' : 'text-red-400'}`}>{variation > 0 ? '+' : ''}{variation.toFixed(1)}%</div><div className="text-xs text-slate-400">Variação</div></div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 mt-4 max-h-[600px] overflow-y-auto pr-2">
          {chartData.map((item) => (
            <div key={item.plate} className="space-y-1">
              <div className="flex justify-between text-sm"><span className="font-bold text-slate-700">{item.plate}</span><div className="flex gap-4"><span className="text-slate-400 text-xs">Meta: {item.target}</span><span className={item.value > 0 ? "font-bold text-slate-800" : "text-slate-400"}>{item.value > 0 ? `${item.value.toFixed(2)} km/L` : 'S/ Dados'}</span></div></div>
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden relative">
                <div className="absolute top-0 bottom-0 w-0.5 bg-slate-800 z-10 opacity-20" style={{ left: `${(1 / 1.5) * 100}%` }} />
                <div className={`h-full rounded-full transition-all duration-500 ${item.status === 'good' ? 'bg-green-500' : item.status === 'bad' ? 'bg-red-500' : 'bg-slate-300'}`} style={{ width: `${item.value > 0 ? Math.min((item.value / (item.target * 1.5)) * 100, 100) : 0}%` }} />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}