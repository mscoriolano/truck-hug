import { useMemo, useState } from 'react';
import { format, subDays } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Gauge as GaugeIcon, Route, Fuel, Clock, Hash, X } from 'lucide-react';
import { useReportDays, useBehaviorCounts } from '@/hooks/useReportDays';
import { aggregate, rankScore, type Agg } from '@/lib/fleetStats';
import { PanelFilters } from './PanelFilters';

const TARGET_KML = 2.2;
const fmt = (v: number | null | undefined, d = 2) => (v == null ? '—' : v.toLocaleString('pt-BR', { maximumFractionDigits: d }));

function Gauge({ label, value, sub, kind }: { label: string; value: number | null; sub: string; kind: 'meta' | 'limite' }) {
  const v = value == null ? 0 : Math.max(0, Math.min(100, value));
  const r = 40, c = Math.PI * r, dash = (v / 100) * c;
  const color = kind === 'meta' ? 'hsl(var(--primary))' : v > 15 ? 'hsl(var(--destructive))' : 'hsl(var(--primary))';
  return (
    <div className="flex flex-col items-center text-center p-2">
      <p className="text-xs font-medium text-foreground min-h-8">{label}</p>
      <svg viewBox="0 0 100 58" className="w-28">
        <path d="M10 50 A40 40 0 0 1 90 50" fill="none" stroke="hsl(var(--muted))" strokeWidth="10" strokeLinecap="round" />
        {value != null && <path d="M10 50 A40 40 0 0 1 90 50" fill="none" stroke={color} strokeWidth="10" strokeLinecap="round" strokeDasharray={`${dash} ${c}`} />}
        <text x="50" y="48" textAnchor="middle" className="fill-foreground" fontSize="14" fontWeight="700">{value == null ? '—' : `${fmt(value, 1)}%`}</text>
      </svg>
      <p className="text-[10px] text-muted-foreground">{sub}</p>
    </div>
  );
}

