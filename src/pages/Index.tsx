import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { DateRangeFilter } from '@/components/DateRangeFilter';
import { useDrivers } from '@/hooks/useDrivers';
import { useVehicles } from '@/hooks/useVehicles';
import { useMaintenances } from '@/hooks/useMaintenances';
import { useTires } from '@/hooks/useTires';
import { useAlerts } from '@/hooks/useAlerts';
import { useFuelEntries } from '@/hooks/useFuelEntries';
import { useTrips } from '@/hooks/useTrips';
import { 
  Users, 
  Truck, 
  Wrench, 
  CircleDot, 
  AlertTriangle, 
  Clock, 
  Loader2, 
  User, 
  Calendar,
  DollarSign,
  RotateCcw
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const Index = () => {
  const navigate = useNavigate();
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();

  const { data: drivers, isLoading: driversLoading } = useDrivers();
  const { data: vehicles, isLoading: vehiclesLoading } = useVehicles();
  const { data: maintenances, isLoading: maintenancesLoading } = useMaintenances();
  const { data: tires, isLoading: tiresLoading } = useTires();
  const { data: alerts, isLoading: alertsLoading } = useAlerts();
  const { data: fuelEntries, isLoading: fuelLoading } = useFuelEntries(startDate, endDate);
  const { data: trips, isLoading: tripsLoading } = useTrips(startDate, endDate);

  const handleDateChange = (start?: Date, end?: Date) => {
    setStartDate(start);
    setEndDate(end);
  };

  const isLoading = driversLoading || vehiclesLoading || maintenancesLoading || tiresLoading || alertsLoading || fuelLoading || tripsLoading;

  if (isLoading) {
    return (
      <MainLayout title="Dashboard" subtitle="Visão geral da sua frota">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  const activeDrivers = drivers?.filter(d => d.status === 'driving').length || 0;
  const vehiclesInMaintenance = vehicles?.filter(v => v.status === 'maintenance').length || 0;
  const overdueMaintenances = maintenances?.filter(m => m.status === 'overdue').length || 0;
  const criticalTires = tires?.filter(t => t.status === 'critical').length || 0;
  const unreadAlerts = alerts?.filter(a => !a.read) || [];
  
  // Fuel stats
  const totalFuelCost = fuelEntries?.reduce((acc, e) => acc + Number(e.total_cost), 0) || 0;
  
  // Trip/Cycle stats
  const totalCycles = trips?.reduce((acc, t) => acc + Number(t.cycle_value), 0) || 0;

  const statusConfig: Record<string, { label: string; color: string }> = {
    available: { label: 'Disponível', color: 'bg-success text-success-foreground' },
    driving: { label: 'Dirigindo', color: 'bg-primary text-primary-foreground' },
    resting: { label: 'Descansando', color: 'bg-warning text-warning-foreground' },
    off: { label: 'Folga', color: 'bg-muted text-muted-foreground' },
    vacation: { label: 'Férias', color: 'bg-info text-info-foreground' },
    leave: { label: 'Licença', color: 'bg-secondary text-secondary-foreground' },
    terminated: { label: 'Desligado', color: 'bg-destructive text-destructive-foreground' },
  };

  const maintenanceStatusConfig: Record<string, { label: string; color: string }> = {
    scheduled: { label: 'Agendada', color: 'bg-info text-info-foreground' },
    in_progress: { label: 'Em andamento', color: 'bg-warning text-warning-foreground' },
    completed: { label: 'Concluída', color: 'bg-success text-success-foreground' },
    overdue: { label: 'Atrasada', color: 'bg-destructive text-destructive-foreground' },
  };

  const alertSeverityConfig: Record<string, { color: string; icon: string }> = {
    info: { color: 'bg-info/20 border-info/30', icon: 'text-info' },
    warning: { color: 'bg-warning/20 border-warning/30', icon: 'text-warning' },
    critical: { color: 'bg-destructive/20 border-destructive/30', icon: 'text-destructive' },
  };

  return (
    <MainLayout 
      title="Dashboard" 
      subtitle="Visão geral da sua frota"
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

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <div 
            className="cursor-pointer transition-transform hover:scale-105"
            onClick={() => navigate('/motoristas')}
          >
            <StatCard
              title="Motoristas Ativos"
              value={activeDrivers}
              subtitle={`de ${drivers?.length || 0} motoristas`}
              icon={Users}
              variant="primary"
            />
          </div>
          <div 
            className="cursor-pointer transition-transform hover:scale-105"
            onClick={() => navigate('/veiculos')}
          >
            <StatCard
              title="Veículos em Operação"
              value={vehicles?.filter(v => v.status === 'active').length || 0}
              subtitle={`${vehiclesInMaintenance} em manutenção`}
              icon={Truck}
              variant="success"
            />
          </div>
          <div 
            className="cursor-pointer transition-transform hover:scale-105"
            onClick={() => navigate('/manutencoes')}
          >
            <StatCard
              title="Manutenções Pendentes"
              value={maintenances?.filter(m => m.status !== 'completed').length || 0}
              subtitle={overdueMaintenances > 0 ? `${overdueMaintenances} atrasadas` : 'Tudo em dia'}
              icon={Wrench}
              variant={overdueMaintenances > 0 ? 'warning' : 'default'}
            />
          </div>
          <div 
            className="cursor-pointer transition-transform hover:scale-105"
            onClick={() => navigate('/pneus')}
          >
            <StatCard
              title="Alertas de Pneus"
              value={criticalTires}
              subtitle="pneus em estado crítico"
              icon={CircleDot}
              variant={criticalTires > 0 ? 'danger' : 'default'}
            />
          </div>
          <div 
            className="cursor-pointer transition-transform hover:scale-105"
            onClick={() => navigate('/abastecimentos')}
          >
            <StatCard
              title="Total Abastecimentos"
              value={`R$ ${totalFuelCost.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
              subtitle={`${fuelEntries?.length || 0} abastecimentos`}
              icon={DollarSign}
              variant="default"
            />
          </div>
          <div 
            className="cursor-pointer transition-transform hover:scale-105"
            onClick={() => navigate('/viagens')}
          >
            <StatCard
              title="Total de Ciclos"
              value={totalCycles.toFixed(1)}
              subtitle={`${trips?.length || 0} viagens`}
              icon={RotateCcw}
              variant="primary"
            />
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Drivers & Maintenances */}
          <div className="lg:col-span-2 space-y-6">
            {/* Drivers Section */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" />
                  Jornada dos Motoristas
                </h2>
                <button 
                  onClick={() => navigate('/jornada')} 
                  className="text-sm text-primary hover:underline"
                >
                  Ver todos
                </button>
              </div>
              {drivers && drivers.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {drivers.filter(d => d.status !== 'terminated').slice(0, 4).map((driver) => {
                    const status = statusConfig[driver.status] || statusConfig.available;
                    const progressPercent = ((driver.total_hours_today || 0) / 8) * 100;
                    
                    return (
                      <div 
                        key={driver.id} 
                        className="rounded-xl bg-card border border-border p-4 cursor-pointer hover:border-primary transition-colors"
                        onClick={() => navigate('/motoristas')}
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <div className="relative">
                            <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center">
                              <User className="w-5 h-5 text-primary-foreground" />
                            </div>
                            <div className={cn(
                              "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card",
                              driver.status === 'driving' && "bg-primary",
                              driver.status === 'available' && "bg-success",
                              driver.status === 'resting' && "bg-warning",
                              driver.status === 'off' && "bg-muted",
                              driver.status === 'vacation' && "bg-info",
                              driver.status === 'leave' && "bg-secondary",
                            )} />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-foreground">{driver.name}</p>
                            <Badge className={cn("text-xs", status.color)}>
                              {status.label}
                            </Badge>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Jornada</span>
                            <span>{Math.floor(driver.total_hours_today || 0)}h / 8h</span>
                          </div>
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div 
                              className={cn(
                                "h-full rounded-full transition-all",
                                progressPercent >= 90 ? "bg-destructive" :
                                progressPercent >= 70 ? "bg-warning" : "bg-primary"
                              )}
                              style={{ width: `${Math.min(progressPercent, 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div 
                  className="text-center py-8 bg-card rounded-xl border border-border cursor-pointer hover:border-primary transition-colors"
                  onClick={() => navigate('/motoristas')}
                >
                  <User className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Nenhum motorista cadastrado</p>
                </div>
              )}
            </section>

            {/* Maintenances Section */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Wrench className="w-5 h-5 text-primary" />
                  Manutenções
                </h2>
                <button 
                  onClick={() => navigate('/manutencoes')} 
                  className="text-sm text-primary hover:underline"
                >
                  Ver todas
                </button>
              </div>
              {maintenances && maintenances.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {maintenances.slice(0, 4).map((maintenance) => {
                    const status = maintenanceStatusConfig[maintenance.status] || maintenanceStatusConfig.scheduled;
                    
                    return (
                      <div 
                        key={maintenance.id} 
                        className="rounded-xl bg-card border border-border p-4 cursor-pointer hover:border-primary transition-colors"
                        onClick={() => navigate('/manutencoes')}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-medium text-foreground">{maintenance.vehicle_plate}</p>
                            <p className="text-sm text-muted-foreground">{maintenance.description}</p>
                          </div>
                          <Badge className={cn("text-xs", status.color)}>
                            {status.label}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(maintenance.scheduled_date), "dd/MM/yyyy", { locale: ptBR })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div 
                  className="text-center py-8 bg-card rounded-xl border border-border cursor-pointer hover:border-primary transition-colors"
                  onClick={() => navigate('/manutencoes')}
                >
                  <Wrench className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Nenhuma manutenção cadastrada</p>
                </div>
              )}
            </section>
          </div>

          {/* Right Column - Alerts & Tires */}
          <div className="space-y-6">
            {/* Alerts Section */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-warning" />
                  Alertas
                  {unreadAlerts.length > 0 && (
                    <span className="px-2 py-0.5 text-xs font-medium bg-destructive text-destructive-foreground rounded-full">
                      {unreadAlerts.length}
                    </span>
                  )}
                </h2>
                <button 
                  onClick={() => navigate('/alertas')} 
                  className="text-sm text-primary hover:underline"
                >
                  Ver todos
                </button>
              </div>
              {alerts && alerts.length > 0 ? (
                <div className="space-y-3">
                  {alerts.slice(0, 3).map((alert) => {
                    const severity = alertSeverityConfig[alert.severity] || alertSeverityConfig.info;
                    
                    return (
                      <div 
                        key={alert.id} 
                        className={cn("rounded-xl border p-4 cursor-pointer hover:opacity-80 transition-opacity", severity.color)}
                        onClick={() => navigate('/alertas')}
                      >
                        <div className="flex items-start gap-3">
                          <AlertTriangle className={cn("w-5 h-5 mt-0.5", severity.icon)} />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground text-sm">{alert.title}</p>
                            <p className="text-xs text-muted-foreground mt-1">{alert.message}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div 
                  className="text-center py-8 bg-card rounded-xl border border-border cursor-pointer hover:border-primary transition-colors"
                  onClick={() => navigate('/alertas')}
                >
                  <AlertTriangle className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Nenhum alerta</p>
                </div>
              )}
            </section>

            {/* Tires Section */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <CircleDot className="w-5 h-5 text-primary" />
                  Pneus Críticos
                </h2>
                <button 
                  onClick={() => navigate('/pneus')} 
                  className="text-sm text-primary hover:underline"
                >
                  Ver todos
                </button>
              </div>
              {tires && tires.filter(t => t.status !== 'good').length > 0 ? (
                <div className="space-y-3">
                  {tires.filter(t => t.status !== 'good').slice(0, 3).map((tire) => {
                    const usedMileage = tire.current_mileage - tire.install_mileage;
                    const wearPercent = (usedMileage / tire.max_mileage) * 100;
                    
                    return (
                      <div 
                        key={tire.id} 
                        className="rounded-xl bg-card border border-border p-4 cursor-pointer hover:border-primary transition-colors"
                        onClick={() => navigate('/pneus')}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-medium text-foreground">{tire.vehicle_plate}</p>
                            <p className="text-xs text-muted-foreground">{tire.position} - {tire.brand}</p>
                          </div>
                          <Badge className={cn(
                            "text-xs",
                            tire.status === 'critical' ? "bg-destructive text-destructive-foreground" : "bg-warning text-warning-foreground"
                          )}>
                            {tire.status === 'critical' ? 'Crítico' : 'Atenção'}
                          </Badge>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div 
                            className={cn(
                              "h-full rounded-full",
                              wearPercent >= 90 ? "bg-destructive" : "bg-warning"
                            )}
                            style={{ width: `${Math.min(wearPercent, 100)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div 
                  className="text-center py-8 bg-card rounded-xl border border-border cursor-pointer hover:border-primary transition-colors"
                  onClick={() => navigate('/pneus')}
                >
                  <CircleDot className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Nenhum pneu crítico</p>
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Index;