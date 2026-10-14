import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout/MainLayout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileSpreadsheet, FileText, Loader2, RefreshCw } from 'lucide-react';
import { format, subDays } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';

type Row = Record<string, any>;

async function fetchAll(table: string, dateCol: string, from: string, to: string, plate: string) {
  const out: Row[] = [];
  for (let page = 0; page < 20; page++) {
    let q = (supabase.from(table as any) as any)
      .select('*')
      .gte(dateCol, from)
      .lte(dateCol, to)
      .order(dateCol, { ascending: false })
      .range(page * 1000, page * 1000 + 999);
    if (plate !== 'all') q = q.eq('vehicle_plate', plate);
    const { data, error } = await q;
    if (error) throw error;
    out.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  return out;
}

const fmt = (d?: string) => (d ? format(new Date(d), 'dd/MM/yyyy HH:mm') : '');
const n = (v: any, dec = 1) => (v == null || isNaN(Number(v)) ? '-' : Number(v).toFixed(dec));

const typeLabels: Record<string, string> = {
  tracker_alert: 'Alerta do rastreador',
  speeding: 'Excesso de velocidade',
  high_rpm: 'RPM elevado',
  excessive_rpm: 'RPM excessivo',
  battery_violation: 'Violação de bateria',
  hard_brake: 'Frenagem brusca',
  hard_acceleration: 'Aceleração brusca',
  idle: 'Motor ocioso',
  geofence: 'Cerca virtual',
};
const label = (t: string) => typeLabels[t] || t;

function groupCount(rows: Row[], key: (r: Row) => string) {
  const m = new Map<string, number>();
  rows.forEach((r) => m.set(key(r), (m.get(key(r)) || 0) + 1));
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

export default function Relatorios() {
  const [from, setFrom] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [to, setTo] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [plate, setPlate] = useState('all');

  const { data: vehicles = [] } = useQuery({
    queryKey: ['report_vehicles'],
    queryFn: async () => (await supabase.from('vehicles').select('plate').order('plate')).data || [],
  });

  const fromIso = new Date(`${from}T00:00:00`).toISOString();
  const toIso = new Date(`${to}T23:59:59`).toISOString();

  const { data, isFetching, refetch } = useQuery({
    queryKey: ['fleet_report', fromIso, toIso, plate],
    queryFn: async () => {
      const [alerts, events, trips, fuel] = await Promise.all([
        fetchAll('telemetry_alerts', 'event_timestamp', fromIso, toIso, plate),
        fetchAll('driving_behavior_events', 'event_timestamp', fromIso, toIso, plate),
        fetchAll('trip_statistics', 'start_time', fromIso, toIso, plate),
        fetchAll('fuel_entries', 'entry_date', fromIso, toIso, plate),
      ]);
      return { alerts, events, trips, fuel };
    },
  });

  const alerts = data?.alerts || [];
  const events = data?.events || [];
  const trips = data?.trips || [];
  const fuel = data?.fuel || [];

  const summary = useMemo(() => {
    const plates = new Set<string>();
    [...alerts, ...events, ...trips, ...fuel].forEach((r) => r.vehicle_plate && plates.add(r.vehicle_plate));
    return [...plates].sort().map((p) => {
      const a = alerts.filter((r) => r.vehicle_plate === p);
      const e = events.filter((r) => r.vehicle_plate === p);
      const t = trips.filter((r) => r.vehicle_plate === p);
      const f = fuel.filter((r) => r.vehicle_plate === p);
      const km = t.reduce((s, r) => s + Number(r.total_distance_km || 0), 0);
      const liters = f.reduce((s, r) => s + Number(r.liters || 0), 0);
      const cost = f.reduce((s, r) => s + Number(r.total_cost || 0), 0);
      const scores = t.map((r) => r.driving_score).filter((v) => v != null);
      return {
        Placa: p,
        'Alertas rastreador': a.filter((r) => r.alert_type === 'tracker_alert').length,
        'Alertas totais': a.length,
        'Críticos': a.filter((r) => r.severity === 'critical').length + e.filter((r) => r.severity === 'critical').length,
        'Excesso velocidade': e.filter((r) => r.event_type === 'speeding').length + a.filter((r) => r.alert_type === 'speeding').length,
        'Eventos condução': e.length,
        'Km rodados': Number(km.toFixed(1)),
        'Litros': Number(liters.toFixed(1)),
        'Custo combustível (R$)': Number(cost.toFixed(2)),
        'Km/L': liters > 0 && km > 0 ? Number((km / liters).toFixed(2)) : null,
        'Score médio': scores.length ? Math.round(scores.reduce((s, v) => s + v, 0) / scores.length) : null,
      };
    });
  }, [alerts, events, trips, fuel]);

  const alertsByType = groupCount(alerts, (r) => (r.alert_type === 'tracker_alert' ? r.title : label(r.alert_type)));
  const eventsByType = groupCount(events, (r) => label(r.event_type));

  const alertRows = alerts.map((r) => ({
    'Data/Hora': fmt(r.event_timestamp),
    Placa: r.vehicle_plate,
    Motorista: r.driver_name || '',
    Origem: r.alert_type === 'tracker_alert' ? 'Rastreador' : 'App',
    Alerta: r.title,
    Severidade: r.severity,
    Velocidade: r.speed ?? '',
    Local: r.location_name || '',
    Reconhecido: r.acknowledged ? 'Sim' : 'Não',
  }));
  const eventRows = events.map((r) => ({
    'Data/Hora': fmt(r.event_timestamp),
    Placa: r.vehicle_plate,
    Motorista: r.driver_name || '',
    Evento: label(r.event_type),
    Severidade: r.severity,
    Velocidade: r.speed ?? '',
    RPM: r.rpm ?? '',
    Local: r.location_name || '',
  }));
  const tripRows = trips.map((r) => ({
    Início: fmt(r.start_time),
    Fim: fmt(r.end_time),
    Placa: r.vehicle_plate,
    Motorista: r.driver_name || '',
    'Km': n(r.total_distance_km),
    'Vel. média': r.avg_speed ?? '',
    'Vel. máx.': r.max_speed ?? '',
    'Km/L': n(r.avg_consumption_km_per_liter, 2),
    'Ocioso (min)': r.total_idle_time_minutes ?? '',
    Frenagens: r.hard_brakes_count ?? 0,
    Acelerações: r.hard_accels_count ?? 0,
    Score: r.driving_score ?? '',
  }));

  const periodText = `${format(new Date(`${from}T12:00:00`), 'dd/MM/yyyy')} a ${format(new Date(`${to}T12:00:00`), 'dd/MM/yyyy')}`;
  const fileBase = `relatorio-frota-${from}_a_${to}${plate !== 'all' ? '-' + plate : ''}`;

  const exportExcel = () => {
    const wb = XLSX.utils.book_new();
    const add = (rows: Row[], name: string) =>
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows.length ? rows : [{ Info: 'Sem dados no período' }]), name);
    add(summary, 'Resumo por veículo');
    add(alertsByType.map(([k, v]) => ({ Alerta: k, Quantidade: v })), 'Alertas por tipo');
    add(alertRows, 'Alertas');
    add(eventRows, 'Eventos de condução');
    add(tripRows, 'Viagens');
    XLSX.writeFile(wb, `${fileBase}.xlsx`);
    toast.success('Excel exportado');
  };

  const exportPdf = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(16);
    doc.text('Relatório de Telemetria da Frota', 14, 16);
    doc.setFontSize(9);
    doc.text(`Período: ${periodText}   Veículo: ${plate === 'all' ? 'Todos' : plate}   Gerado em ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 22);
    doc.text(`Alertas: ${alerts.length}   Eventos de condução: ${events.length}   Viagens: ${trips.length}`, 14, 27);
    const section = (title: string, rows: Row[], max = 500) => {
      if (!rows.length) return;
      const y = ((doc as any).lastAutoTable?.finalY ?? 30) + 8;
      doc.setFontSize(12);
      doc.text(title, 14, y);
      autoTable(doc, {
        startY: y + 3,
        head: [Object.keys(rows[0])],
        body: rows.slice(0, max).map((r) => Object.values(r).map((v) => (v == null ? '-' : String(v)))),
        styles: { fontSize: 7 },
        headStyles: { fillColor: [59, 130, 246] },
      });
    };
    section('Resumo por veículo', summary);
    section('Alertas por tipo', alertsByType.map(([k, v]) => ({ Alerta: k, Quantidade: v })));
    section('Alertas (detalhe)', alertRows);
    section('Eventos de condução', eventRows);
    section('Viagens', tripRows);
    doc.save(`${fileBase}.pdf`);
    toast.success('PDF exportado');
  };

  const SimpleTable = ({ rows }: { rows: Row[] }) =>
    rows.length === 0 ? (
      <p className="text-sm text-muted-foreground py-6 text-center">Sem dados no período.</p>
    ) : (
      <div className="max-h-[520px] overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>{Object.keys(rows[0]).map((k) => <TableHead key={k}>{k}</TableHead>)}</TableRow>
          </TableHeader>
          <TableBody>
            {rows.slice(0, 500).map((r, i) => (
              <TableRow key={i}>{Object.values(r).map((v, j) => <TableCell key={j} className="whitespace-nowrap">{v == null ? '-' : String(v)}</TableCell>)}</TableRow>
            ))}
          </TableBody>
        </Table>
        {rows.length > 500 && <p className="text-xs text-muted-foreground p-2">Mostrando 500 de {rows.length}. A exportação inclui todos.</p>}
      </div>
    );

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Relatórios de Telemetria</h1>
          <p className="text-muted-foreground">Alertas do rastreador, condução, viagens e consumo para tomada de decisão.</p>
        </div>

        <Card>
          <CardContent className="pt-6 flex flex-wrap items-end gap-4">
            <div className="space-y-1"><Label>De</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
            <div className="space-y-1"><Label>Até</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
            <div className="space-y-1 w-48">
              <Label>Veículo</Label>
              <Select value={plate} onValueChange={setPlate}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {vehicles.map((v: any) => <SelectItem key={v.plate} value={v.plate}>{v.plate}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
              {isFetching ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}Atualizar
            </Button>
            <div className="ml-auto flex gap-2">
              <Button variant="outline" onClick={exportPdf} disabled={isFetching}><FileText className="w-4 h-4 mr-2" />PDF</Button>
              <Button onClick={exportExcel} disabled={isFetching}><FileSpreadsheet className="w-4 h-4 mr-2" />Excel</Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            ['Alertas do rastreador', alerts.filter((a) => a.alert_type === 'tracker_alert').length],
            ['Alertas totais', alerts.length],
            ['Eventos de condução', events.length],
            ['Viagens', trips.length],
          ].map(([t, v]) => (
            <Card key={t as string}><CardContent className="pt-6"><p className="text-sm text-muted-foreground">{t}</p><p className="text-3xl font-bold">{v}</p></CardContent></Card>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Alertas por tipo</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {alertsByType.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum</p> :
                alertsByType.map(([k, v]) => <Badge key={k} variant="secondary">{k}: {v}</Badge>)}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Eventos de condução por tipo</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {eventsByType.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum</p> :
                eventsByType.map(([k, v]) => <Badge key={k} variant="secondary">{k}: {v}</Badge>)}
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="resumo">
          <TabsList>
            <TabsTrigger value="resumo">Resumo por veículo</TabsTrigger>
            <TabsTrigger value="alertas">Alertas ({alerts.length})</TabsTrigger>
            <TabsTrigger value="eventos">Condução ({events.length})</TabsTrigger>
            <TabsTrigger value="viagens">Viagens ({trips.length})</TabsTrigger>
          </TabsList>
          <Card className="mt-4"><CardContent className="pt-4">
            <TabsContent value="resumo"><SimpleTable rows={summary} /></TabsContent>
            <TabsContent value="alertas"><SimpleTable rows={alertRows} /></TabsContent>
            <TabsContent value="eventos"><SimpleTable rows={eventRows} /></TabsContent>
            <TabsContent value="viagens"><SimpleTable rows={tripRows} /></TabsContent>
          </CardContent></Card>
        </Tabs>
      </div>
    </MainLayout>
  );
}
