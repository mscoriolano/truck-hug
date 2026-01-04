import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useVehicles, useDeleteVehicle, Vehicle } from '@/hooks/useVehicles';
import { VehicleForm } from '@/components/forms/VehicleForm';
import { VehicleEditForm } from '@/components/forms/VehicleEditForm';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Truck, Fuel, Calendar, Gauge, MoreVertical, Trash2, Loader2, Edit, Target, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

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
  const [collapseMode, setCollapseMode] = useState(true);
  const [expandedVehicles, setExpandedVehicles] = useState<Set<string>>(new Set());

  const handleEdit = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setEditOpen(true);
  };

  const toggleVehicle = (vehicleId: string) => {
    setExpandedVehicles(prev => {
      const newSet = new Set(prev);
      if (newSet.has(vehicleId)) {
        newSet.delete(vehicleId);
      } else {
        newSet.add(vehicleId);
      }
      return newSet;
    });
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
        <div className="flex flex-wrap items-center justify-between gap-4">
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
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch
                id="collapse-mode"
                checked={collapseMode}
                onCheckedChange={setCollapseMode}
              />
              <Label htmlFor="collapse-mode" className="text-sm text-muted-foreground cursor-pointer">
                Modo compacto
              </Label>
            </div>
            <VehicleForm />
          </div>
        </div>

        {vehicles && vehicles.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {vehicles.map((vehicle) => {
              const status = statusConfig[vehicle.status];
              const nextMaintenanceDate = new Date(vehicle.next_maintenance);
              const isMaintenanceSoon = nextMaintenanceDate < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
              const isMaintenanceOverdue = nextMaintenanceDate < new Date();
              const isExpanded = !collapseMode || expandedVehicles.has(vehicle.id);
              
              return (
                <Collapsible
                  key={vehicle.id}
                  open={isExpanded}
                  onOpenChange={() => collapseMode && toggleVehicle(vehicle.id)}
                >
                  <div 
                    className={cn(
                      "rounded-xl bg-card border transition-all duration-300 hover:shadow-card",
                      isMaintenanceOverdue ? "border-destructive/50" : "border-border"
                    )}
                  >
                    {/* Header sempre visível */}
                    <CollapsibleTrigger asChild disabled={!collapseMode}>
                      <div 
                        className={cn(
                          "p-5 flex items-start justify-between",
                          collapseMode && "cursor-pointer hover:bg-secondary/30"
                        )}
                      >
                        <div className="flex items-center gap-3 flex-1">
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
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-bold text-foreground">{vehicle.plate}</p>
                              <Badge className={cn("text-xs", status.color)}>
                                {status.label}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{vehicle.brand} {vehicle.model}</p>
                            <div className={cn(
                              "flex items-center gap-2 mt-1",
                              isMaintenanceOverdue ? "text-destructive" :
                              isMaintenanceSoon ? "text-warning" : "text-muted-foreground"
                            )}>
                              <Calendar className="w-3.5 h-3.5" />
                              <span className="text-xs">
                                Próx. manutenção: {format(nextMaintenanceDate, "dd/MM/yyyy", { locale: ptBR })}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {collapseMode && (
                            isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-muted-foreground" />
                            )
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
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
                    </CollapsibleTrigger>

                    {/* Conteúdo colapsável */}
                    <CollapsibleContent>
                      <div className="px-5 pb-5 pt-0 border-t border-border">
                        <div className="space-y-3 text-sm pt-4">
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
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
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