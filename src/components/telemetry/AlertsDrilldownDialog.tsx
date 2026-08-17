import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
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
}

export function AlertsDrilldownDialog({ open, onOpenChange, title, alerts, onAcknowledge }: AlertsDrilldownDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {title}
            <Badge variant="secondary">{alerts.length}</Badge>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[65vh] pr-3">
          {alerts.length === 0 ? (
            <p className="text-center text-muted-foreground py-10">Nenhum alerta encontrado.</p>
          ) : (
            <div className="space-y-2">
              {alerts.map((a) => (
                <div key={a.id} className="flex items-start gap-3 p-3 rounded-lg border border-border bg-background">
                  <Badge className={`text-[10px] whitespace-nowrap ${SEVERITY_COLORS[a.severity] || SEVERITY_COLORS.info}`}>
                    {ALERT_LABELS[a.alert_type] || a.alert_type}
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
                  </div>
                  {onAcknowledge && !a.acknowledged && (
                    <Button size="sm" variant="outline" onClick={() => onAcknowledge(a.id)}>
                      <CheckCircle className="w-4 h-4 mr-1" /> Arquivar
                    </Button>
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
