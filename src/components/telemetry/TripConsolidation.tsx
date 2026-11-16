import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, differenceInCalendarDays, subDays } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import { Route } from 'lucide-react';
import { dayKm, dayLiters, summarizeTrip, type ReportDay } from '@/lib/onboardTrip';

type Props = {
  days: ReportDay[]; from: string; to: string; plate: string;
  tripId: string;
  onTrip: (t: { id: string; plate: string; from: string; to: string; driver: string } | null) => void;
};

const fmtH = (m: number) => `${Math.floor(m / 60)}h${String(Math.round(m % 60)).padStart(2, '0')}`;

export function TripConsolidation({ days, from, to, plate, tripId, onTrip }: Props) {
  const { data: trips = [] } = useQuery({
    queryKey: ['consumption-trips'],
    queryFn: async () => (await supabase.from('trips').select('id,vehicle_plate,driver_name,departure_date,trip_type').order('departure_date', { ascending: false }).limit(500)).data || [],
  });

  // Trip period = departure day until the day before the same vehicle's next departure (or today)
  const tripPeriods = useMemo(() => trips.map(t => {
    const next = trips.filter(o => o.vehicle_plate === t.vehicle_plate && o.departure_date > t.departure_date)
      .sort((a, b) => a.departure_date.localeCompare(b.departure_date))[0];
    const start = format(new Date(t.departure_date), 'yyyy-MM-dd');
    const end = next ? format(subDays(new Date(next.departure_date), 1), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');
    return { ...t, start, end: end < start ? start : end };
  }), [trips]);

  const chart = useMemo(() => {
    const byDay = new Map<string, { km: number; liters: number }>();
    for (const d of days) {
      const k = dayKm(d), l = dayLiters(d);
      const cur = byDay.get(d.day) || { km: 0, liters: 0 };
      if (k != null) cur.km += k; if (l != null) cur.liters += l;
      byDay.set(d.day, cur);
    }
    return [...byDay.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([day, v]) => ({
      dia: format(new Date(`${day}T12:00:00`), 'dd/MM'), km: Math.round(v.km), kml: v.liters > 0 ? +(v.km / v.liters).toFixed(2) : null,
    }));
  }, [days]);

  const periodDays = differenceInCalendarDays(new Date(`${to}T12:00:00`), new Date(`${from}T12:00:00`)) + 1;
  const s = plate !== 'all' ? summarizeTrip(days, periodDays) : null;

  return (
    <>
      <Card className="border-border bg-card">
        <CardHeader><CardTitle>Evolução diária · km rodados e km/L oficial</CardTitle></CardHeader>
        <CardContent>
          {chart.length === 0 ? <p className="text-sm text-muted-foreground">Sem relatórios diários do computador de bordo neste filtro.</p> : (
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={chart}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="dia" stroke="hsl(var(--muted-foreground))" />
                <YAxis yAxisId="km" stroke="hsl(var(--muted-foreground))" />
                <YAxis yAxisId="kml" orientation="right" stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                <Legend />
                <Bar yAxisId="km" dataKey="km" name="Km rodados" fill="hsl(var(--primary))" />
                <Line yAxisId="kml" dataKey="kml" name="km/L" stroke="hsl(var(--accent-foreground))" strokeWidth={2} connectNulls />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
          <CardTitle className="flex items-center gap-2"><Route className="w-5 h-5" /> Consolidado da viagem</CardTitle>
          <Select value={tripId} onValueChange={v => {
            if (v === 'none') return onTrip(null);
            const t = tripPeriods.find(x => x.id === v);
            if (t) onTrip({ id: t.id, plate: t.vehicle_plate, from: t.start, to: t.end, driver: t.driver_name });
          }}>
            <SelectTrigger className="w-80" aria-label="Viagem cadastrada"><SelectValue placeholder="Viagem cadastrada" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Período livre (filtros acima)</SelectItem>
              {tripPeriods.map(t => (
                <SelectItem key={t.id} value={t.id}>{t.vehicle_plate} · {t.driver_name} · {format(new Date(`${t.start}T12:00:00`), 'dd/MM')}–{format(new Date(`${t.end}T12:00:00`), 'dd/MM')}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {!s ? <p className="text-sm text-muted-foreground">Selecione uma placa (e opcionalmente o motorista) ou uma viagem cadastrada para consolidar o período.</p> : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">{plate} · {format(new Date(`${from}T12:00:00`), 'dd/MM/yyyy')} a {format(new Date(`${to}T12:00:00`), 'dd/MM/yyyy')} · {s.days} dia(s) com relatório</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  ['Km rodados', s.km != null ? `${s.km.toLocaleString('pt-BR')} km` : '—'],
                  ['Consumo médio', s.kml != null ? `${s.kml.toFixed(2)} km/L` : 'Indisponível'],
                  ['Litros consumidos', s.liters != null ? `${s.liters.toFixed(0)} L` : '—'],
                  ['Velocidade média', s.avgSpeed != null ? `${s.avgSpeed.toFixed(0)} km/h` : '—'],
                  ['Tempo de rodagem', s.movingMinutes ? fmtH(s.movingMinutes) : '—'],
                  ['Motor ligado parado', s.idleMinutes ? fmtH(s.idleMinutes) : '—'],
                  ['Acionamentos de freio', s.brakes.toLocaleString('pt-BR')],
                  ['Acionamentos de embreagem', s.clutch.toLocaleString('pt-BR')],
                ].map(([l, v]) => (
                  <div key={l} className="rounded-md border border-border p-3">
                    <div className="text-xs text-muted-foreground">{l}</div>
                    <div className="font-mono font-bold text-lg">{v}</div>
                  </div>
                ))}
              </div>
              {s.missingDays > 0 && <Badge variant="outline">{s.missingDays} dia(s) sem relatório · km pelo hodômetro continua exato; km/L e litros usam os dias com relatório</Badge>}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
