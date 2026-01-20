import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { DriverStatusCard } from '@/components/dashboard/DriverStatusCard';
import { JourneyComplianceCard } from '@/components/journey/JourneyComplianceCard';
import { JourneyEventButton } from '@/components/journey/JourneyEventButton';
import { JourneyStatsCard } from '@/components/journey/JourneyStatsCard';
import { JourneySettingsForm } from '@/components/journey/JourneySettingsForm';
import { useDrivers } from '@/hooks/useDrivers';
import { useJourneyEntries } from '@/hooks/useJourneyEntries';
import { useJourneyCompliance, useJourneyStats, useJourneyLegalSettings } from '@/hooks/useJourneyCompliance';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Clock, Play, Pause, Square, MapPin, User, RefreshCw, AlertTriangle, Settings, Calendar, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const entryTypeConfig = {
  start: { label: 'Início', color: 'bg-success text-success-foreground', icon: Play },
  break_start: { label: 'Início Pausa', color: 'bg-warning text-warning-foreground', icon: Pause },
  break_end: { label: 'Fim Pausa', color: 'bg-info text-info-foreground', icon: Play },
  end: { label: 'Fim', color: 'bg-muted text-muted-foreground', icon: Square },
};

const Jornada = () => {
  const [filter, setFilter] = useState<'all' | 'driving' | 'resting' | 'available' | 'off' | 'terminated' | 'vacation'>('all');
  const [activeTab, setActiveTab] = useState('motoristas');
  
  const { data: drivers, isLoading: driversLoading } = useDrivers();
  const { data: journeyEntries, isLoading: entriesLoading, refetch } = useJourneyEntries();
  const { data: settings } = useJourneyLegalSettings();
  
  // Dados de conformidade da semana atual
  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const weekEnd = format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const { data: weeklyCompliance, isLoading: complianceLoading } = useJourneyCompliance(undefined, weekStart, weekEnd);
  const { data: stats, isLoading: statsLoading } = useJourneyStats();

  const filteredDrivers = drivers?.filter(driver => {
    if (filter === 'all') return true;
    return driver.status === filter;
  }) || [];

  // Converter drivers do banco para o formato esperado pelo DriverStatusCard
  const mappedDrivers = filteredDrivers.map(driver => ({
    id: driver.id,
    name: driver.name,
    phone: driver.phone,
    license: driver.license,
    status: driver.status as 'available' | 'driving' | 'resting' | 'off' | 'terminated' | 'vacation',
    currentVehicle: driver.current_vehicle || undefined,
    journeyStart: driver.journey_start ? new Date(driver.journey_start) : undefined,
    totalHoursToday: driver.total_hours_today || 0,
  }));

  // Filtrar apenas registros de hoje
  const todayEntries = journeyEntries?.filter(entry => {
    const entryDate = new Date(entry.timestamp);
    const today = new Date();
    return entryDate.toDateString() === today.toDateString();
  }) || [];

  // Agrupar conformidade por motorista (hoje)
  const today = format(new Date(), 'yyyy-MM-dd');
  const todayCompliance = weeklyCompliance?.filter(c => c.journey_date === today) || [];

  // Motoristas com violações
  const driversWithViolations = weeklyCompliance?.filter(c => 
    !c.is_overtime_compliant || !c.is_inter_journey_compliant || !c.is_weekly_rest_compliant
  ) || [];

  return (
    <MainLayout 
      title="Controle de Jornada" 
      subtitle="Acompanhe a jornada dos motoristas em tempo real"
    >
      <div className="space-y-6 animate-fade-in">
        {/* Explicação do Sistema */}
        <div className="p-4 rounded-xl bg-info/10 border border-info/30">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-info mt-0.5 shrink-0" />
            <div className="space-y-2">
              <h3 className="font-semibold text-foreground">Como Funciona o Controle de Jornada</h3>
              <div className="text-sm text-muted-foreground space-y-1">
                <p><strong>📱 Via Macro do Rastreador:</strong> Quando o motorista pressiona uma macro configurada (M1, M2, M3, M4) no rastreador, o evento é capturado automaticamente via telemetria.</p>
                <p><strong>📝 Via Portal do Motorista:</strong> O motorista também pode registrar manualmente os eventos pelo Portal do Motorista na aba Jornada.</p>
                <p><strong>⚖️ Conformidade Legal:</strong> O sistema calcula automaticamente horas trabalhadas, extras, descanso interjornada (mín. 11h) e semanal (35h/6 dias).</p>
              </div>
              <div className="pt-2">
                <JourneySettingsForm />
              </div>
            </div>
          </div>
        </div>

        {/* Estatísticas */}
        {stats && <JourneyStatsCard stats={stats} loading={statsLoading} />}

        {/* Alertas de Violação */}
        {driversWithViolations.length > 0 && (
          <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/30">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              <h3 className="font-semibold text-destructive">Violações de Jornada</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              {driversWithViolations.length} registro(s) com violações esta semana. 
              Verifique a conformidade legal dos motoristas.
            </p>
          </div>
        )}

        {/* Ações Rápidas */}
        <div className="flex flex-wrap items-center gap-2 p-4 rounded-xl bg-card border border-border">
          <span className="text-sm font-medium text-foreground mr-2">Registrar (Admin):</span>
          <JourneyEventButton eventType="journey_start" variant="compact" />
          <JourneyEventButton eventType="break_start" variant="compact" />
          <JourneyEventButton eventType="break_end" variant="compact" />
          <JourneyEventButton eventType="journey_end" variant="compact" />
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <TabsList>
              <TabsTrigger value="motoristas" className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Motoristas
              </TabsTrigger>
              <TabsTrigger value="conformidade" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Conformidade
              </TabsTrigger>
              <TabsTrigger value="timeline" className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Timeline
              </TabsTrigger>
            </TabsList>

            {/* Filters - apenas na aba motoristas */}
            {activeTab === 'motoristas' && (
              <div className="flex flex-wrap items-center gap-2">
                {[
                  { value: 'all', label: 'Todos' },
                  { value: 'driving', label: 'Dirigindo' },
                  { value: 'resting', label: 'Descansando' },
                  { value: 'available', label: 'Disponíveis' },
                  { value: 'off', label: 'Folga' },
                ].map((option) => (
                  <Button
                    key={option.value}
                    variant={filter === option.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilter(option.value as typeof filter)}
                    className={cn(
                      filter === option.value && "bg-primary text-primary-foreground"
                    )}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            )}
          </div>

          {/* Tab: Motoristas */}
          <TabsContent value="motoristas" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Drivers Grid */}
              <div className="lg:col-span-2">
                <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <User className="w-5 h-5 text-primary" />
                  Motoristas ({filteredDrivers.length})
                </h2>
                
                {driversLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : mappedDrivers.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    Nenhum motorista encontrado
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {mappedDrivers.map((driver) => (
                      <DriverStatusCard key={driver.id} driver={driver} />
                    ))}
                  </div>
                )}
              </div>

              {/* Journey Timeline */}
              <div>
                <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" />
                  Registro de Hoje ({todayEntries.length})
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => refetch()}
                    className="ml-auto"
                  >
                    <RefreshCw className={cn("h-4 w-4", entriesLoading && "animate-spin")} />
                  </Button>
                </h2>
                
                {entriesLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : todayEntries.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    Nenhum registro hoje
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                    {todayEntries.map((entry) => {
                      const entryType = entry.type as keyof typeof entryTypeConfig;
                      const config = entryTypeConfig[entryType] || entryTypeConfig.start;
                      const Icon = config.icon;
                      
                      return (
                        <div
                          key={entry.id}
                          className="relative rounded-xl bg-card border border-border p-4 transition-all duration-300 hover:shadow-card"
                        >
                          <div className="flex items-start gap-3">
                            <div className={cn(
                              "p-2 rounded-lg",
                              entry.type === 'start' ? "bg-success/20" :
                              entry.type === 'end' ? "bg-muted" :
                              entry.type === 'break_start' ? "bg-warning/20" : "bg-info/20"
                            )}>
                              <Icon className={cn(
                                "w-4 h-4",
                                entry.type === 'start' ? "text-success" :
                                entry.type === 'end' ? "text-muted-foreground" :
                                entry.type === 'break_start' ? "text-warning" : "text-info"
                              )} />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-medium text-foreground text-sm">
                                  {entry.driver_name}
                                </p>
                                <Badge className={cn("text-xs", config.color)}>
                                  {config.label}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground mb-1">
                                {entry.vehicle_plate}
                              </p>
                              {entry.location && (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <MapPin className="w-3 h-3" />
                                  <span>{entry.location}</span>
                                </div>
                              )}
                              <p className="text-xs text-muted-foreground mt-2">
                                {format(new Date(entry.timestamp), "HH:mm", { locale: ptBR })}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Tab: Conformidade */}
          <TabsContent value="conformidade" className="mt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  Conformidade da Semana
                </h2>
                <div className="text-sm text-muted-foreground">
                  {format(new Date(weekStart), "dd/MM", { locale: ptBR })} - {format(new Date(weekEnd), "dd/MM/yyyy", { locale: ptBR })}
                </div>
              </div>

              {complianceLoading ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : weeklyCompliance && weeklyCompliance.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {weeklyCompliance.map((compliance) => (
                    <JourneyComplianceCard key={compliance.id} compliance={compliance} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground rounded-xl border border-border bg-card">
                  <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum registro de jornada esta semana</p>
                  <p className="text-sm mt-2">Use os botões acima para registrar eventos de jornada</p>
                </div>
              )}

              {/* Limites Legais */}
              {settings && (
                <div className="mt-8 p-4 rounded-xl bg-secondary/50 border border-border">
                  <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    Limites Legais Configurados
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Jornada Máxima</p>
                      <p className="font-medium text-foreground">{settings.max_daily_hours}h</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Hora Extra Máx.</p>
                      <p className="font-medium text-foreground">{settings.max_overtime_hours}h</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Descanso Mín.</p>
                      <p className="font-medium text-foreground">{settings.min_inter_journey_hours}h</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Descanso Semanal</p>
                      <p className="font-medium text-foreground">{settings.min_weekly_rest_hours}h / {settings.max_consecutive_work_days} dias</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Tab: Timeline */}
          <TabsContent value="timeline" className="mt-6">
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                Timeline de Eventos
              </h2>
              
              {entriesLoading ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : journeyEntries && journeyEntries.length > 0 ? (
                <div className="space-y-2">
                  {journeyEntries.slice(0, 50).map((entry, index) => {
                    const entryType = entry.type as keyof typeof entryTypeConfig;
                    const config = entryTypeConfig[entryType] || entryTypeConfig.start;
                    const Icon = config.icon;
                    const isNewDay = index === 0 || 
                      new Date(entry.timestamp).toDateString() !== 
                      new Date(journeyEntries[index - 1].timestamp).toDateString();
                    
                    return (
                      <div key={entry.id}>
                        {isNewDay && (
                          <div className="py-2">
                            <span className="text-xs font-medium text-muted-foreground bg-secondary px-3 py-1 rounded-full">
                              {format(new Date(entry.timestamp), "EEEE, dd 'de' MMMM", { locale: ptBR })}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-secondary/50 transition-colors">
                          <div className={cn(
                            "p-2 rounded-lg shrink-0",
                            entry.type === 'start' ? "bg-success/20" :
                            entry.type === 'end' ? "bg-muted" :
                            entry.type === 'break_start' ? "bg-warning/20" : "bg-info/20"
                          )}>
                            <Icon className={cn(
                              "w-4 h-4",
                              entry.type === 'start' ? "text-success" :
                              entry.type === 'end' ? "text-muted-foreground" :
                              entry.type === 'break_start' ? "text-warning" : "text-info"
                            )} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-foreground truncate">{entry.driver_name}</span>
                              <Badge className={cn("text-xs shrink-0", config.color)}>
                                {config.label}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {entry.vehicle_plate}
                              {entry.location && ` • ${entry.location}`}
                            </p>
                          </div>
                          <span className="text-sm text-muted-foreground shrink-0">
                            {format(new Date(entry.timestamp), "HH:mm", { locale: ptBR })}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground rounded-xl border border-border bg-card">
                  <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum evento registrado</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default Jornada;
