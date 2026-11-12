import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useDrivingBehaviorEvents } from '@/hooks/useDrivingBehavior';
import { useTripStatistics } from '@/hooks/useTripStatistics';
import { computeIce, classifyEvent, TIER_BONUS_SHARE, IceInput } from '@/lib/gobrax';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Leaf, Loader2, Lightbulb } from 'lucide-react';

/** Minutos de marcha lenta atribuídos a cada evento sem duração informada. */
const IDLE_MINUTES_PER_EVENT = 5;

const tierStyle: Record<string, { label: string; cls: string }> = {
  ouro: { label: 'Ouro', cls: 'bg-warning text-warning-foreground' },
  prata: { label: 'Prata', cls: 'bg-secondary text-secondary-foreground' },
  bronze: { label: 'Bronze', cls: 'bg-accent text-accent-foreground' },
  reciclagem: { label: 'Reciclagem', cls: 'bg-destructive text-destructive-foreground' },
};

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function GobraxPanel({ startDate, endDate }: { startDate?: Date; endDate?: Date }) {
  const [dieselPrice, setDieselPrice] = useState(6);
  const { data: events, isLoading } = useDrivingBehaviorEvents({ limit: 10000, from: startDate, to: endDate });
  const { data: tripStats } = useTripStatistics(startDate, endDate);
  const { data: alerts } = useQuery({
    queryKey: ['gobrax_alerts', startDate?.toISOString(), endDate?.toISOString()],
    queryFn: async () => {
      let q = supabase.from('telemetry_alerts').select('driver_name, vehicle_plate, alert_type, title, idle_duration').limit(10000);
      if (startDate) q = q.gte('event_timestamp', startDate.toISOString());
      if (endDate) q = q.lte('event_timestamp', endDate.toISOString());
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  const rows = useMemo(() => {
    const map = new Map<string, IceInput>();
    const get = (name: string) => {
      if (!map.has(name)) map.set(name, { km: 0, highRpmEvents: 0, idleMinutes: 0, neutralEvents: 0, speedingEvents: 0, harshEvents: 0 });
      return map.get(name)!;
    };
    const add = (name: string, type: string, title?: string, idleSec?: number | null) => {
      const k = classifyEvent(type, title);
      if (!k) return;
      const r = get(name);
      if (k === 'idle') r.idleMinutes += idleSec ? idleSec / 60 : IDLE_MINUTES_PER_EVENT;
      else r[k] += 1;
    };
    events?.forEach((e) => add(e.driver_name || `Veículo ${e.vehicle_plate}`, e.event_type));
    alerts?.forEach((a) => add(a.driver_name || `Veículo ${a.vehicle_plate}`, a.alert_type, a.title, a.idle_duration));
    tripStats?.forEach((s) => { if (s.driver_name) get(s.driver_name).km += Number(s.total_distance_km || 0); });

    return [...map.entries()]
      .map(([name, input]) => {
        const ice = computeIce(input);
        const savings = ice.idleLiters * dieselPrice;
        const worst = [...ice.pillars].sort((a, b) => b.lostPoints - a.lostPoints)[0];
        return { name, input, ice, savings, bonus: savings * TIER_BONUS_SHARE[ice.tier], worst };
      })
      .sort((a, b) => b.ice.score - a.ice.score);
  }, [events, alerts, tripStats, dieselPrice]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
        <CardTitle className="flex items-center gap-2"><Leaf className="w-5 h-5 text-success" />Condução Econômica (ICE) — Master Driver</CardTitle>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          Diesel R$/L
          <Input type="number" step="0.01" className="w-24 h-8" value={dieselPrice} onChange={(e) => setDieselPrice(Number(e.target.value) || 0)} />
        </label>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">
          Pesos: Faixa Verde/RPM 30% · Marcha Lenta 25% · Inércia/Banguela 20% · Condução Segura 25%. Faixas: Ouro ≥ 90 (30% da economia), Prata 80–89 (20%), Bronze 70–79 (10%), abaixo de 70 reciclagem. Diesel em marcha lenta estimado em 2 L/h.
        </p>
        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : rows.length === 0 ? (
          <p className="text-center text-muted-foreground py-6">Sem eventos de condução no período selecionado.</p>
        ) : (
          <div className="space-y-3">
            {rows.map((r, idx) => (
              <div key={r.name} className="rounded-lg border border-border p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground font-bold">{idx + 1}º</span>
                    <span className="font-semibold">{r.name}</span>
                    <Badge className={tierStyle[r.ice.tier].cls}>{tierStyle[r.ice.tier].label}</Badge>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-bold">{r.ice.score}</span><span className="text-muted-foreground">/100</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {r.ice.pillars.map((p) => (
                    <div key={p.key} className="rounded-md bg-muted/50 p-2">
                      <div className="text-xs text-muted-foreground">{p.label}</div>
                      <div className="font-semibold">{p.score} <span className="text-xs text-destructive">{p.lostPoints > 0 ? `-${p.lostPoints} pts` : ''}</span></div>
                    </div>
                  ))}
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <Lightbulb className="w-4 h-4 mt-0.5 text-warning shrink-0" />
                  <span>
                    {r.worst.lostPoints > 0
                      ? `Maior perda: ${r.worst.label} (-${r.worst.lostPoints} pts). `
                      : 'Condução exemplar no período. '}
                    {r.ice.idleLiters > 0 && `${Math.round(r.input.idleMinutes)} min parado com motor ligado ≈ ${r.ice.idleLiters} L (${brl(r.savings)}) desperdiçados. `}
                    {r.bonus > 0 ? `Bônus estimado da faixa: ${brl(r.bonus)}.` : r.ice.tier === 'reciclagem' ? 'Recomendado treinamento de condução econômica.' : ''}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
