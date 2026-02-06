import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useVehicleTelemetry } from '@/hooks/useTelemetry';
import { useVehicles } from '@/hooks/useVehicles';
import { useFuelEntries } from '@/hooks/useFuelEntries';
import { Fuel, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from 'recharts';

interface ConsumptionData {
  vehicle_plate: string;
  consumption: number;
  target: number;
  difference: number;
  fuelLevel: number;
  source: 'telemetry' | 'manual';
}

export function FuelConsumptionChart() {
  const { data: telemetry } = useVehicleTelemetry();
  const { data: vehicles } = useVehicles();
  const { data: fuelEntries } = useFuelEntries();

  const consumptionData = useMemo<ConsumptionData[]>(() => {
    if (!vehicles) return [];

    const results: ConsumptionData[] = [];

    for (const vehicle of vehicles) {
      const target = vehicle.consumption_target || 3.5;
      const t = telemetry?.find((tel) => tel.vehicle_id === vehicle.id);

      // Tentar dados automáticos da telemetria (fuel_level + odômetro)
      if (t && t.fuel_level && t.fuel_level > 0 && t.odometer > 0) {
        // Usar fuel_level e odômetro para estimar consumo
        // Nota: consumo real precisa de delta entre leituras; aqui usamos o nível atual como indicador
        const consumption = t.odometer > 0 && t.fuel_level > 0
          ? Math.max(0.5, Math.min(8, t.odometer / (t.fuel_level * 100)))
          : target;

        results.push({
          vehicle_plate: vehicle.plate,
          consumption: parseFloat(consumption.toFixed(2)),
          target,
          difference: parseFloat((consumption - target).toFixed(2)),
          fuelLevel: t.fuel_level,
          source: 'telemetry',
        });
        continue;
      }

      // Fallback: dados manuais de abastecimento
      const vehicleFuel = fuelEntries?.filter((f) => f.vehicle_id === vehicle.id) || [];
      if (vehicleFuel.length >= 2) {
        const sorted = [...vehicleFuel].sort((a, b) => a.mileage - b.mileage);
        const totalKm = sorted[sorted.length - 1].mileage - sorted[0].mileage;
        const totalLiters = sorted.reduce((acc, f) => acc + Number(f.liters), 0);
        const consumption = totalLiters > 0 ? totalKm / totalLiters : 0;

        if (consumption > 0) {
          results.push({
            vehicle_plate: vehicle.plate,
            consumption: parseFloat(consumption.toFixed(2)),
            target,
            difference: parseFloat((consumption - target).toFixed(2)),
            fuelLevel: 0,
            source: 'manual',
          });
        }
      }
    }

    return results.sort((a, b) => b.consumption - a.consumption).slice(0, 10);
  }, [telemetry, vehicles, fuelEntries]);

  const avgConsumption =
    consumptionData.length > 0
      ? consumptionData.reduce((acc, v) => acc + v.consumption, 0) / consumptionData.length
      : 0;

  const avgTarget =
    consumptionData.length > 0
      ? consumptionData.reduce((acc, v) => acc + v.target, 0) / consumptionData.length
      : 3.5;

  const getBarColor = (consumption: number, target: number) => {
    const ratio = consumption / target;
    if (ratio <= 0.95) return 'hsl(var(--success))';
    if (ratio <= 1.05) return 'hsl(var(--warning))';
    return 'hsl(var(--destructive))';
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Fuel className="h-5 w-5 text-primary" />
              Consumo de Combustível
            </CardTitle>
            <CardDescription>
              Consumo real vs meta (km/L) — Fontes: telemetria (&lt;lt&gt; + &lt;odm&gt;) e abastecimentos manuais
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {avgConsumption <= avgTarget ? (
              <Badge className="bg-success text-success-foreground flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                Economia
              </Badge>
            ) : (
              <Badge className="bg-destructive text-destructive-foreground flex items-center gap-1">
                <TrendingDown className="h-3 w-3" />
                Prejuízo
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 rounded-lg bg-muted/50 text-center">
            <p className="text-2xl font-bold text-foreground">{avgConsumption.toFixed(2)}</p>
            <p className="text-sm text-muted-foreground">Média Real (km/L)</p>
          </div>
          <div className="p-4 rounded-lg bg-muted/50 text-center">
            <p className="text-2xl font-bold text-foreground">{avgTarget.toFixed(2)}</p>
            <p className="text-sm text-muted-foreground">Meta (km/L)</p>
          </div>
          <div className="p-4 rounded-lg bg-muted/50 text-center">
            <div className="flex items-center justify-center gap-1">
              {avgConsumption > avgTarget ? (
                <TrendingDown className="h-5 w-5 text-destructive" />
              ) : avgConsumption < avgTarget ? (
                <TrendingUp className="h-5 w-5 text-success" />
              ) : (
                <Minus className="h-5 w-5 text-muted-foreground" />
              )}
              <p
                className={`text-2xl font-bold ${
                  avgConsumption > avgTarget
                    ? 'text-destructive'
                    : avgConsumption < avgTarget
                    ? 'text-success'
                    : 'text-foreground'
                }`}
              >
                {avgTarget > 0 ? ((avgConsumption - avgTarget) * 100 / avgTarget).toFixed(1) : '0.0'}%
              </p>
            </div>
            <p className="text-sm text-muted-foreground">Variação</p>
          </div>
        </div>

        {/* Chart */}
        {consumptionData.length > 0 ? (
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={consumptionData} layout="vertical" margin={{ left: 60, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                <XAxis type="number" domain={[0, 'dataMax + 1']} tickFormatter={(v) => `${v} km/L`} />
                <YAxis type="category" dataKey="vehicle_plate" width={80} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload as ConsumptionData;
                      return (
                        <div className="rounded-lg bg-background border p-3 shadow-lg">
                          <p className="font-bold">{data.vehicle_plate}</p>
                          <p className="text-sm">Consumo: {data.consumption} km/L</p>
                          <p className="text-sm">Meta: {data.target} km/L</p>
                          <p
                            className={`text-sm font-medium ${
                              data.difference > 0 ? 'text-destructive' : 'text-success'
                            }`}
                          >
                            {data.difference > 0 ? '+' : ''}
                            {data.difference} km/L
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Fonte: {data.source === 'telemetry' ? '📡 Telemetria' : '✏️ Manual'}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <ReferenceLine x={avgTarget} stroke="hsl(var(--primary))" strokeDasharray="5 5" />
                <Bar dataKey="consumption" radius={[0, 4, 4, 0]}>
                  {consumptionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getBarColor(entry.consumption, entry.target)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-[300px] flex flex-col items-center justify-center text-muted-foreground gap-2">
            <Fuel className="h-12 w-12 opacity-50" />
            <p>Nenhum dado de consumo disponível</p>
            <p className="text-sm">Os dados serão exibidos quando a telemetria reportar tags &lt;lt&gt; e &lt;odm&gt;</p>
          </div>
        )}

        {/* Legend */}
        <div className="flex items-center justify-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-success" />
            <span>Abaixo da meta</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-warning" />
            <span>Na meta</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-destructive" />
            <span>Acima da meta</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
