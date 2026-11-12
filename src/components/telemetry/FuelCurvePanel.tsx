import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, subDays } from 'date-fns';
import { CartesianGrid, Line, LineChart, ReferenceDot, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Fuel } from 'lucide-react';
import { buildFuelCurve, type CurveEventKind } from '@/lib/fuelCurve';
import type { TankReading } from '@/lib/tankConsumption';

const KIND: Record<CurveEventKind, { label: string; color: string; variant: 'default' | 'destructive' | 'secondary' }> = {
  refuel: { label: 'Abastecimento', color: 'hsl(var(--success, 142 71% 45%))', variant: 'default' },
  theft: { label: 'Suspeita de furto/desvio', color: 'hsl(var(--destructive))', variant: 'destructive' },
  high_consumption: { label: 'Consumo excessivo', color: 'hsl(var(--warning, 38 92% 50%))', variant: 'secondary' },
};
const fmt = (ts: string) => format(new Date(ts), 'dd/MM HH:mm');

export function FuelCurvePanel() {
  const [from, setFrom] = useState(format(subDays(new Date(), 7), 'yyyy-MM-dd'));
  const [to, setTo] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [plate, setPlate] = useState('none');
  const [driver, setDriver] = useState('all');
  const [trip, setTrip] = useState('all');
  const [focus, setFocus] = useState<string | null>(null);

  const { data: vehicles = [] } = useQuery({
    queryKey: ['fuel-curve-vehicles'],
    queryFn: async () => (await supabase.from('vehicles').select('plate').order('plate')).data || [],
  });

  const { data: trips = [] } = useQuery({
    queryKey: ['fuel-curve-trips', plate, from, to],
    enabled: plate !== 'none',
    queryFn: async () => (await supabase.from('trips').select('id,departure_date,driver_name,trip_type')
      .eq('vehicle_plate', plate).gte('departure_date', `${from}T00:00:00-03:00`).lte('departure_date', `${to}T23:59:59-03:00`)
      .order('departure_date')).data || [],
  });

  const range = useMemo(() => {
    const idx = trips.findIndex(t => t.id === trip);
    if (idx < 0) return { start: `${from}T00:00:00-03:00`, end: `${to}T23:59:59.999-03:00` };
    return { start: trips[idx].departure_date, end: trips[idx + 1]?.departure_date || `${to}T23:59:59.999-03:00` };
  }, [trip, trips, from, to]);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['fuel-curve', plate, range.start, range.end],
    enabled: plate !== 'none',
    queryFn: async () => {
      const all: TankReading[] = [];
      for (let page = 0; ; page++) {
        const { data, error } = await supabase.from('vehicle_can_data')
          .select('vehicle_plate,driver_name,data_timestamp,odometer,fuel_level,ignition_on')
          .eq('vehicle_plate', plate).not('fuel_level', 'is', null)
          .gte('data_timestamp', range.start).lte('data_timestamp', range.end)
          .order('data_timestamp').range(page * 1000, page * 1000 + 999);
        if (error) throw error;
        all.push(...((data || []) as TankReading[]));
        if (!data || data.length < 1000) break;
      }
      return all;
    },
  });

  const drivers = useMemo(() => Array.from(new Set(rows.map(r => r.driver_name || 'Sem motorista'))).sort(), [rows]);
  const filtered = driver === 'all' ? rows : rows.filter(r => (r.driver_name || 'Sem motorista') === driver);
  const { points, events, avgKmPerLiter } = useMemo(() => buildFuelCurve(filtered), [filtered]);
  const chart = points.map(p => ({ ...p, label: fmt(p.ts) }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Fuel className="h-5 w-5 text-primary" />Curva do Tanque & Auditoria de Combustível</CardTitle>
        <p className="text-sm text-muted-foreground">Nível do tanque (tag de litros do rastreador). Sobe no abastecimento e desce com o uso — quedas bruscas indicam possível furto.</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-5">
          <Select value={plate} onValueChange={v => { setPlate(v); setDriver('all'); setTrip('all'); }}>
            <SelectTrigger><SelectValue placeholder="Placa" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Selecione a placa</SelectItem>
              {vehicles.map(v => <SelectItem key={v.plate} value={v.plate}>{v.plate}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={driver} onValueChange={setDriver}>
            <SelectTrigger><SelectValue placeholder="Motorista" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os motoristas</SelectItem>
              {drivers.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={trip} onValueChange={setTrip}>
            <SelectTrigger><SelectValue placeholder="Viagem" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Período completo</SelectItem>
              {trips.map(t => <SelectItem key={t.id} value={t.id}>{format(new Date(t.departure_date), 'dd/MM HH:mm')} · {t.trip_type} · {t.driver_name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input type="date" value={from} onChange={e => setFrom(e.target.value)} />
          <Input type="date" value={to} onChange={e => setTo(e.target.value)} />
        </div>

        {plate === 'none' ? <p className="py-10 text-center text-muted-foreground">Selecione uma placa para ver a curva.</p>
          : isLoading ? <p className="py-10 text-center text-muted-foreground">Carregando…</p>
          : points.length < 2 ? <p className="py-10 text-center text-muted-foreground">Sem leituras de litros no tanque para este filtro. Lembre que a TrucksControl envia os dados em D-1.</p>
          : <>
            <div className="flex flex-wrap gap-2 text-sm">
              {(Object.keys(KIND) as CurveEventKind[]).map(k => <Badge key={k} variant={KIND[k].variant}>{KIND[k].label}: {events.filter(e => e.kind === k).length}</Badge>)}
              <Badge variant="outline">Média pelo tanque: {avgKmPerLiter ? `${avgKmPerLiter.toFixed(2)} km/L` : '—'}</Badge>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={11} minTickGap={40} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} unit=" L" />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                    formatter={(v: number) => [`${v.toFixed(1)} L`, 'Tanque']}
                    labelFormatter={(l, p) => `${l} · ${p?.[0]?.payload?.driver ?? ''} · ${p?.[0]?.payload?.odometer ?? '—'} km`} />
                  <Line type="monotone" dataKey="liters" stroke="hsl(var(--primary))" dot={false} strokeWidth={2} />
                  {events.map((e, i) => <ReferenceDot key={i} x={fmt(e.ts)} y={e.liters} r={focus === e.ts ? 9 : 5} fill={KIND[e.kind].color} stroke="hsl(var(--background))" />)}
                </LineChart>
              </ResponsiveContainer>
            </div>
            <Table>
              <TableHeader><TableRow><TableHead>Data/hora</TableHead><TableHead>Evento</TableHead><TableHead>Motorista</TableHead><TableHead>Hodômetro</TableHead><TableHead>Variação</TableHead><TableHead>Km no trecho</TableHead></TableRow></TableHeader>
              <TableBody>
                {events.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Nenhuma anomalia ou abastecimento detectado.</TableCell></TableRow>}
                {events.map((e, i) => (
                  <TableRow key={i} className="cursor-pointer" onClick={() => setFocus(e.ts)} data-state={focus === e.ts ? 'selected' : undefined}>
                    <TableCell>{fmt(e.ts)}</TableCell>
                    <TableCell><Badge variant={KIND[e.kind].variant}>{KIND[e.kind].label}</Badge></TableCell>
                    <TableCell>{e.driver}</TableCell>
                    <TableCell>{e.odometer ?? '—'} km</TableCell>
                    <TableCell>{e.deltaLiters > 0 ? '+' : ''}{e.deltaLiters.toFixed(1)} L</TableCell>
                    <TableCell>{e.km != null ? e.km.toFixed(1) : '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>}
      </CardContent>
    </Card>
  );
}
