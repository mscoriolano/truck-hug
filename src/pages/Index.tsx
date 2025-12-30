import { MainLayout } from '@/components/layout/MainLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { DriverStatusCard } from '@/components/dashboard/DriverStatusCard';
import { MaintenanceCard } from '@/components/dashboard/MaintenanceCard';
import { TireStatusCard } from '@/components/dashboard/TireStatusCard';
import { AlertCard } from '@/components/dashboard/AlertCard';
import { mockDrivers, mockVehicles, mockMaintenances, mockTires, mockAlerts } from '@/data/mockData';
import { Users, Truck, Wrench, CircleDot, AlertTriangle, Clock } from 'lucide-react';

const Index = () => {
  const activeDrivers = mockDrivers.filter(d => d.status === 'driving').length;
  const vehiclesInMaintenance = mockVehicles.filter(v => v.status === 'maintenance').length;
  const overdueMaintenances = mockMaintenances.filter(m => m.status === 'overdue').length;
  const criticalTires = mockTires.filter(t => t.status === 'critical').length;
  const unreadAlerts = mockAlerts.filter(a => !a.read);

  return (
    <MainLayout 
      title="Dashboard" 
      subtitle="Visão geral da sua frota"
    >
      <div className="space-y-6 animate-fade-in">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Motoristas Ativos"
            value={activeDrivers}
            subtitle={`de ${mockDrivers.length} motoristas`}
            icon={Users}
            variant="primary"
          />
          <StatCard
            title="Veículos em Operação"
            value={mockVehicles.filter(v => v.status === 'active').length}
            subtitle={`${vehiclesInMaintenance} em manutenção`}
            icon={Truck}
            variant="success"
          />
          <StatCard
            title="Manutenções Pendentes"
            value={mockMaintenances.filter(m => m.status !== 'completed').length}
            subtitle={overdueMaintenances > 0 ? `${overdueMaintenances} atrasadas` : 'Tudo em dia'}
            icon={Wrench}
            variant={overdueMaintenances > 0 ? 'warning' : 'default'}
          />
          <StatCard
            title="Alertas de Pneus"
            value={criticalTires}
            subtitle="pneus em estado crítico"
            icon={CircleDot}
            variant={criticalTires > 0 ? 'danger' : 'default'}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Drivers & Alerts */}
          <div className="lg:col-span-2 space-y-6">
            {/* Drivers Section */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" />
                  Jornada dos Motoristas
                </h2>
                <a href="/jornada" className="text-sm text-primary hover:underline">
                  Ver todos
                </a>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {mockDrivers.slice(0, 4).map((driver) => (
                  <DriverStatusCard key={driver.id} driver={driver} />
                ))}
              </div>
            </section>

            {/* Maintenances Section */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Wrench className="w-5 h-5 text-primary" />
                  Manutenções
                </h2>
                <a href="/manutencoes" className="text-sm text-primary hover:underline">
                  Ver todas
                </a>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {mockMaintenances.slice(0, 4).map((maintenance) => (
                  <MaintenanceCard key={maintenance.id} maintenance={maintenance} />
                ))}
              </div>
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
                <a href="/alertas" className="text-sm text-primary hover:underline">
                  Ver todos
                </a>
              </div>
              <div className="space-y-3">
                {mockAlerts.slice(0, 3).map((alert) => (
                  <AlertCard key={alert.id} alert={alert} />
                ))}
              </div>
            </section>

            {/* Tires Section */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <CircleDot className="w-5 h-5 text-primary" />
                  Pneus Críticos
                </h2>
                <a href="/pneus" className="text-sm text-primary hover:underline">
                  Ver todos
                </a>
              </div>
              <div className="space-y-3">
                {mockTires.filter(t => t.status !== 'good').slice(0, 3).map((tire) => (
                  <TireStatusCard key={tire.id} tire={tire} />
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Index;
