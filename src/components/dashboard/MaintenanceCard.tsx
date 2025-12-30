import { Maintenance } from '@/types/fleet';
import { cn } from '@/lib/utils';
import { Calendar, Truck, Wrench, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface MaintenanceCardProps {
  maintenance: Maintenance;
}

const statusConfig = {
  scheduled: { label: 'Agendada', color: 'bg-info/20 text-info border-info/30', icon: Calendar },
  in_progress: { label: 'Em andamento', color: 'bg-warning/20 text-warning border-warning/30', icon: Wrench },
  completed: { label: 'Concluída', color: 'bg-success/20 text-success border-success/30', icon: CheckCircle },
  overdue: { label: 'Atrasada', color: 'bg-destructive/20 text-destructive border-destructive/30', icon: AlertTriangle },
};

const categoryLabels = {
  engine: 'Motor',
  tires: 'Pneus',
  brakes: 'Freios',
  suspension: 'Suspensão',
  electrical: 'Elétrica',
  general: 'Geral',
};

export function MaintenanceCard({ maintenance }: MaintenanceCardProps) {
  const status = statusConfig[maintenance.status];
  const StatusIcon = status.icon;

  return (
    <div className={cn(
      "relative overflow-hidden rounded-xl bg-card border p-4 transition-all duration-300 hover:shadow-card hover:-translate-y-0.5",
      maintenance.status === 'overdue' && "border-destructive/50"
    )}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={cn(
            "p-2 rounded-lg",
            maintenance.type === 'preventive' ? "bg-info/20" : "bg-warning/20"
          )}>
            <Wrench className={cn(
              "w-4 h-4",
              maintenance.type === 'preventive' ? "text-info" : "text-warning"
            )} />
          </div>
          <div>
            <p className="font-semibold text-foreground text-sm">
              {maintenance.type === 'preventive' ? 'Preventiva' : 'Corretiva'}
            </p>
            <p className="text-xs text-muted-foreground">
              {categoryLabels[maintenance.category]}
            </p>
          </div>
        </div>
        <Badge className={cn("text-xs border", status.color)}>
          <StatusIcon className="w-3 h-3 mr-1" />
          {status.label}
        </Badge>
      </div>

      <p className="text-sm text-foreground mb-3">{maintenance.description}</p>

      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-1 text-muted-foreground">
          <Truck className="w-3.5 h-3.5" />
          <span>{maintenance.vehiclePlate}</span>
        </div>
        <div className="flex items-center gap-1 text-muted-foreground">
          <Clock className="w-3.5 h-3.5" />
          <span>{format(maintenance.scheduledDate, "dd/MM", { locale: ptBR })}</span>
        </div>
      </div>

      {maintenance.cost && (
        <div className="mt-3 pt-3 border-t border-border">
          <p className="text-sm font-medium text-foreground">
            R$ {maintenance.cost.toLocaleString('pt-BR')}
          </p>
        </div>
      )}
    </div>
  );
}
