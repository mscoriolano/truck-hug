import { cn } from '@/lib/utils';
import { AlertTriangle, CheckCircle, Clock, Coffee, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { JourneyCompliance } from '@/hooks/useJourneyCompliance';
import { format, differenceInMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface JourneyComplianceCardProps {
  compliance: JourneyCompliance;
}

export function JourneyComplianceCard({ compliance }: JourneyComplianceCardProps) {
  const formatMinutes = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h${m > 0 ? ` ${m}min` : ''}`;
  };

  const isActive = compliance.journey_start && !compliance.journey_end;
  const hasViolations = !compliance.is_overtime_compliant || !compliance.is_inter_journey_compliant || !compliance.is_weekly_rest_compliant;
  
  // Calcular tempo em andamento se jornada ativa
  const currentWorkedMinutes = isActive && compliance.journey_start
    ? differenceInMinutes(new Date(), new Date(compliance.journey_start)) - (compliance.total_break_minutes || 0)
    : compliance.total_worked_minutes;

  const maxMinutes = 8 * 60; // 8 horas
  const maxWithOvertime = 10 * 60; // 10 horas (8 + 2 extras)
  const progressPercent = (currentWorkedMinutes / maxMinutes) * 100;
  const isApproachingLimit = currentWorkedMinutes >= (7.5 * 60); // 30min antes do limite

  return (
    <div className={cn(
      "relative overflow-hidden rounded-xl border p-4 transition-all duration-300",
      hasViolations ? "bg-destructive/5 border-destructive/30" : "bg-card border-border",
      isActive && "ring-2 ring-primary/50"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-foreground">{compliance.driver_name}</h3>
          {isActive && (
            <Badge className="bg-primary text-primary-foreground animate-pulse">
              Em Jornada
            </Badge>
          )}
        </div>
        <span className="text-sm text-muted-foreground">
          {format(new Date(compliance.journey_date), "dd/MM/yyyy", { locale: ptBR })}
        </span>
      </div>

      {/* Horários */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-success" />
          <div>
            <p className="text-xs text-muted-foreground">Início</p>
            <p className="text-sm font-medium text-foreground">
              {compliance.journey_start 
                ? format(new Date(compliance.journey_start), "HH:mm", { locale: ptBR })
                : '--:--'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-destructive" />
          <div>
            <p className="text-xs text-muted-foreground">Fim</p>
            <p className="text-sm font-medium text-foreground">
              {compliance.journey_end 
                ? format(new Date(compliance.journey_end), "HH:mm", { locale: ptBR })
                : isActive ? 'Em andamento' : '--:--'}
            </p>
          </div>
        </div>
      </div>

      {/* Barra de Progresso */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-muted-foreground">Tempo trabalhado</span>
          <span className={cn(
            "font-medium",
            currentWorkedMinutes > maxWithOvertime ? "text-destructive" :
            currentWorkedMinutes > maxMinutes ? "text-warning" : "text-foreground"
          )}>
            {formatMinutes(currentWorkedMinutes)} / 8h
          </span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className={cn(
              "h-full rounded-full transition-all duration-500",
              currentWorkedMinutes > maxWithOvertime ? "bg-destructive" :
              currentWorkedMinutes > maxMinutes ? "bg-warning" : "bg-primary"
            )}
            style={{ width: `${Math.min(progressPercent, 125)}%` }}
          />
        </div>
        {compliance.overtime_minutes > 0 && (
          <p className={cn(
            "text-xs mt-1",
            compliance.is_overtime_compliant ? "text-warning" : "text-destructive"
          )}>
            Hora extra: {formatMinutes(compliance.overtime_minutes)}
            {!compliance.is_overtime_compliant && " (EXCEDIDO!)"}
          </p>
        )}
      </div>

      {/* Pausas */}
      {compliance.total_break_minutes > 0 && (
        <div className="flex items-center gap-2 mb-4 text-sm">
          <Coffee className="w-4 h-4 text-info" />
          <span className="text-muted-foreground">Pausas:</span>
          <span className="font-medium text-foreground">
            {formatMinutes(compliance.total_break_minutes)}
          </span>
        </div>
      )}

      {/* Status de Conformidade */}
      <div className="flex flex-wrap gap-2">
        <ComplianceStatus 
          label="Hora Extra" 
          compliant={compliance.is_overtime_compliant} 
          warning={isApproachingLimit && isActive}
        />
        <ComplianceStatus 
          label="Descanso 11h" 
          compliant={compliance.is_inter_journey_compliant} 
          detail={compliance.inter_journey_rest_minutes 
            ? `${formatMinutes(compliance.inter_journey_rest_minutes)}` 
            : undefined}
        />
        <ComplianceStatus 
          label="Descanso Semanal" 
          compliant={compliance.is_weekly_rest_compliant} 
        />
      </div>
    </div>
  );
}

function ComplianceStatus({ 
  label, 
  compliant, 
  warning,
  detail 
}: { 
  label: string; 
  compliant: boolean; 
  warning?: boolean;
  detail?: string;
}) {
  return (
    <div className={cn(
      "flex items-center gap-1 px-2 py-1 rounded-md text-xs",
      compliant 
        ? warning 
          ? "bg-warning/10 text-warning" 
          : "bg-success/10 text-success"
        : "bg-destructive/10 text-destructive"
    )}>
      {compliant ? (
        warning ? <AlertTriangle className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />
      ) : (
        <XCircle className="w-3 h-3" />
      )}
      <span>{label}</span>
      {detail && <span className="opacity-70">({detail})</span>}
    </div>
  );
}
