import { useMemo, useState } from 'react';
import { format, subMonths, startOfMonth, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, Fuel, Wallet, Route, TrendingUp, Cloud } from 'lucide-react';
import { useReportDays } from '@/hooks/useReportDays';
import { useFuelEntries } from '@/hooks/useFuelEntries';
import { aggregate, avgPricePerLiter, monthlyKml } from '@/lib/fleetStats';
import { PanelFilters } from './PanelFilters';

const n = (v: number | null, d = 2) => (v == null ? '—' : v.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d }));
const brl = (v: number | null) => (v == null ? '—' : v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));

export function FuelSummaryPanel() {
  const [f, setF] = useState({ from: format(startOfMonth(subMonths(new Date(), 2)), 'yyyy-MM-dd'), to: format(new Date(), 'yyyy-MM-dd'), plate: 'all', driver: 'all' });
  const { data: days = [], isLoading } = useReportDays(f.from, f.to);
  const { data: entries = [] } = useFuelEntries() as any;
  const plates = useMemo(() => [...new Set(days.map(d => d.plate))].sort(), [days]);
  const drivers = useMemo(() => [...new Set(days.filter(d => f.plate === 'all' || d.plate === f.plate).map(d => d.driver))].sort(), [days, f.plate]);
  const byDriver = days.filter(d => f.driver === 'all' || d.driver === f.driver);
  const sel = byDriver.filter(d => f.plate === 'all' || d.plate === f.plate);
  const a = aggregate(sel);
  const fe = (entries as any[]).filter(e => {
    const day = String(e.entry_date).slice(0, 10);
    return day >= f.from && day <= f.to && (f.plate === 'all' || e.vehicle_plate === f.plate) && (f.driver === 'all' || e.driver_name === f.driver);
  });
  const price = avgPricePerLiter(fe);
  const monthly = monthlyKml(sel).map(m => ({ ...m, label: format(parseISO(`${m.month}-01`), 'MMM/yy', { locale: ptBR }).toUpperCase(), kml: m.kml ? Number(m.kml.toFixed(2)) : 0 }));
  const table = [...new Set(byDriver.map(d => d.plate))].sort().map(p => ({ plate: p, ...aggregate(byDriver.filter(d => d.plate === p)) }));

  const cards: [string, string, any][] = [
    ['Valor médio por litro', brl(price), DollarSign], ['Litros totais consumidos', `${n(a.liters, 1)} L`, Fuel],
    ['Valor total gasto', price != null ? brl(price * a.liters) : '—', Wallet], ['Km total rodado', `${n(a.km, 0)} km`, Route],
    ['Média de km por litro', `${n(a.kml)} km/L`, TrendingUp], ['CO2 emitido', `${n(a.co2Kg, 0)} kg`, Cloud],
  ];

  return (
    <div className="space-y-4">
      <Card className="bg-card border-border">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
          <CardTitle>Resumo de Consumo de Combustível</CardTitle>
          <PanelFilters {...f} plates={plates} drivers={drivers} onChange={(p) => setF(s => ({ ...s, ...p, ...(p.plate ? { driver: 'all' } : {}) }))} />
        </CardHeader>
        <CardContent>
          {isLoading ? <p className="text-muted-foreground text-center py-6">Carregando…</p> : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {cards.map(([l, v, I]) => (
                <div key={l} className="rounded-lg border border-primary/30 bg-primary/10 p-4">
                  <p className="text-sm text-muted-foreground flex items-center gap-2"><I className="w-4 h-4 text-primary" />{l}</p>
                  <p className="text-2xl font-bold text-foreground mt-2">{v}</p>
                </div>
              ))}
            </div>
          )}
          <p className="text-[10px] text-muted-foreground mt-3">Litros e km vêm do computador de bordo (relatório D-1). Valor por litro é a média ponderada dos abastecimentos lançados no período{fe.length ? ` (${fe.length} abastecimentos)` : ' — nenhum abastecimento lançado'}. CO2 = litros × 2,58 kg.</p>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-5 gap-4">
        <Card className="bg-card border-border lg:col-span-2"><CardContent className="pt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-xs text-muted-foreground text-right"><th className="text-left">Veículo</th><th>Consumo (L)</th><th>Km</th><th>Km/L</th></tr></thead>
            <tbody>{table.map(r => (
              <tr key={r.plate} onClick={() => setF(s => ({ ...s, plate: s.plate === r.plate ? 'all' : r.plate, driver: 'all' }))}
                className={`cursor-pointer text-right border-t border-border hover:bg-muted ${f.plate === r.plate ? 'bg-muted' : ''}`}>
                <td className="text-left py-2 font-medium">{r.plate}</td><td>{n(r.liters, 1)}</td><td>{n(r.km, 0)}</td><td>{n(r.kml)}</td>
              </tr>))}
              {!table.length && <tr><td colSpan={4} className="text-center text-muted-foreground py-6">Sem dados no período.</td></tr>}
            </tbody>
          </table>
        </CardContent></Card>
        <Card className="bg-card border-border lg:col-span-3">
          <CardHeader><CardTitle className="text-base">Evolução da média por mês — {f.plate === 'all' ? 'Frota' : f.plate}{f.driver !== 'all' ? ` • ${f.driver}` : ''}</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip formatter={(v: number) => `${n(v)} km/L`} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                <Bar dataKey="kml" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]}><LabelList dataKey="kml" position="top" className="fill-foreground" fontSize={12} /></Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
