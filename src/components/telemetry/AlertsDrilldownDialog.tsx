import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMemo, useState } from 'react';
import { CheckCircle, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { TelemetryAlert } from '@/hooks/useTelemetry';

const ALERT_LABELS: Record<string, string> = {
  speeding: 'Excesso de Velocidade',
  high_rpm: 'RPM Alto',
  excessive_rpm: 'RPM Excessivo',
  battery_violation: 'Bateria',
  low_battery: 'Bateria Baixa',
  fatigue: 'Fadiga',
  distraction: 'Distração',
  journey_violation: 'Violação de Jornada',
  excessive_idle: 'Ociosidade Excessiva',
  harsh_brake: 'Frenagem Brusca',
  harsh_accel: 'Aceleração Brusca',
  maintenance_due: 'Manutenção',
};

const SEVERITY_COLORS: Record<string, string> = {
  info: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  warning: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  critical: 'bg-red-500/20 text-red-400 border-red-500/30',
};

interface AlertsDrilldownDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  alerts: TelemetryAlert[];
  onAcknowledge?: (alertId: string) => void;
  onBulkAcknowledge?: (alertIds: string[]) => Promise<void> | void;
  onRestore?: (alertIds: string[]) => Promise<void> | void;
}

const alertKind = (a: TelemetryAlert) =>
  a.alert_type === 'tracker_alert' ? (a.title || 'Alerta do rastreador') : (ALERT_LABELS[a.alert_type] || a.alert_type);

export function AlertsDrilldownDialog({ open, onOpenChange, title, alerts: allAlerts, onAcknowledge, onBulkAcknowledge, onRestore }: AlertsDrilldownDialogProps) {
  const [status, setStatus] = useState<'pending' | 'archived' | 'all'>('pending');
  const [kind, setKind] = useState('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const kinds = useMemo(() => {
    const m = new Map<string, number>();
    allAlerts.forEach((a) => { const k = alertKind(a); m.set(k, (m.get(k) || 0) + 1); });
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [allAlerts]);
  const alerts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allAlerts.filter((a) =>
      (status === 'all' || (status === 'archived' ? !!a.acknowledged : !a.acknowledged)) &&
      (kind === 'all' || alertKind(a) === kind) &&
      (!q || `${a.vehicle_plate || ''} ${a.driver_name || ''}`.toLowerCase().includes(q)));
  }, [allAlerts, kind, search, status]);
  const pending = alerts.filter((a) => !a.acknowledged);
  const allChecked = pending.length > 0 && pending.every((a) => selected.has(a.id));
  const toggle = (id: string) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () => setSelected(allChecked ? new Set() : new Set(pending.map((a) => a.id)));
  const bulk = async (ids: string[]) => {
    if (!onBulkAcknowledge || !ids.length) return;
    setBusy(true);
    try { await onBulkAcknowledge(ids); setSelected(new Set()); } finally { setBusy(false); }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {title}
            <Badge variant="secondary">{allAlerts.length}</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-1 rounded-lg bg-muted p-1 w-fit">
          {([['pending', 'Pendentes'], ['archived', 'Arquivados'], ['all', 'Todos']] as const).map(([v, l]) => (
            <Button key={v} size="sm" variant={status === v ? 'default' : 'ghost'} onClick={() => { setStatus(v); setSelected(new Set()); }}>
              {l} ({v === 'all' ? allAlerts.length : allAlerts.filter((a) => (v === 'archived') === !!a.acknowledged).length})
            </Button>
          ))}
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Select value={kind} onValueChange={setKind}>
            <SelectTrigger className="sm:w-72"><SelectValue placeholder="Tipo de alerta" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos ({allAlerts.length})</SelectItem>
              {kinds.map(([k, n]) => <SelectItem key={k} value={k}>{k} ({n})</SelectItem>)}
            </SelectContent>
          </Select>
          <Input placeholder="Buscar placa ou motorista" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {onBulkAcknowledge && pending.length > 0 && (
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox checked={allChecked} onCheckedChange={toggleAll} /> Selecionar todos exibidos
            </label>
          )}
          <p className="text-xs text-muted-foreground">Exibindo {alerts.length} de {allAlerts.length} alertas</p>
          {onBulkAcknowledge && (
            <div className="ml-auto flex gap-2">
              <Button size="sm" disabled={busy || selected.size === 0} onClick={() => bulk([...selected])}>
                <CheckCircle className="w-4 h-4 mr-1" /> Arquivar selecionados ({selected.size})
              </Button>
              <Button size="sm" variant="outline" disabled={busy || pending.length === 0} onClick={() => bulk(pending.map((a) => a.id))}>
                Arquivar todos exibidos ({pending.length})
              </Button>
            </div>
          )}
        </div>

        <ScrollArea className="max-h-[65vh] pr-3">
          {alerts.length === 0 ? (
            <p className="text-center text-muted-foreground py-10">Nenhum alerta encontrado.</p>
          ) : (
            <div className="space-y-2">
              {alerts.map((a) => (
                <div key={a.id} className="flex items-start gap-3 p-3 rounded-lg border border-border bg-background">
                  {onBulkAcknowledge && !a.acknowledged && (
                    <Checkbox className="mt-1" checked={selected.has(a.id)} onCheckedChange={() => toggle(a.id)} aria-label="Selecionar alerta" />
                  )}
                  <Badge className={`text-[10px] whitespace-nowrap ${SEVERITY_COLORS[a.severity] || SEVERITY_COLORS.info}`}>
                    {a.alert_type === 'tracker_alert' ? 'Rastreador' : (ALERT_LABELS[a.alert_type] || a.alert_type)}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">
                      {a.vehicle_plate}
                      {a.driver_name && <span className="font-normal text-muted-foreground"> • {a.driver_name}</span>}
                    </p>
                    <p className="text-sm text-muted-foreground">{a.title || a.message}</p>
                    {a.location_name && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                        <MapPin className="w-3 h-3" /> {a.location_name}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {a.event_timestamp &&
                        format(new Date(a.event_timestamp), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })}
                      {a.speed ? ` • ${a.speed} km/h` : ''}
                      {a.speed_limit ? ` (limite ${a.speed_limit})` : ''}
                    </p>
                    {a.acknowledged && a.acknowledged_at && (
                      <p className="text-xs text-muted-foreground">Arquivado em {format(new Date(a.acknowledged_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
                    )}
                  </div>
                  {onAcknowledge && !a.acknowledged && (
                    <Button size="sm" variant="outline" onClick={() => onAcknowledge(a.id)}>
                      <CheckCircle className="w-4 h-4 mr-1" /> Arquivar
                    </Button>
                  )}
                  {onRestore && a.acknowledged && (
                    <Button size="sm" variant="ghost" onClick={() => onRestore([a.id])}>Restaurar</Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
