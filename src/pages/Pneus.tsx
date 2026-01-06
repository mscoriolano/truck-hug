import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useTires, useDeleteTire, Tire } from '@/hooks/useTires';
import { useVehicles } from '@/hooks/useVehicles';
import { TireForm } from '@/components/forms/TireForm';
import { TireEditForm } from '@/components/forms/TireEditForm';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CircleDot, AlertTriangle, CheckCircle, Loader2, MoreVertical, Trash2, Pencil } from 'lucide-react';
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
  good: { label: 'Bom', color: 'bg-success text-success-foreground' },
  warning: { label: 'Atenção', color: 'bg-warning text-warning-foreground' },
  critical: { label: 'Crítico', color: 'bg-destructive text-destructive-foreground' },
  replaced: { label: 'Substituído', color: 'bg-muted text-muted-foreground' },
};

const Pneus = () => {
  const [filter, setFilter] = useState<'all' | 'good' | 'warning' | 'critical'>('all');
  const [vehicleFilter, setVehicleFilter] = useState<string>('all');
  const [editingTire, setEditingTire] = useState<Tire | null>(null);

  const { data: tires, isLoading } = useTires();
  const { data: vehicles } = useVehicles();
  const deleteTire = useDeleteTire();

  const filteredTires = tires?.filter(tire => {
    const statusMatch = filter === 'all' || tire.status === filter;
    const vehicleMatch = vehicleFilter === 'all' || tire.vehicle_plate === vehicleFilter;
    return statusMatch && vehicleMatch;
  }) || [];

  const stats = {
    good: tires?.filter(t => t.status === 'good').length || 0,
    warning: tires?.filter(t => t.status === 'warning').length || 0,
    critical: tires?.filter(t => t.status === 'critical').length || 0,
    total: tires?.length || 0,
  };

  if (isLoading) {
    return (
      <MainLayout title="Gestão de Pneus" subtitle="Controle a vida útil e quilometragem dos pneus">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout 
      title="Gestão de Pneus" 
      subtitle="Controle a vida útil e quilometragem dos pneus"
    >
      <div className="space-y-6 animate-fade-in">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-xl bg-card border border-border p-4">
            <div className="flex items-center gap-2 mb-2">
              <CircleDot className="w-5 h-5 text-primary" />
              <span className="text-sm text-muted-foreground">Total</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{stats.total}</p>
          </div>
          <div className="rounded-xl bg-success/10 border border-success/30 p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-5 h-5 text-success" />
              <span className="text-sm text-muted-foreground">Bom estado</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{stats.good}</p>
          </div>
          <div className="rounded-xl bg-warning/10 border border-warning/30 p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-warning" />
              <span className="text-sm text-muted-foreground">Atenção</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{stats.warning}</p>
          </div>
          <div className="rounded-xl bg-destructive/10 border border-destructive/30 p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              <span className="text-sm text-muted-foreground">Críticos</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{stats.critical}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            <div className="flex gap-1 p-1 bg-secondary rounded-lg">
              {[
                { value: 'all', label: 'Todos' },
                { value: 'good', label: 'Bom' },
                { value: 'warning', label: 'Atenção' },
                { value: 'critical', label: 'Crítico' },
              ].map((option) => (
                <Button
                  key={option.value}
                  variant={filter === option.value ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setFilter(option.value as typeof filter)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
            <select
              value={vehicleFilter}
              onChange={(e) => setVehicleFilter(e.target.value)}
              className="px-3 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground focus:ring-2 focus:ring-primary"
            >
              <option value="all">Todos os veículos</option>
              {vehicles?.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.plate}>
                  {vehicle.plate} - {vehicle.model}
                </option>
              ))}
            </select>
          </div>
          <TireForm />
        </div>

        {/* Tires Grid */}
        {filteredTires.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredTires.map((tire) => {
              const status = statusConfig[tire.status];
              const usedMileage = tire.current_mileage - tire.install_mileage;
              const remainingMileage = tire.max_mileage - usedMileage;
              const wearPercent = (usedMileage / tire.max_mileage) * 100;
              
              return (
                <div key={tire.id} className="rounded-xl bg-card border border-border p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-bold text-foreground">{tire.vehicle_plate}</p>
                      <p className="text-sm text-muted-foreground">{tire.position}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge className={cn("text-xs", status.color)}>
                        {status.label}
                      </Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreVertical className="w-3 h-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setEditingTire(tire)}>
                            <Pencil className="w-4 h-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-destructive"
                            onClick={() => deleteTire.mutate(tire.id)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  
                  <p className="text-sm text-foreground mb-2">{tire.brand} {tire.model}</p>
                  
                  {/* Exibe sulco se preenchido */}
                  {tire.tread_depth !== null && (
                    <div className="mb-3 p-2 rounded-lg bg-secondary">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-muted-foreground">Sulco</span>
                        <span className={cn(
                          "font-bold",
                          tire.tread_depth <= (tire.min_tread_depth ?? 1.6) ? "text-destructive" :
                          tire.tread_depth <= (tire.warning_tread_depth ?? 3.0) ? "text-warning" : "text-success"
                        )}>
                          {tire.tread_depth.toFixed(1)} mm
                        </span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden mt-1">
                        <div 
                          className={cn(
                            "h-full rounded-full transition-all",
                            tire.tread_depth <= (tire.min_tread_depth ?? 1.6) ? "bg-destructive" :
                            tire.tread_depth <= (tire.warning_tread_depth ?? 3.0) ? "bg-warning" : "bg-success"
                          )}
                          style={{ width: `${Math.min((tire.tread_depth / 10) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                  
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Rodado</span>
                      <span className="text-foreground">{usedMileage.toLocaleString('pt-BR')} km</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className={cn(
                          "h-full rounded-full transition-all",
                          wearPercent >= 90 ? "bg-destructive" :
                          wearPercent >= 70 ? "bg-warning" : "bg-success"
                        )}
                        style={{ width: `${Math.min(wearPercent, 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Restante</span>
                      <span className={cn(
                        "font-medium",
                        remainingMileage < 10000 ? "text-destructive" :
                        remainingMileage < 20000 ? "text-warning" : "text-success"
                      )}>
                        {remainingMileage.toLocaleString('pt-BR')} km
                      </span>
                    </div>
                  </div>
                  
                  <div className="mt-3 pt-3 border-t border-border text-xs text-muted-foreground">
                    Instalado: {format(new Date(tire.install_date), "dd/MM/yyyy", { locale: ptBR })}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <CircleDot className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">Nenhum pneu encontrado</p>
            <TireForm />
          </div>
        )}
      </div>

      {/* Modal de Edição */}
      {editingTire && (
        <TireEditForm 
          tire={editingTire} 
          open={!!editingTire} 
          onOpenChange={(open) => !open && setEditingTire(null)} 
        />
      )}
    </MainLayout>
  );
};

export default Pneus;
