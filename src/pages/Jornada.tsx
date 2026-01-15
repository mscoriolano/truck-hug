import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { DriverStatusCard } from '@/components/dashboard/DriverStatusCard';
import { useDrivers } from '@/hooks/useDrivers';
import { useJourneyEntries } from '@/hooks/useJourneyEntries';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, Play, Pause, Square, MapPin, User, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const entryTypeConfig = {
  start: { label: 'Início', color: 'bg-success text-success-foreground', icon: Play },
  break_start: { label: 'Início Pausa', color: 'bg-warning text-warning-foreground', icon: Pause },
  break_end: { label: 'Fim Pausa', color: 'bg-info text-info-foreground', icon: Play },
  end: { label: 'Fim', color: 'bg-muted text-muted-foreground', icon: Square },
};

const Jornada = () => {
  const [filter, setFilter] = useState<'all' | 'driving' | 'resting' | 'available' | 'off' | 'terminated' | 'vacation'>('all');
  const { data: drivers, isLoading: driversLoading } = useDrivers();
  const { data: journeyEntries, isLoading: entriesLoading, refetch } = useJourneyEntries();

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

  return (
    <MainLayout 
      title="Controle de Jornada" 
      subtitle="Acompanhe a jornada dos motoristas em tempo real"
    >
      <div className="space-y-6 animate-fade-in">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {[
            { value: 'all', label: 'Todos' },
            { value: 'driving', label: 'Dirigindo' },
            { value: 'resting', label: 'Descansando' },
            { value: 'available', label: 'Disponíveis' },
            { value: 'off', label: 'Folga' },
            { value: 'terminated', label: 'Desligados' },
            { value: 'vacation', label: 'Férias' },
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
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            className="ml-auto"
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", entriesLoading && "animate-spin")} />
            Atualizar
          </Button>
        </div>

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
              <div className="space-y-3">
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
      </div>
    </MainLayout>
  );
};

export default Jornada;
