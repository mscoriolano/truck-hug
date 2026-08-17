import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { History, MapPin, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useTelemetryHistoryLog } from '@/hooks/useTelemetry';

interface TelemetryHistoryPanelProps {
  plates?: string[];
  from?: Date;
  to?: Date;
}

const PAGE_SIZE = 25;

export function TelemetryHistoryPanel({ plates = [], from, to }: TelemetryHistoryPanelProps) {
  const [plate, setPlate] = useState('all');
  const [limit, setLimit] = useState(500);
  const [page, setPage] = useState(1);

  const { data: history, isLoading } = useTelemetryHistoryLog({ plate, from, to, limit });

  const rows = history || [];
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = useMemo(
    () => rows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [rows, currentPage]
  );

  const plateOptions = useMemo(() => {
    const set = new Set<string>([...plates, ...rows.map((r) => r.vehicle_plate)].filter(Boolean));
    return Array.from(set).sort();
  }, [plates, rows]);

  return (
    <Card className="border-slate-800 bg-[#0f172a] text-white">
      <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5 text-blue-400" /> Histórico de Telemetria
          </CardTitle>
          <p className="text-sm text-slate-400">Todos os sinais recebidos e armazenados (não são apagados na atualização)</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={plate} onValueChange={(v) => { setPlate(v); setPage(1); }}>
            <SelectTrigger className="w-[160px] bg-slate-800 border-slate-700 text-white h-9">
              <SelectValue placeholder="Veículo" />
            </SelectTrigger>
            <SelectContent className="bg-[#0f172a] border-slate-700 text-white max-h-72">
              <SelectItem value="all">Todos os veículos</SelectItem>
              {plateOptions.map((p) => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={String(limit)} onValueChange={(v) => { setLimit(Number(v)); setPage(1); }}>
            <SelectTrigger className="w-[140px] bg-slate-800 border-slate-700 text-white h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#0f172a] border-slate-700 text-white">
              <SelectItem value="200">Últimos 200</SelectItem>
              <SelectItem value="500">Últimos 500</SelectItem>
              <SelectItem value="1000">Últimos 1000</SelectItem>
              <SelectItem value="5000">Últimos 5000</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-slate-400 gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Carregando histórico...
          </div>
        ) : rows.length === 0 ? (
          <p className="text-center text-slate-500 py-12">Nenhum registro histórico para o filtro selecionado.</p>
        ) : (
          <>
            <div className="rounded-lg border border-slate-800 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-800 hover:bg-transparent">
                    <TableHead className="text-slate-400">Data/Hora</TableHead>
                    <TableHead className="text-slate-400">Veículo</TableHead>
                    <TableHead className="text-slate-400">Motorista</TableHead>
                    <TableHead className="text-slate-400 text-right">Velocidade</TableHead>
                    <TableHead className="text-slate-400">Ignição</TableHead>
                    <TableHead className="text-slate-400 text-right">Força G</TableHead>
                    <TableHead className="text-slate-400">Evento</TableHead>
                    <TableHead className="text-slate-400">Posição</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageRows.map((r) => {
                    const ts = r.gps_timestamp || r.created_at;
                    const g = Math.sqrt(
                      Number(r.g_force_x || 0) ** 2 + Number(r.g_force_y || 0) ** 2 + Number(r.g_force_z || 0) ** 2
                    );
                    return (
                      <TableRow key={r.id} className="border-slate-800">
                        <TableCell className="whitespace-nowrap text-slate-300">
                          {ts ? format(new Date(ts), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR }) : '-'}
                        </TableCell>
                        <TableCell className="font-semibold">{r.vehicle_plate}</TableCell>
                        <TableCell className="text-slate-400">{r.driver_name || '-'}</TableCell>
                        <TableCell className="text-right font-mono">{r.speed ?? 0} km/h</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={r.ignition_on ? 'border-green-800 text-green-400' : 'border-slate-700 text-slate-400'}>
                            {r.ignition_on ? 'Ligada' : 'Desligada'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono text-slate-300">{g.toFixed(2)}G</TableCell>
                        <TableCell className="text-slate-400">{r.event_type || '-'}</TableCell>
                        <TableCell className="text-slate-400">
                          {r.latitude && r.longitude ? (
                            <a
                              className="inline-flex items-center gap-1 hover:text-blue-400"
                              href={`https://www.google.com/maps?q=${r.latitude},${r.longitude}`}
                              target="_blank"
                              rel="noreferrer"
                            >
                              <MapPin className="w-3 h-3" /> ver mapa
                            </a>
                          ) : '-'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center justify-between mt-4 text-sm text-slate-400">
              <span>{rows.length} registros • página {currentPage} de {totalPages}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>Anterior</Button>
                <Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => setPage(currentPage + 1)}>Próxima</Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
