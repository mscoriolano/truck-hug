import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, subDays } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Cpu, Info } from 'lucide-react';

type Row = {
  vehicle_plate: string;
  driver_name: string | null;
  data_timestamp: string;
  odometer: number | null;
  fuel_used_total: number | null;
  onboard_consumption_kml: number | null;
  ignition_on: boolean | null;
};

type Day = { plate: string; driver: string; day: string; km: number | null; liters: number | null; kml: number | null };

/** Daily onboard-computer consumption, ignition on only. Never estimated. */
export function computeDaily(rows: Row[]): Day[] {
  const groups = new Map<string, Row[]>();
  for (const r of rows) {
    if (r.ignition_on === false) continue;
    const day = format(new Date(r.data_timestamp), 'yyyy-MM-dd');
    const key = `${r.vehicle_plate}|${r.driver_name || 'Sem motorista'}|${day}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(r);
  }
  const out: Day[] = [];
  groups.forEach((list, key) => {
    const [plate, driver, day] = key.split('|');
    const odo = list.map(r => r.odometer).filter((v): v is number => v != null && v > 0);
    const fuel = list.map(r => r.fuel_used_total).filter((v): v is number => v != null && Number(v) > 0).map(Number);
    const km = odo.length > 1 ? Math.max(...odo) - Math.min(...odo) : null;
    const liters = fuel.length > 1 ? Math.max(...fuel) - Math.min(...fuel) : null;
    let kml: number | null = null;
    if (km && liters && liters > 0) kml = km / liters;
    else {
      const ob = list.map(r => r.onboard_consumption_kml).filter((v): v is number => v != null && Number(v) > 0).map(Number);
      if (ob.length) kml = ob.reduce((a, b) => a + b, 0) / ob.length;
    }
    out.push({ plate, driver, day, km, liters, kml });
  });
  return out.sort((a, b) => b.day.localeCompare(a.day) || a.plate.localeCompare(b.plate));
}

export function OnboardConsumptionPanel() {
  const [from, setFrom] = useState(format(subDays(new Date(), 7), 'yyyy-MM-dd'));
  const [to, setTo] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [plate, setPlate] = useState('all');
  const [driver, setDriver] = useState('all');

  const { data: vehicles = [] } = useQuery({
    queryKey: ['onboard-vehicles'],
    queryFn: async () => (await supabase.from('vehicles').select('plate').order('plate')).data || [],
  });

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['onboard-consumption', from, to],
    queryFn: async () => {
      const all: Row[] = [];
      for (let page = 0; page < 20; page++) {
        const { data, error } = await supabase
          .from('vehicle_can_data')
          .select('vehicle_plate,driver_name,data_timestamp,odometer,fuel_used_total,onboard_consumption_kml,ignition_on')
          .gte('data_timestamp', `${from}T00:00:00`)
          .lte('data_timestamp', `${to}T23:59:59`)
          .order('data_timestamp')
          .range(page * 1000, page * 1000 + 999);
        if (error) throw error;
        all.push(...((data || []) as Row[]));
        if (!data || data.length < 1000) break;
      }
      return all;
    },
  });

  const daily = useMemo(() => computeDaily(rows), [rows]);
  const drivers = useMemo(() => Array.from(new Set(daily.map(d => d.driver))).sort(), [daily]);
  const filtered = daily.filter(d => (plate === 'all' || d.plate === plate) && (driver === 'all' || d.driver === driver));

  const avgOf = (list: Day[]) => {
    const km = list.reduce((a, d) => a + (d.km && d.liters ? d.km : 0), 0);
    const l = list.reduce((a, d) => a + (d.km && d.liters ? d.liters : 0), 0);
    if (l > 0) return km / l;
    const v = list.map(d => d.kml).filter((x): x is number => x != null);
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
  };

  const plates = plate === 'all' ? vehicles.map(v => v.plate) : [plate];
  const perPlate = plates.map(p => ({ plate: p, avg: avgOf(filtered.filter(d => d.plate === p)) }));
  const fleetAvg = avgOf(filtered);

  return (
    <div className="space-y-6">
      <Card className="border-border bg-card">
        <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2"><Cpu className="w-5 h-5" /> Consumo do computador de bordo</CardTitle>
            <p className="text-sm text-muted-foreground">Somente valores enviados pelo veículo, com ignição ligada. Nada é estimado.</p>
          </div>
          <div className="flex flex-wrap gap-2 items-end">
            <Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="w-40" />
            <Input type="date" value={to} onChange={e => setTo(e.target.value)} className="w-40" />
            <Select value={plate} onValueChange={setPlate}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Placa" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as placas</SelectItem>
                {vehicles.map(v => <SelectItem key={v.plate} value={v.plate}>{v.plate}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={driver} onValueChange={setDriver}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Motorista" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os motoristas</SelectItem>
                {drivers.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-3xl font-bold">
            {fleetAvg != null ? `${fleetAvg.toFixed(2)} km/L` : 'Indisponível'}
            <span className="text-sm font-normal text-muted-foreground ml-2">média do período</span>
          </div>
          {!isLoading && daily.length === 0 && (
            <div className="flex gap-2 rounded-md border border-border p-3 text-sm text-muted-foreground">
              <Info className="w-4 h-4 mt-0.5 shrink-0" />
              O rastreador ainda não enviou dados de consumo do computador de bordo para nenhum veículo neste período.
            </div>
          )}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {perPlate.map(p => (
              <div key={p.plate} className="rounded-md border border-border p-3">
                <div className="text-xs text-muted-foreground">{p.plate}</div>
                <div className="font-mono font-bold">{p.avg != null ? `${p.avg.toFixed(2)} km/L` : <Badge variant="outline">Indisponível</Badge>}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardHeader><CardTitle>Consumo diário</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow><TableHead>Data</TableHead><TableHead>Placa</TableHead><TableHead>Motorista</TableHead><TableHead className="text-right">Km</TableHead><TableHead className="text-right">Litros</TableHead><TableHead className="text-right">km/L</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">{isLoading ? 'Carregando…' : 'Sem dados do computador de bordo'}</TableCell></TableRow>
              ) : filtered.map(d => (
                <TableRow key={`${d.plate}-${d.driver}-${d.day}`}>
                  <TableCell>{format(new Date(`${d.day}T12:00:00`), 'dd/MM/yyyy')}</TableCell>
                  <TableCell>{d.plate}</TableCell>
                  <TableCell>{d.driver}</TableCell>
                  <TableCell className="text-right">{d.km ?? '—'}</TableCell>
                  <TableCell className="text-right">{d.liters != null ? d.liters.toFixed(1) : '—'}</TableCell>
                  <TableCell className="text-right font-mono">{d.kml != null ? d.kml.toFixed(2) : 'Indisponível'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
