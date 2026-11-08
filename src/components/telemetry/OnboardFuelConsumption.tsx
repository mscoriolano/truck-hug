import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, startOfMonth } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DateRangeFilter } from '@/components/ui/DateRangeFilter';
import { Info } from 'lucide-react';

type Row = {
  vehicle_plate: string;
  driver_name: string | null;
  data_timestamp: string;
  odometer: number | null;
  fuel_used_total: number | null;
  onboard_consumption_kml: number | null;
  ignition_on: boolean | null;
};

export type DailyConsumption = {
  day: string;
  plate: string;
  driver: string;
  km: number;
  liters: number | null;
  kml: number | null;
};

/** Daily onboard consumption with ignition on. Uses only ECU values (fuel counter delta or onboard km/L). */
export function computeDailyConsumption(rows: Row[]): DailyConsumption[] {
  const groups = new Map<string, Row[]>();
  for (const r of rows) {
    if (r.ignition_on === false) continue;
    const day = format(new Date(r.data_timestamp), 'yyyy-MM-dd');
    const key = `${day}|${r.vehicle_plate}|${r.driver_name || 'Não identificado'}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(r);
  }
  const out: DailyConsumption[] = [];
  for (const [key, list] of groups) {
    const [day, plate, driver] = key.split('|');
    const odos = list.map(r => r.odometer).filter((v): v is number => !!v && v > 0);
    const km = odos.length >= 2 ? Math.max(...odos) - Math.min(...odos) : 0;
    const fuels = list.map(r => Number(r.fuel_used_total)).filter(v => v > 0);
    const liters = fuels.length >= 2 ? Math.max(...fuels) - Math.min(...fuels) : null;
    let kml: number | null = null;
    if (liters && liters > 0 && km > 0) kml = km / liters;
    else {
      const k = list.map(r => Number(r.onboard_consumption_kml)).filter(v => v > 0);
      if (k.length) kml = k.reduce((a, b) => a + b, 0) / k.length;
    }
    out.push({ day, plate, driver, km, liters: liters && liters > 0 ? liters : null, kml });
  }
  return out.sort((a, b) => b.day.localeCompare(a.day) || a.plate.localeCompare(b.plate));
}

export function OnboardFuelConsumption({ plates }: { plates: string[] }) {
  const [range, setRange] = useState<{ from: Date; to: Date } | undefined>({ from: startOfMonth(new Date()), to: new Date() });
  const [plate, setPlate] = useState('all');
  const [driver, setDriver] = useState('all');

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['onboard-fuel', range?.from?.toISOString(), range?.to?.toISOString()],
    queryFn: async () => {
      const from = new Date(range!.from); from.setHours(0, 0, 0, 0);
      const to = new Date(range!.to || range!.from); to.setHours(23, 59, 59, 999);
      const all: Row[] = [];
      for (let page = 0; page < 50; page++) {
        const { data, error } = await supabase
          .from('vehicle_can_data')
          .select('vehicle_plate, driver_name, data_timestamp, odometer, fuel_used_total, onboard_consumption_kml, ignition_on')
          .gte('data_timestamp', from.toISOString())
          .lte('data_timestamp', to.toISOString())
          .order('data_timestamp')
          .range(page * 1000, page * 1000 + 999);
        if (error) throw error;
        all.push(...((data || []) as Row[]));
        if (!data || data.length < 1000) break;
      }
      return all;
    },
    enabled: !!range?.from,
  });

  const daily = useMemo(() => computeDailyConsumption(rows), [rows]);
  const drivers = useMemo(() => Array.from(new Set(daily.map(d => d.driver))).sort(), [daily]);
  const allPlates = useMemo(() => Array.from(new Set([...plates, ...daily.map(d => d.plate)])).sort(), [plates, daily]);

  const filtered = daily.filter(d => (plate === 'all' || d.plate === plate) && (driver === 'all' || d.driver === driver));
  const withData = filtered.filter(d => d.kml !== null);

  // Period average: total km / total liters when counter exists, else mean of onboard km/L
  const totalKm = withData.reduce((a, d) => a + (d.liters ? d.km : 0), 0);
  const totalL = withData.reduce((a, d) => a + (d.liters || 0), 0);
  const periodAvg = totalL > 0 ? totalKm / totalL : withData.length ? withData.reduce((a, d) => a + (d.kml || 0), 0) / withData.length : null;

  const perPlate = allPlates
    .filter(p => plate === 'all' || p === plate)
    .map(p => {
      const ds = withData.filter(d => d.plate === p);
      const l = ds.reduce((a, d) => a + (d.liters || 0), 0);
      const k = ds.reduce((a, d) => a + (d.liters ? d.km : 0), 0);
      const avg = l > 0 ? k / l : ds.length ? ds.reduce((a, d) => a + (d.kml || 0), 0) / ds.length : null;
      return { plate: p, avg, days: ds.length };
    });

  return (
    <div className="space-y-6">
      <Card className="border-slate-800 bg-[#0f172a] text-white">
        <CardContent className="pt-6 flex flex-wrap gap-3 items-center">
          <DateRangeFilter date={range} onDateChange={setRange} />
          <Select value={plate} onValueChange={setPlate}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Placa" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as placas</SelectItem>
              {allPlates.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={driver} onValueChange={setDriver}>
            <SelectTrigger className="w-[220px]"><SelectValue placeholder="Motorista" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os motoristas</SelectItem>
              {drivers.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Info className="w-4 h-4" /> Somente dados do computador de bordo, com ignição ligada. Nenhum valor estimado.
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-[#0f172a] border-slate-800 text-white"><CardContent className="pt-6 text-center">
          <div className="text-3xl font-bold">{periodAvg !== null ? periodAvg.toFixed(2) : '—'}</div>
          <p className="text-xs text-slate-400 uppercase mt-1">Média do período (km/L)</p></CardContent></Card>
        <Card className="bg-[#0f172a] border-slate-800 text-white"><CardContent className="pt-6 text-center">
          <div className="text-3xl font-bold">{totalL > 0 ? totalL.toFixed(1) : '—'}</div>
          <p className="text-xs text-slate-400 uppercase mt-1">Litros consumidos (bordo)</p></CardContent></Card>
        <Card className="bg-[#0f172a] border-slate-800 text-white"><CardContent className="pt-6 text-center">
          <div className="text-3xl font-bold">{withData.length}</div>
          <p className="text-xs text-slate-400 uppercase mt-1">Dias com dado de bordo</p></CardContent></Card>
      </div>

      <Card className="border-slate-800 bg-[#0f172a] text-white">
        <CardHeader><CardTitle>Média por placa no período</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {perPlate.map(p => (
            <div key={p.plate} className="rounded-lg border border-slate-800 p-3">
              <div className="font-mono font-bold">{p.plate}</div>
              {p.avg !== null
                ? <div className="text-xl font-bold">{p.avg.toFixed(2)} <span className="text-xs text-slate-400">km/L</span></div>
                : <Badge variant="outline" className="mt-1 text-slate-400">Sem dado de bordo</Badge>}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border-slate-800 bg-[#0f172a] text-white">
        <CardHeader><CardTitle>Consumo diário (ignição ligada)</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <p className="text-slate-400">Carregando...</p> : filtered.length === 0 ? (
            <p className="text-slate-400">Nenhuma leitura do computador de bordo neste período.</p>
          ) : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Data</TableHead><TableHead>Placa</TableHead><TableHead>Motorista</TableHead>
                <TableHead className="text-right">Km</TableHead><TableHead className="text-right">Litros</TableHead><TableHead className="text-right">km/L</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {filtered.map(d => (
                  <TableRow key={`${d.day}-${d.plate}-${d.driver}`}>
                    <TableCell>{format(new Date(`${d.day}T12:00:00`), 'dd/MM/yyyy')}</TableCell>
                    <TableCell className="font-mono">{d.plate}</TableCell>
                    <TableCell>{d.driver}</TableCell>
                    <TableCell className="text-right">{d.km.toFixed(0)}</TableCell>
                    <TableCell className="text-right">{d.liters !== null ? d.liters.toFixed(1) : '—'}</TableCell>
                    <TableCell className="text-right font-bold">{d.kml !== null ? d.kml.toFixed(2) : <span className="text-slate-500 font-normal">Sem dado de bordo</span>}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
