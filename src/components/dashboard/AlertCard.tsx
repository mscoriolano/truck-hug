import { Alert } from '@/types/fleet';
import { cn } from '@/lib/utils';
import { Bell, Wrench, CircleDot, Clock, AlertTriangle, Info, XCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AlertCardProps {
  alert: Alert;
  onDismiss?: (id: string) => void;
}

const typeIcons = {
  maintenance: Wrench,
  tire: CircleDot,
  journey: Clock,
  general: Bell,
};

const severityStyles = {
  info: {
    bg: 'bg-info/10 border-info/30',
    icon: 'bg-info/20 text-info',
    dot: 'bg-info',
  },
  warning: {
    bg: 'bg-warning/10 border-warning/30',
    icon: 'bg-warning/20 text-warning',
    dot: 'bg-warning',
  },
  critical: {
    bg: 'bg-destructive/10 border-destructive/30',
    icon: 'bg-destructive/20 text-destructive',
    dot: 'bg-destructive',
  },
};

export function AlertCard({ alert, onDismiss }: AlertCardProps) {
  const Icon = typeIcons[alert.type];
  const styles = severityStyles[alert.severity];

  return (
    <div className={cn(
      "relative overflow-hidden rounded-xl border p-4 transition-all duration-300",
      styles.bg,
      !alert.read && "ring-1 ring-inset",
      alert.severity === 'critical' && !alert.read && "ring-destructive/50"
    )}>
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={cn("p-2 rounded-lg flex-shrink-0", styles.icon)}>
          <Icon className="w-4 h-4" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {!alert.read && (
              <div className={cn("w-2 h-2 rounded-full animate-pulse", styles.dot)} />
            )}
            <h4 className="font-semibold text-foreground text-sm">{alert.title}</h4>
          </div>
          <p className="text-sm text-muted-foreground mb-2">{alert.message}</p>
          <p className="text-xs text-muted-foreground">
            {formatDistanceToNow(alert.timestamp, { addSuffix: true, locale: ptBR })}
          </p>
        </div>

        {/* Dismiss */}
        {onDismiss && (
          <button
            onClick={() => onDismiss(alert.id)}
            className="p-1 rounded hover:bg-muted transition-colors"
          >
            <XCircle className="w-4 h-4 text-muted-foreground" />
          </button>
        )}
      </div>
    </div>
  );
}
