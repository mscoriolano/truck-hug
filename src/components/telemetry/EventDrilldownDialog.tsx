import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { DrivingBehaviorEvent } from '@/hooks/useDrivingBehavior';

const EVENT_LABELS: Record<string, string> = {
  speeding: 'Excesso Velocidade',
  high_rpm: 'RPM Alto',
  excessive_idle: 'Ociosidade',
  low_battery: 'Bateria Baixa',
  geofence_exit: 'Saída de Zona',
  geofence_enter_restricted: 'Zona Restrita',
  harsh_brake: 'Frenagem Brusca',
  harsh_accel: 'Aceleração Brusca',
};

const SEVERITY_COLORS: Record<string, string> = {
  info: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  warning: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  critical: 'bg-red-500/20 text-red-400 border-red-500/30',
};

interface EventDrilldownDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  events: DrivingBehaviorEvent[];
}

export function EventDrilldownDialog({ open, onOpenChange, title, events }: EventDrilldownDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {title}
            <Badge variant="secondary">{events.length}</Badge>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[65vh] pr-3">
          {events.length === 0 ? (
            <p className="text-center text-muted-foreground py-10">Nenhum evento encontrado.</p>
          ) : (
            <div className="space-y-2">
              {events.map((evt) => (
                <div key={evt.id} className="flex items-start gap-3 p-3 rounded-lg border border-border bg-background">
                  <Badge className={`text-[10px] whitespace-nowrap ${SEVERITY_COLORS[evt.severity] || SEVERITY_COLORS.info}`}>
                    {EVENT_LABELS[evt.event_type] || evt.event_type}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">
                      {evt.vehicle_plate}
                      {evt.driver_name && <span className="font-normal text-muted-foreground"> • {evt.driver_name}</span>}
                    </p>
                    {evt.location_name && (
                      <p className="text-xs text-muted-foreground truncate">{evt.location_name}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {evt.event_timestamp &&
                        format(new Date(evt.event_timestamp), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })}
                    </p>
                  </div>
                  <div className="text-right text-xs text-muted-foreground whitespace-nowrap">
                    {evt.speed !== null && evt.speed !== undefined && <div>{evt.speed} km/h</div>}
                    {evt.rpm ? <div>{evt.rpm} RPM</div> : null}
                    {evt.battery_level ? <div>{evt.battery_level}V</div> : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
