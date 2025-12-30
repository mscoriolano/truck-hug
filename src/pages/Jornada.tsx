import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { DriverStatusCard } from '@/components/dashboard/DriverStatusCard';
import { mockDrivers, mockJourneyEntries } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, Play, Pause, Square, MapPin, User } from 'lucide-react';
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
  const [filter, setFilter] = useState<'all' | 'driving' | 'resting' | 'available'>('all');

  const filteredDrivers = mockDrivers.filter(driver => {
    if (filter === 'all') return true;
    return driver.status === filter;
  });

  return (
    <MainLayout 
      title="Controle de Jornada" 
      subtitle="Acompanhe a jornada dos motoristas em tempo real"
    >
      <div className="space-y-6 animate-fade-in">
        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          {[
            { value: 'all', label: 'Todos' },
            { value: 'driving', label: 'Dirigindo' },
            { value: 'resting', label: 'Descansando' },
            { value: 'available', label: 'Disponíveis' },
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Drivers Grid */}
          <div className="lg:col-span-2">
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              Motoristas ({filteredDrivers.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredDrivers.map((driver) => (
                <DriverStatusCard key={driver.id} driver={driver} />
              ))}
            </div>
          </div>

          {/* Journey Timeline */}
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              Registro de Hoje
            </h2>
            <div className="space-y-3">
              {mockJourneyEntries.map((entry) => {
                const config = entryTypeConfig[entry.type];
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
                            {entry.driverName}
                          </p>
                          <Badge className={cn("text-xs", config.color)}>
                            {config.label}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mb-1">
                          {entry.vehiclePlate}
                        </p>
                        {entry.location && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="w-3 h-3" />
                            <span>{entry.location}</span>
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                          {format(entry.timestamp, "HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Jornada;
