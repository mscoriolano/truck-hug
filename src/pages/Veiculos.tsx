import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useVehicles, useDeleteVehicle, Vehicle } from '@/hooks/useVehicles';
import { VehicleForm } from '@/components/forms/VehicleForm';
import { VehicleEditForm } from '@/components/forms/VehicleEditForm';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Truck, Fuel, Calendar, Gauge, MoreVertical, Trash2, Loader2, Edit, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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
  const { data: vehicles, isLoading } = useVehicles();
  const deleteVehicle = useDeleteVehicle();
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const handleEdit = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setEditOpen(true);
  };

  if (isLoading) {
    return (
      <MainLayout title="Veículos" subtitle="Gerencie a frota de veículos">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

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
                {vehicles?.filter(v => v.status === 'active').length || 0} ativos
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-warning" />
              <span className="text-sm text-muted-foreground">
                {vehicles?.filter(v => v.status === 'maintenance').length || 0} em manutenção
              </span>
            </div>
          </div>
          <VehicleForm />
        </div>

        {vehicles && vehicles.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {vehicles.map((vehicle) => {
              const status = statusConfig[vehicle.status];
              const nextMaintenanceDate = new Date(vehicle.next_maintenance);
              const isMaintenanceSoon = nextMaintenanceDate < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
              const isMaintenanceOverdue = nextMaintenanceDate < new Date();
              
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
                    <div className="flex items-center gap-2">
                      <Badge className={cn("text-xs", status.color)}>
                        {status.label}
                      </Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(vehicle)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-destructive"
                            onClick={() => deleteVehicle.mutate(vehicle.id)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
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
                        {fuelConfig[vehicle.fuel_type]}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Target className="w-4 h-4" />
                        <span>Meta Consumo</span>
                      </div>
                      <span className="text-foreground font-medium">
                        {vehicle.consumption_target || 2.5} km/L
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
                        {format(nextMaintenanceDate, "dd/MM/yyyy", { locale: ptBR })}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 rounded-xl border border-border bg-card">
            <Truck className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">Nenhum veículo cadastrado</p>
            <VehicleForm />
          </div>
        )}

        <VehicleEditForm 
          vehicle={editingVehicle} 
          open={editOpen} 
          onOpenChange={setEditOpen} 
        />
      </div>
    </MainLayout>
  );
};

export default Veiculos;
