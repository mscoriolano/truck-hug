import { MainLayout } from '@/components/layout/MainLayout';
import { mockVehicles } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Truck, Fuel, Calendar, Gauge, MoreVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const statusConfig = {
  active: { label: 'Ativo', color: 'bg-success text-success-foreground' },
  maintenance: { label: 'Manutenção', color: 'bg-warning text-warning-foreground' },
  inactive: { label: 'Inativo', color: 'bg-muted text-muted-foreground' },
};

const fuelConfig = {
  diesel: 'Diesel',
  gasoline: 'Gasolina',
  flex: 'Flex',
  electric: 'Elétrico',
};

const Veiculos = () => {
  return (
    <MainLayout 
      title="Veículos" 
      subtitle="Gerencie a frota de veículos"
    >
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-success" />
              <span className="text-sm text-muted-foreground">
                {mockVehicles.filter(v => v.status === 'active').length} ativos
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-warning" />
              <span className="text-sm text-muted-foreground">
                {mockVehicles.filter(v => v.status === 'maintenance').length} em manutenção
              </span>
            </div>
          </div>
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Plus className="w-4 h-4 mr-2" />
            Novo Veículo
          </Button>
        </div>

        {/* Vehicles Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {mockVehicles.map((vehicle) => {
            const status = statusConfig[vehicle.status];
            const isMaintenanceSoon = vehicle.nextMaintenance < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
            const isMaintenanceOverdue = vehicle.nextMaintenance < new Date();
            
            return (
              <div 
                key={vehicle.id}
                className={cn(
                  "rounded-xl bg-card border p-5 transition-all duration-300 hover:shadow-card hover:-translate-y-0.5",
                  isMaintenanceOverdue ? "border-destructive/50" : "border-border"
                )}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "p-3 rounded-xl",
                      vehicle.status === 'active' ? "bg-success/20" :
                      vehicle.status === 'maintenance' ? "bg-warning/20" : "bg-muted"
                    )}>
                      <Truck className={cn(
                        "w-6 h-6",
                        vehicle.status === 'active' ? "text-success" :
                        vehicle.status === 'maintenance' ? "text-warning" : "text-muted-foreground"
                      )} />
                    </div>
                    <div>
                      <p className="font-bold text-foreground">{vehicle.plate}</p>
                      <p className="text-sm text-muted-foreground">{vehicle.brand}</p>
                    </div>
                  </div>
                  <Badge className={cn("text-xs", status.color)}>
                    {status.label}
                  </Badge>
                </div>

                <p className="font-medium text-foreground mb-4">{vehicle.model}</p>

                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <span>Ano</span>
                    </div>
                    <span className="text-foreground font-medium">{vehicle.year}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Gauge className="w-4 h-4" />
                      <span>Quilometragem</span>
                    </div>
                    <span className="text-foreground font-medium">
                      {vehicle.mileage.toLocaleString('pt-BR')} km
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Fuel className="w-4 h-4" />
                      <span>Combustível</span>
                    </div>
                    <span className="text-foreground font-medium">
                      {fuelConfig[vehicle.fuelType]}
                    </span>
                  </div>
                </div>

                <div className={cn(
                  "mt-4 pt-4 border-t border-border",
                  isMaintenanceOverdue && "border-destructive/30"
                )}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Próx. manutenção</span>
                    <span className={cn(
                      "text-sm font-medium",
                      isMaintenanceOverdue ? "text-destructive" :
                      isMaintenanceSoon ? "text-warning" : "text-foreground"
                    )}>
                      {format(vehicle.nextMaintenance, "dd/MM/yyyy", { locale: ptBR })}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </MainLayout>
  );
};

export default Veiculos;
