import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { DateRangeFilter } from '@/components/DateRangeFilter';
import { useDrivers } from '@/hooks/useDrivers';
import { useFuelEntries } from '@/hooks/useFuelEntries';
import { useMaintenances } from '@/hooks/useMaintenances';
import { useTires } from '@/hooks/useTires';
import { useTrips } from '@/hooks/useTrips';
import { useTripStatistics } from '@/hooks/useTripStatistics';
import { Badge } from '@/components/ui/badge';
import { 
  Loader2, 
  Trophy, 
  Medal, 
  Award,
  Fuel,
  CircleDot,
  Wrench,
  Clock,
  Gauge,
  Star,
  RotateCcw,
  Zap,
  AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

const getRankIcon = (position: number) => {
  switch (position) {
    case 1:
      return <Trophy className="w-6 h-6 text-yellow-500" />;
    case 2:
      return <Medal className="w-6 h-6 text-gray-400" />;
    case 3:
      return <Award className="w-6 h-6 text-amber-600" />;
    default:
      return <span className="w-6 h-6 flex items-center justify-center text-muted-foreground font-bold">{position}º</span>;
  }
};

const getScoreColor = (score: number) => {
  if (score >= 80) return 'text-success';
  if (score >= 60) return 'text-warning';
  return 'text-destructive';
};

const getScoreBadge = (score: number) => {
  if (score >= 90) return { label: 'Excelente', color: 'bg-success text-success-foreground' };
  if (score >= 80) return { label: 'Muito Bom', color: 'bg-success/80 text-success-foreground' };
  if (score >= 70) return { label: 'Bom', color: 'bg-warning text-warning-foreground' };
  if (score >= 60) return { label: 'Regular', color: 'bg-warning/80 text-warning-foreground' };
  return { label: 'Precisa Melhorar', color: 'bg-destructive text-destructive-foreground' };
};

const Gamificacao = () => {
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();

  const { data: drivers, isLoading: loadingDrivers } = useDrivers();
  const { data: fuelEntries, isLoading: loadingFuel } = useFuelEntries(startDate, endDate);
  const { data: maintenances, isLoading: loadingMaint } = useMaintenances();
  const { data: tires, isLoading: loadingTires } = useTires();
  const { data: trips, isLoading: loadingTrips } = useTrips(startDate, endDate);
  const { data: tripStats, isLoading: loadingStats } = useTripStatistics(startDate, endDate);

  const handleDateChange = (start?: Date, end?: Date) => {
    setStartDate(start);
    setEndDate(end);
  };

  const isLoading = loadingDrivers || loadingFuel || loadingMaint || loadingTires || loadingTrips || loadingStats;

  // Calcular pontuações por motorista usando dados reais de telemetria
  const driverPerformance = drivers?.filter(d => d.status !== 'terminated').map(driver => {
    // Abastecimentos do motorista no período
    const driverFuel = fuelEntries?.filter(f => f.driver_id === driver.id) || [];
    const totalLiters = driverFuel.reduce((acc, f) => acc + Number(f.liters), 0);
    const totalKm = driverFuel.length > 1 
      ? Math.max(...driverFuel.map(f => f.mileage)) - Math.min(...driverFuel.map(f => f.mileage))
      : 0;
    const avgConsumption = totalLiters > 0 ? totalKm / totalLiters : 0;
    
    // Ciclos do motorista no período
    const driverTrips = trips?.filter(t => t.driver_id === driver.id) || [];
    const totalCycles = driverTrips.reduce((acc, t) => acc + Number(t.cycle_value), 0);
    
    // Manutenções corretivas
    const correctiveMaint = maintenances?.filter(m => 
      m.type === 'corrective' && m.status === 'completed'
    ).length || 0;
    
    // Pneus críticos
    const criticalTires = tires?.filter(t => 
      t.status === 'critical' || t.status === 'replaced'
    ).length || 0;

    // Estatísticas de telemetria do motorista
    const driverStats = tripStats?.filter(s => s.driver_id === driver.id) || [];
    
    // Calcular métricas de comportamento de direção
    const totalHardBrakes = driverStats.reduce((acc, s) => acc + (s.hard_brakes_count || 0), 0);
    const totalHardAccels = driverStats.reduce((acc, s) => acc + (s.hard_accels_count || 0), 0);
    const totalHardTurns = driverStats.reduce((acc, s) => acc + (s.hard_turns_count || 0), 0);
    const totalTimeOverLimit = driverStats.reduce((acc, s) => acc + (s.time_over_speed_limit_minutes || 0), 0);
    const avgDrivingScore = driverStats.length > 0 
      ? driverStats.reduce((acc, s) => acc + (s.driving_score || 0), 0) / driverStats.length 
      : null;
    const telemetryAvgSpeed = driverStats.length > 0
      ? driverStats.reduce((acc, s) => acc + (s.avg_speed || 0), 0) / driverStats.length
      : null;
    const telemetryConsumption = driverStats.length > 0
      ? driverStats.reduce((acc, s) => acc + (s.avg_consumption_km_per_liter || 0), 0) / driverStats.length
      : null;
    const totalTelemetryKm = driverStats.reduce((acc, s) => acc + (s.total_distance_km || 0), 0);

    // Calcular scores (0-100) com dados reais
    const fuelScore = telemetryConsumption 
      ? Math.min(100, Math.max(0, Math.round(telemetryConsumption * 25))) // Meta: 4 km/L
      : (avgConsumption > 0 ? Math.min(100, Math.max(0, Math.round((avgConsumption / 4) * 100))) : 50);
    
    const tireScore = Math.max(0, 100 - (criticalTires * 15));
    const maintScore = Math.max(0, 100 - (correctiveMaint * 10));
    const journeyScore = driver.status === 'driving' || driver.status === 'available' ? 85 : 70;
    
    // Score de velocidade baseado em tempo acima do limite e eventos
    const speedPenalty = (totalTimeOverLimit * 0.5) + (totalHardAccels * 2);
    const speedScore = avgDrivingScore !== null 
      ? Math.round(avgDrivingScore) 
      : Math.max(0, 100 - speedPenalty);
    
    // Score de G-Force (frenagens + acelerações bruscas + curvas)
    const gForcePenalty = (totalHardBrakes * 3) + (totalHardAccels * 2) + (totalHardTurns * 2);
    const gForceScore = Math.max(0, 100 - gForcePenalty);

    // Score total (agora inclui comportamento de direção)
    const totalScore = Math.round(
      (fuelScore * 0.2) + 
      (tireScore * 0.1) + 
      (maintScore * 0.1) + 
      (journeyScore * 0.15) + 
      (speedScore * 0.25) + 
      (gForceScore * 0.2)
    );

    return {
      id: driver.id,
      name: driver.name,
      status: driver.status,
      fuelScore,
      tireScore,
      maintScore,
      journeyScore,
      speedScore,
      gForceScore,
      totalScore,
      avgConsumption: telemetryConsumption?.toFixed(2) || avgConsumption.toFixed(2),
      totalKm: totalTelemetryKm > 0 ? totalTelemetryKm : totalKm,
      totalCycles,
      tireIncidents: criticalTires,
      correctiveMaint,
      abastecimentos: driverFuel.length,
      // Novas métricas de telemetria
      hardBrakes: totalHardBrakes,
      hardAccels: totalHardAccels,
      hardTurns: totalHardTurns,
      timeOverLimit: totalTimeOverLimit,
      avgSpeed: telemetryAvgSpeed?.toFixed(0),
      tripsCount: driverStats.length,
    };
  }).sort((a, b) => b.totalScore - a.totalScore) || [];

  const topPerformer = driverPerformance[0];

  if (isLoading) {
    return (
      <MainLayout title="Gamificação" subtitle="Ranking e performance dos motoristas">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout 
      title="Gamificação" 
      subtitle="Ranking e performance dos motoristas"
    >
      <div className="space-y-6 animate-fade-in">
        {/* Period Filter */}
        <div className="flex items-center justify-between">
          <DateRangeFilter
            startDate={startDate}
            endDate={endDate}
            onDateChange={handleDateChange}
          />
        </div>

        {/* Top Performer Highlight */}
        {topPerformer && (
          <div className="rounded-xl bg-gradient-to-r from-yellow-500/20 via-amber-500/10 to-orange-500/20 border border-yellow-500/30 p-6">
            <div className="flex items-center gap-4">
              <div className="p-4 rounded-full bg-yellow-500/20">
                <Trophy className="w-10 h-10 text-yellow-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Melhor Performance do Período</p>
                <h2 className="text-2xl font-bold text-foreground">{topPerformer.name}</h2>
                <div className="flex items-center gap-4 mt-1">
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                    <span className="text-lg font-semibold text-yellow-500">{topPerformer.totalScore} pontos</span>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <RotateCcw className="w-4 h-4" />
                    <span className="text-sm">{topPerformer.totalCycles.toFixed(1)} ciclos</span>
                  </div>
                  {topPerformer.tripsCount > 0 && (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Gauge className="w-4 h-4" />
                      <span className="text-sm">{topPerformer.tripsCount} viagens monitoradas</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="hidden md:block">
                <ResponsiveContainer width={200} height={150}>
                  <RadarChart data={[
                    { metric: 'Combustível', value: topPerformer.fuelScore },
                    { metric: 'Velocidade', value: topPerformer.speedScore },
                    { metric: 'Força G', value: topPerformer.gForceScore },
                    { metric: 'Pneus', value: topPerformer.tireScore },
                    { metric: 'Manutenção', value: topPerformer.maintScore },
                    { metric: 'Jornada', value: topPerformer.journeyScore },
                  ]}>
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis 
                      dataKey="metric" 
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                    />
                    <Radar
                      dataKey="value"
                      stroke="hsl(45 93% 47%)"
                      fill="hsl(45 93% 47%)"
                      fillOpacity={0.3}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* Legenda de métricas - atualizada com novas métricas */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          {[
            { icon: Fuel, label: 'Consumo', desc: 'Eficiência combustível' },
            { icon: Gauge, label: 'Velocidade', desc: 'Respeito aos limites' },
            { icon: Zap, label: 'Força G', desc: 'Suavidade na direção' },
            { icon: CircleDot, label: 'Pneus', desc: 'Cuidado com pneus' },
            { icon: Wrench, label: 'Manutenção', desc: 'Evitar corretivas' },
            { icon: Clock, label: 'Jornada', desc: 'Cumprimento horários' },
          ].map((item, i) => (
            <div key={i} className="rounded-lg bg-card border border-border p-3 text-center">
              <item.icon className="w-5 h-5 text-primary mx-auto mb-1" />
              <p className="text-sm font-medium text-foreground">{item.label}</p>
              <p className="text-xs text-muted-foreground">{item.desc}</p>
            </div>
          ))}
        </div>

        {/* Ranking */}
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="bg-secondary p-4">
            <h3 className="font-semibold text-foreground">Ranking de Motoristas</h3>
            <p className="text-sm text-muted-foreground">Inclui dados de telemetria em tempo real</p>
          </div>
          <div className="divide-y divide-border">
            {driverPerformance.map((driver, index) => {
              const badge = getScoreBadge(driver.totalScore);
              
              return (
                <div 
                  key={driver.id}
                  className={cn(
                    "p-4 hover:bg-secondary/50 transition-colors",
                    index === 0 && "bg-yellow-500/5"
                  )}
                >
                  <div className="flex items-center gap-4">
                    {/* Posição */}
                    <div className="w-12 flex justify-center">
                      {getRankIcon(index + 1)}
                    </div>
                    
                    {/* Nome e Badge */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">{driver.name}</span>
                        <Badge className={cn("text-xs", badge.color)}>
                          {badge.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground flex-wrap">
                        <span>Média: {driver.avgConsumption} km/L</span>
                        <span>•</span>
                        <span>{driver.totalKm.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} km</span>
                        <span>•</span>
                        <span>{driver.totalCycles.toFixed(1)} ciclos</span>
                        {driver.tripsCount > 0 && (
                          <>
                            <span>•</span>
                            <span className="text-primary">{driver.tripsCount} viagens monitoradas</span>
                          </>
                        )}
                      </div>
                      {/* Detalhes de telemetria */}
                      {(driver.hardBrakes > 0 || driver.hardAccels > 0 || driver.timeOverLimit > 0) && (
                        <div className="flex items-center gap-3 mt-1.5">
                          {driver.hardBrakes > 0 && (
                            <span className="text-xs text-warning flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              {driver.hardBrakes} frenagens
                            </span>
                          )}
                          {driver.hardAccels > 0 && (
                            <span className="text-xs text-warning flex items-center gap-1">
                              <Zap className="w-3 h-3" />
                              {driver.hardAccels} acelerações
                            </span>
                          )}
                          {driver.timeOverLimit > 0 && (
                            <span className="text-xs text-destructive flex items-center gap-1">
                              <Gauge className="w-3 h-3" />
                              {driver.timeOverLimit}min acima limite
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    
                    {/* Scores individuais */}
                    <div className="hidden lg:flex items-center gap-3">
                      {[
                        { label: 'Comb', value: driver.fuelScore },
                        { label: 'Veloc', value: driver.speedScore },
                        { label: 'G', value: driver.gForceScore },
                        { label: 'Pneus', value: driver.tireScore },
                        { label: 'Manut', value: driver.maintScore },
                        { label: 'Jorn', value: driver.journeyScore },
                      ].map((score, i) => (
                        <div key={i} className="text-center">
                          <p className="text-xs text-muted-foreground">{score.label}</p>
                          <p className={cn("font-semibold text-sm", getScoreColor(score.value))}>
                            {score.value}
                          </p>
                        </div>
                      ))}
                    </div>
                    
                    {/* Score total */}
                    <div className="text-right">
                      <p className={cn("text-2xl font-bold", getScoreColor(driver.totalScore))}>
                        {driver.totalScore}
                      </p>
                      <p className="text-xs text-muted-foreground">pontos</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Gráfico comparativo - atualizado com nova métrica */}
        {driverPerformance.length > 0 && (
          <div className="rounded-xl bg-card border border-border p-5">
            <h3 className="font-semibold text-foreground mb-4">Comparativo de Performance</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={driverPerformance.slice(0, 5)}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  tickFormatter={(value) => value.split(' ')[0]}
                />
                <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} domain={[0, 100]} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="fuelScore" name="Combustível" fill="hsl(199 89% 48%)" radius={[2, 2, 0, 0]} />
                <Bar dataKey="speedScore" name="Velocidade" fill="hsl(340 80% 60%)" radius={[2, 2, 0, 0]} />
                <Bar dataKey="gForceScore" name="Força G" fill="hsl(280 80% 60%)" radius={[2, 2, 0, 0]} />
                <Bar dataKey="tireScore" name="Pneus" fill="hsl(142 76% 36%)" radius={[2, 2, 0, 0]} />
                <Bar dataKey="maintScore" name="Manutenção" fill="hsl(45 93% 47%)" radius={[2, 2, 0, 0]} />
                <Bar dataKey="journeyScore" name="Jornada" fill="hsl(220 80% 60%)" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {driverPerformance.length === 0 && (
          <div className="text-center py-12 rounded-xl border border-border bg-card">
            <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              Cadastre motoristas e registre atividades para ver o ranking
            </p>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Gamificacao;
