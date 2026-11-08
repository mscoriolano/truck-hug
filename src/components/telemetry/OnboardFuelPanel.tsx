import { useState } from 'react';
import { AlertTriangle, Fuel, RefreshCw } from 'lucide-react';
import { useVehicles } from '@/hooks/useVehicles';
import { useDrivers } from '@/hooks/useDrivers';
import { useOnboardFuel } from '@/hooks/useOnboardFuel';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export function OnboardFuelPanel({ from, to }: { from?: string; to?: string }) {
  const [plate, setPlate] = useState('all');
  const [driver, setDriver] = useState('all');
  const [page, setPage] = useState(0);
  const vehicles = useVehicles();
  const drivers = useDrivers();
  const report = useOnboardFuel({ plate, driver, from, to });
  const days = report.data?.days ?? [];
  const pageCount = Math.max(1, Math.ceil(days.length / 25));
  const currentPage = Math.min(page, pageCount - 1);
  const registry = (vehicles.data ?? []).filter(v => v.status !== 'inactive' && (plate === 'all' || v.plate === plate));
  return <section className="space-y-6 text-foreground">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div><h2 className="text-xl font-semibold flex items-center gap-2"><Fuel className="h-5 w-5 text-primary" /> Consumo do computador de bordo</h2><p className="text-sm text-muted-foreground">Ignição ligada · Dias em horário de Brasília</p></div>
      <div className="flex flex-wrap gap-3">
        <div className="space-y-1"><label className="text-xs text-muted-foreground" id="fuel-plate-label">Placa</label><Select value={plate} onValueChange={v => { setPlate(v); setPage(0); }}><SelectTrigger aria-labelledby="fuel-plate-label" className="w-40"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todas as placas</SelectItem>{(vehicles.data ?? []).map(v => <SelectItem key={v.id} value={v.plate}>{v.plate}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-1"><label className="text-xs text-muted-foreground" id="fuel-driver-label">Motorista</label><Select value={driver} onValueChange={v => { setDriver(v); setPage(0); }}><SelectTrigger aria-labelledby="fuel-driver-label" className="w-56"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos os motoristas</SelectItem><SelectItem value="unknown">Não identificado</SelectItem>{(drivers.data ?? []).map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent></Select></div>
        <Button variant="outline" size="icon" aria-label="Atualizar relatório de consumo" title="Atualizar relatório de consumo" disabled={report.isFetching} onClick={() => report.refetch()}><RefreshCw className={`h-4 w-4 ${report.isFetching ? 'animate-spin' : ''}`} /></Button>
      </div>
    </div>
    <div className="border-l-4 border-warning bg-muted/40 p-4 flex gap-3" role="status"><AlertTriangle className="h-5 w-5 text-warning shrink-0" /><div><p className="font-medium">Consumo de bordo ainda não disponível</p><p className="text-sm text-muted-foreground mt-1">Os dados recebidos da TrucksControl não contêm litros consumidos nem a média do computador de bordo. O valor anterior da SJU0H94 era calculado a partir de abastecimentos e foi retirado deste relatório.</p><p className="text-sm text-muted-foreground mt-2">É necessário confirmar com a TrucksControl o campo de consumo CAN, sua unidade e sua disponibilidade por veículo. Nível do tanque não é consumo.</p></div></div>
    <div className="grid gap-4 sm:grid-cols-3">
      {[['Combustível consumido', 'N/D', 'Litros · período selecionado'], ['Média do período', 'N/D', 'km/L · computador de bordo'], ['Tempo com ignição ligada', 'N/D', 'Sem duração confirmada na origem']].map(([label, value, detail]) => <Card key={label} className="rounded-lg"><CardContent className="pt-5"><p className="text-sm text-muted-foreground">{label}</p><p className="text-3xl font-semibold mt-2">{value}</p><p className="text-xs text-muted-foreground mt-2">{detail}</p></CardContent></Card>)}
    </div>
    {report.isError || vehicles.isError || drivers.isError ? <div role="alert" className="text-destructive">Não foi possível carregar o relatório. <Button variant="outline" onClick={() => { report.refetch(); vehicles.refetch(); drivers.refetch(); }}>Tentar novamente</Button></div> : report.isPending || vehicles.isPending || drivers.isPending ? <p className="py-8 text-muted-foreground">Carregando registros…</p> : <>
      <div><h3 className="font-semibold mb-3">Disponibilidade por placa</h3><div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Placa</TableHead><TableHead>Veículo</TableHead><TableHead>Consumo (L)</TableHead><TableHead>Média (km/L)</TableHead><TableHead>Fonte</TableHead></TableRow></TableHeader><TableBody>{registry.map(v => <TableRow key={v.id}><TableCell className="font-medium whitespace-nowrap">{v.plate}</TableCell><TableCell>{v.model}</TableCell><TableCell>N/D</TableCell><TableCell>N/D</TableCell><TableCell><Badge variant="outline">Sem consumo CAN</Badge></TableCell></TableRow>)}</TableBody></Table></div></div>
      <div><div className="flex flex-wrap justify-between gap-2 mb-3"><h3 className="font-semibold">Registros diários disponíveis</h3><span className="text-sm text-muted-foreground">{report.data?.readings ?? 0} leituras CAN · {days.length} grupos diários</span></div><div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Dia</TableHead><TableHead>Placa</TableHead><TableHead>Motorista</TableHead><TableHead>Leituras CAN</TableHead><TableHead>Consumo (L)</TableHead><TableHead>Média (km/L)</TableHead></TableRow></TableHeader><TableBody>{days.slice(currentPage * 25, (currentPage + 1) * 25).map(d => <TableRow key={`${d.day}-${d.plate}-${d.driver}`}><TableCell className="whitespace-nowrap">{d.day.split('-').reverse().join('/')}</TableCell><TableCell>{d.plate}</TableCell><TableCell>{d.driver}</TableCell><TableCell>{d.readings}</TableCell><TableCell>N/D</TableCell><TableCell>N/D</TableCell></TableRow>)}{!days.length && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhuma leitura CAN para a placa, motorista e período selecionados. Consumo indisponível, não zero.</TableCell></TableRow>}</TableBody></Table></div>{pageCount > 1 && <div className="flex justify-end items-center gap-3 mt-3"><Button variant="outline" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>Anterior</Button><span className="text-sm">{currentPage + 1} / {pageCount}</span><Button variant="outline" disabled={currentPage + 1 >= pageCount} onClick={() => setPage(currentPage + 1)}>Próxima</Button></div>}</div>
    </>}
  </section>;
}