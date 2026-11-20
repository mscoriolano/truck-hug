import { useMemo, useState } from 'react';
import { format, subDays } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Clock, MapPin } from 'lucide-react';
import { useDrivingBehaviorEvents } from '@/hooks/useDrivingBehavior';
import { groupIdleSessions, idleSince, type IdleSession } from '@/lib/idleSessions';

export const fmtDur = (m: number) => (m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}min` : `${m} min`);
const fmtT = (s: string) => format(new Date(s), 'dd/MM HH:mm');
const mapLink = (lat?: number | null, lng?: number | null) => (lat != null && lng != null ? `https://www.google.com/maps?q=${lat},${lng}` : null);

type LiveVehicle = { vehicle_plate: string; latitude?: number; longitude?: number; rpm?: number; speed: number; ignition_on: boolean; gps_timestamp?: string; received_at: string };

export function useIdleSessions(from: Date, to: Date) {
  const { data = [], isLoading } = useDrivingBehaviorEvents({ limit: 10000, from, to });
  const sessions = useMemo(() => groupIdleSessions(data.filter((e: any) => e.event_type === 'excessive_idle').map((e: any) => ({
    plate: e.vehicle_plate, driver: e.driver_name ?? null, at: e.event_timestamp, location: e.location_name ?? null,
    lat: e.latitude != null ? Number(e.latitude) : null, lng: e.longitude != null ? Number(e.longitude) : null, rpm: e.rpm ?? null,
  }))), [data]);
  return { sessions, isLoading };
}

export function LiveIdleList({ vehicles, sessions }: { vehicles: LiveVehicle[]; sessions: IdleSession[] }) {
  const idle = vehicles.filter(v => v.ignition_on && v.speed === 0);
  if (!idle.length) return <p className="text-sm text-muted-foreground py-4 text-center">Nenhum veículo ocioso agora.</p>;
  return <div className="space-y-2">{idle.map(v => {
    const seen = v.gps_timestamp || v.received_at;
    const since = idleSince(sessions, v.vehicle_plate, seen);
    const last = sessions.find(s => s.plate === v.vehicle_plate);
    const min = Math.max(0, Math.round((Date.now() - new Date(since).getTime()) / 60000));
    const link = mapLink(v.latitude, v.longitude);
    return <div key={v.vehicle_plate} className="rounded-lg border border-border bg-background p-3 flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className="font-bold text-foreground">{v.vehicle_plate} <span className="text-xs font-normal text-muted-foreground">{last?.driver ?? 'Motorista não identificado'}</span></p>
        <p className="text-sm text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" />{last?.location ?? 'Local sem endereço'}{link && <a className="underline ml-1 text-primary" href={link} target="_blank" rel="noreferrer">ver no mapa</a>}</p>
      </div>
      <div className="text-right">
        <p className="text-sm text-foreground">Parado com motor ligado desde <b>{fmtT(since)}</b> até agora</p>
        <p className="text-xs text-muted-foreground">{fmtDur(min)} ocioso · RPM {v.rpm ?? '—'}</p>
      </div>
    </div>;
  })}</div>;
}

export function IdlePanel({ vehicles }: { vehicles: LiveVehicle[] }) {
  const [from, setFrom] = useState(format(subDays(new Date(), 7), 'yyyy-MM-dd'));
  const [to, setTo] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [plate, setPlate] = useState('all');
  const [driver, setDriver] = useState('all');
  const range = useMemo(() => ({ f: new Date(`${from}T00:00:00`), t: new Date(`${to}T23:59:59`) }), [from, to]);
  const { sessions, isLoading } = useIdleSessions(range.f, range.t);
  const plates = [...new Set(sessions.map(s => s.plate))].sort();
  const drivers = [...new Set(sessions.filter(s => plate === 'all' || s.plate === plate).map(s => s.driver ?? 'Não identificado'))].sort();
  const list = sessions.filter(s => (plate === 'all' || s.plate === plate) && (driver === 'all' || (s.driver ?? 'Não identificado') === driver));
  const totalMin = list.reduce((a, s) => a + s.minutes, 0);
  return <div className="space-y-4">
    <Card className="bg-card border-border"><CardHeader><CardTitle className="text-base flex items-center gap-2"><Clock className="w-4 h-4" />Ociosos agora</CardTitle></CardHeader>
      <CardContent><LiveIdleList vehicles={vehicles} sessions={sessions} /></CardContent></Card>
    <Card className="bg-card border-border">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
        <CardTitle className="text-base">Histórico de ociosidade</CardTitle>
        <div className="flex flex-wrap gap-2">
          <Select value={plate} onValueChange={v => { setPlate(v); setDriver('all'); }}><SelectTrigger className="w-40"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos os veículos</SelectItem>{plates.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select>
          <Select value={driver} onValueChange={setDriver}><SelectTrigger className="w-48"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos os motoristas</SelectItem>{drivers.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent></Select>
          <Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="w-40" />
          <Input type="date" value={to} onChange={e => setTo(e.target.value)} className="w-40" />
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <p className="text-sm text-muted-foreground mb-3">{list.length} períodos · total {fmtDur(totalMin)} ociosos</p>
        {isLoading ? <p className="text-muted-foreground text-center py-6">Carregando…</p> :
        <table className="w-full text-sm">
          <thead><tr className="text-xs text-muted-foreground text-left"><th>Placa</th><th>Motorista</th><th>De</th><th>Até</th><th>Duração</th><th>Local</th><th>RPM máx.</th></tr></thead>
          <tbody>{list.map((s, i) => { const link = mapLink(s.lat, s.lng); return <tr key={i} className="border-t border-border">
            <td className="py-2 font-medium">{s.plate}</td><td>{s.driver ?? '—'}</td><td>{fmtT(s.start)}</td><td>{fmtT(s.end)}</td>
            <td><Badge variant="secondary">{s.events === 1 ? 'Registro único' : fmtDur(s.minutes)}</Badge></td>
            <td>{s.location ?? '—'}{link && <a className="underline ml-1 text-primary" href={link} target="_blank" rel="noreferrer">mapa</a>}</td><td>{s.maxRpm ?? '—'}</td>
          </tr>; })}
          {!list.length && <tr><td colSpan={7} className="text-center text-muted-foreground py-6">Sem ociosidade no período.</td></tr>}</tbody>
        </table>}
      </CardContent>
    </Card>
  </div>;
}
