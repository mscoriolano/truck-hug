import { cn } from '@/lib/utils';
import { AlertTriangle, CheckCircle, Clock, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface JourneyStatsCardProps {
  stats: {
    totalRecords: number;
    overtimeViolations: number;
    interJourneyViolations: number;
    weeklyRestViolations: number;
    totalWorkedMinutes: number;
    totalOvertimeMinutes: number;
    avgDailyHours: number;
  };
  loading?: boolean;
}

export function JourneyStatsCard({ stats, loading }: JourneyStatsCardProps) {
  const formatMinutes = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    return `${h}h${m > 0 ? ` ${m}min` : ''}`;
  };

  const totalViolations = stats.overtimeViolations + stats.interJourneyViolations + stats.weeklyRestViolations;
  const complianceRate = stats.totalRecords > 0 
    ? ((stats.totalRecords - totalViolations) / stats.totalRecords) * 100 
    : 100;

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-4 bg-muted rounded w-1/2"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="h-8 bg-muted rounded"></div>
            <div className="h-4 bg-muted rounded w-3/4"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Taxa de Conformidade */}
      <Card className={cn(
        complianceRate >= 90 ? "border-success/30" : 
        complianceRate >= 70 ? "border-warning/30" : "border-destructive/30"
      )}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            {complianceRate >= 90 ? (
              <CheckCircle className="w-4 h-4 text-success" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-warning" />
            )}
            Conformidade (7 dias)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className={cn(
            "text-2xl font-bold",
            complianceRate >= 90 ? "text-success" : 
            complianceRate >= 70 ? "text-warning" : "text-destructive"
          )}>
            {complianceRate.toFixed(1)}%
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {stats.totalRecords} jornadas registradas
          </p>
        </CardContent>
      </Card>

      {/* Violações de Hora Extra */}
      <Card className={cn(
        stats.overtimeViolations > 0 ? "border-destructive/30" : "border-success/30"
      )}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Hora Extra (&gt;2h)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className={cn(
            "text-2xl font-bold",
            stats.overtimeViolations > 0 ? "text-destructive" : "text-success"
          )}>
            {stats.overtimeViolations}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            violações na semana
          </p>
        </CardContent>
      </Card>

      {/* Violações de Descanso */}
      <Card className={cn(
        stats.interJourneyViolations > 0 ? "border-destructive/30" : "border-success/30"
      )}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Descanso (&lt;11h)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className={cn(
            "text-2xl font-bold",
            stats.interJourneyViolations > 0 ? "text-destructive" : "text-success"
          )}>
            {stats.interJourneyViolations}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            violações na semana
          </p>
        </CardContent>
      </Card>

      {/* Média Diária */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Média Diária
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-foreground">
            {stats.avgDailyHours.toFixed(1)}h
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Total: {formatMinutes(stats.totalWorkedMinutes)}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