export function StatisticsPanel() {
  const [f, setF] = useState({ from: format(subDays(new Date(), 30), 'yyyy-MM-dd'), to: format(new Date(), 'yyyy-MM-dd'), plate: 'all', driver: 'all' });
  const { data: days = [], isLoading } = useReportDays(f.from, f.to);
  const { data: events = [] } = useBehaviorCounts(f.from, f.to);
  const plates = useMemo(() => [...new Set(days.map(d => d.plate))].sort(), [days]);
  const drivers = useMemo(() => [...new Set(days.filter(d => f.plate === 'all' || d.plate === f.plate).map(d => d.driver))].sort(), [days, f.plate]);
  const byDriver = days.filter(d => f.driver === 'all' || d.driver === f.driver);
  const sel = byDriver.filter(d => f.plate === 'all' || d.plate === f.plate);
  const total = aggregate(sel);
  const ranking = useMemo(() => {
    const rows = [...new Set(byDriver.map(d => d.plate))].map(p => {
      const a = aggregate(byDriver.filter(d => d.plate === p));
      return { plate: p, a, score: rankScore(a, TARGET_KML) };
    });
    return rows.sort((x, y) => (y.score ?? -1) - (x.score ?? -1));
  }, [byDriver]);
  const scores = ranking.filter(r => r.score != null);
  const score = f.plate === 'all' ? (scores.length ? scores.reduce((s, r) => s + r.score!, 0) / scores.length : null) : rankScore(total, TARGET_KML);

  const ev = events.filter(e => (f.plate === 'all' || e.vehicle_plate === f.plate) && (f.driver === 'all' || e.driver_name === f.driver));
  const count = (...t: string[]) => ev.filter(e => t.includes(e.event_type)).length;
  const per100 = (n: number) => (total.km > 0 ? (n / total.km) * 100 : null);

  const cards: [string, string, any][] = [
    ['Km rodado', fmt(total.km, 0), Route], ['Velocidade média', fmt(total.avgSpeed, 1), GaugeIcon], ['Odômetro', fmt(total.odometer, 0), Hash],
    ['Consumo total (L)', fmt(total.liters, 1), Fuel], ['Média km/L', fmt(total.kml), Fuel], ['Consumo hora-motor (L/h)', fmt(total.consHora, 1), Clock],
  ];

  return (
    <div className="space-y-4">
      <Card className="bg-card border-border">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
          <CardTitle>Painel de Estatísticas</CardTitle>
          <PanelFilters {...f} plates={plates} drivers={drivers} onChange={(p) => setF(s => ({ ...s, ...p, ...(p.plate ? { driver: 'all' } : {}) }))} />
        </CardHeader>
      </Card>
      {isLoading ? <p className="text-muted-foreground text-center py-10">Carregando…</p> : (
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="space-y-4">
          <Card className="bg-card border-border"><CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs text-muted-foreground">Veículo</p>
                <p className="text-xl font-bold text-foreground">{f.plate === 'all' ? 'Todos' : f.plate}</p>
                {f.plate !== 'all' && <Button size="sm" variant="ghost" className="px-0 h-6" onClick={() => setF(s => ({ ...s, plate: 'all' }))}><X className="w-3 h-3 mr-1" />Ver todos</Button>}
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Pontuação (0–10)</p>
                <p className="text-3xl font-bold text-primary">{fmt(score)}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {cards.map(([l, v, I]) => (
                <div key={l} className="rounded-lg border border-border bg-background p-3">
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><I className="w-3 h-3" />{l}</p>
                  <p className="text-xl font-bold text-foreground text-right">{v}</p>
                </div>
              ))}
            </div>
          </CardContent></Card>
          <Card className="bg-card border-border"><CardContent className="pt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-muted-foreground text-xs text-right"><th className="text-left">#</th><th className="text-left">Placa</th><th>Vel. média</th><th>Odômetro</th><th>L/h</th><th>Km</th><th>Litros</th><th>Km/L</th><th>Nota</th></tr></thead>
              <tbody>
                {ranking.map((r, i) => (
                  <tr key={r.plate} onClick={() => setF(s => ({ ...s, plate: s.plate === r.plate ? 'all' : r.plate }))}
                    className={`cursor-pointer text-right border-t border-border hover:bg-muted ${f.plate === r.plate ? 'bg-muted' : ''}`}>
                    <td className="text-left py-2">{i + 1}</td><td className="text-left font-medium">{r.plate}</td>
                    <td>{fmt(r.a.avgSpeed, 0)}</td><td>{fmt(r.a.odometer, 0)}</td><td>{fmt(r.a.consHora, 0)}</td>
                    <td>{fmt(r.a.km, 0)}</td><td>{fmt(r.a.liters, 1)}</td><td>{fmt(r.a.kml)}</td><td className="font-semibold">{fmt(r.score)}</td>
                  </tr>
                ))}
                {!ranking.length && <tr><td colSpan={9} className="text-center text-muted-foreground py-6">Sem relatórios no período.</td></tr>}
              </tbody>
            </table>
            <p className="text-[10px] text-muted-foreground mt-2">Clique na linha para analisar só o veículo. Nota: 80% eficiência de km/L (meta {TARGET_KML}) + 20% tempo sem ociosidade.</p>
          </CardContent></Card>
        </div>
        <div className="space-y-4">
          <Card className="bg-card border-border"><CardHeader><CardTitle className="text-base">Metas</CardTitle></CardHeader><CardContent className="grid grid-cols-2 md:grid-cols-3">
            <Gauge kind="meta" label="Tempo em movimento" value={total.movingPct} sub="do tempo com motor ligado" />
            <Gauge kind="meta" label="Eficiência km/L" value={total.kml != null ? Math.min(100, (total.kml / TARGET_KML) * 100) : null} sub={`meta ${TARGET_KML} km/L`} />
          </CardContent></Card>
          <Card className="bg-card border-border"><CardHeader><CardTitle className="text-base">Limites</CardTitle></CardHeader><CardContent className="grid grid-cols-2 md:grid-cols-3">
            <Gauge kind="limite" label="Parado com motor ligado" value={total.idlePct} sub={`${fmt(total.minutesIdle / 60, 1)} h no período`} />
            <LimitCount label="Excesso de velocidade" n={count('speeding')} p={per100(count('speeding'))} />
            <LimitCount label="Excesso de RPM" n={count('high_rpm', 'excessive_rpm')} p={per100(count('high_rpm', 'excessive_rpm'))} />
            <LimitCount label="Frenagem brusca" n={count('harsh_brake', 'harsh_braking')} p={per100(count('harsh_brake', 'harsh_braking'))} />
            <LimitCount label="Aceleração brusca" n={count('harsh_accel', 'harsh_acceleration')} p={per100(count('harsh_accel', 'harsh_acceleration'))} />
          </CardContent></Card>
          <p className="text-xs text-muted-foreground">Faixa Verde, Inércia, Turbo, Banguela e Piloto Automático ainda não são enviados pela TrucksControl na integração; aparecerão aqui quando liberados.</p>
        </div>
      </div>)}
    </div>
  );
}

function LimitCount({ label, n, p }: { label: string; n: number; p: number | null }) {
  return (
    <div className="flex flex-col items-center text-center p-2">
      <p className="text-xs font-medium text-foreground min-h-8">{label}</p>
      <p className={`text-3xl font-bold ${n > 0 ? 'text-destructive' : 'text-primary'}`}>{n}</p>
      <p className="text-[10px] text-muted-foreground">{p == null ? 'eventos' : `${fmt(p, 2)} a cada 100 km`}</p>
    </div>
  );
}
