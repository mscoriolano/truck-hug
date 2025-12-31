import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useMaintenances, useDeleteMaintenance } from '@/hooks/useMaintenances';
import { MaintenanceForm } from '@/components/forms/MaintenanceForm';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Wrench, Calendar, AlertTriangle, CheckCircle, Loader2, MoreVertical, Trash2 } from 'lucide-react';
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
  scheduled: { label: 'Agendada', color: 'bg-info text-info-foreground' },
  in_progress: { label: 'Em andamento', color: 'bg-warning text-warning-foreground' },
  completed: { label: 'Concluída', color: 'bg-success text-success-foreground' },
  overdue: { label: 'Atrasada', color: 'bg-destructive text-destructive-foreground' },
};

const categoryConfig = {
  engine: 'Motor',
  tires: 'Pneus',
  brakes: 'Freios',
  suspension: 'Suspensão',
  electrical: 'Elétrica',
  general: 'Geral',
};

const Manutencoes = () => {
  const [filter, setFilter] = useState<'all' | 'scheduled' | 'in_progress' | 'overdue' | 'completed'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'preventive' | 'corrective'>('all');
  
  const { data: maintenances, isLoading } = useMaintenances();
  const deleteMaintenance = useDeleteMaintenance();

  const filteredMaintenances = maintenances?.filter(maintenance => {
    const statusMatch = filter === 'all' || maintenance.status === filter;
    const typeMatch = typeFilter === 'all' || maintenance.type === typeFilter;
    return statusMatch && typeMatch;
  }) || [];

  const stats = {
    scheduled: maintenances?.filter(m => m.status === 'scheduled').length || 0,
    inProgress: maintenances?.filter(m => m.status === 'in_progress').length || 0,
    overdue: maintenances?.filter(m => m.status === 'overdue').length || 0,
    completed: maintenances?.filter(m => m.status === 'completed').length || 0,
  };

  if (isLoading) {
    return (
      <MainLayout title="Manutenções" subtitle="Gerencie as manutenções preventivas e corretivas">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout 
      title="Manutenções" 
      subtitle="Gerencie as manutenções preventivas e corretivas"
    >
      <div className="space-y-6 animate-fade-in">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-xl bg-info/10 border border-info/30 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-5 h-5 text-info" />
              <span className="text-sm text-muted-foreground">Agendadas</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{stats.scheduled}</p>
          </div>
          <div className="rounded-xl bg-warning/10 border border-warning/30 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Wrench className="w-5 h-5 text-warning" />
              <span className="text-sm text-muted-foreground">Em andamento</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{stats.inProgress}</p>
          </div>
          <div className="rounded-xl bg-destructive/10 border border-destructive/30 p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              <span className="text-sm text-muted-foreground">Atrasadas</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{stats.overdue}</p>
          </div>
          <div className="rounded-xl bg-success/10 border border-success/30 p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-5 h-5 text-success" />
              <span className="text-sm text-muted-foreground">Concluídas</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{stats.completed}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            <div className="flex gap-1 p-1 bg-secondary rounded-lg">
              {[
                { value: 'all', label: 'Todas' },
                { value: 'scheduled', label: 'Agendadas' },
                { value: 'in_progress', label: 'Em andamento' },
                { value: 'overdue', label: 'Atrasadas' },
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
            <div className="flex gap-1 p-1 bg-secondary rounded-lg">
              {[
                { value: 'all', label: 'Todos tipos' },
                { value: 'preventive', label: 'Preventiva' },
                { value: 'corrective', label: 'Corretiva' },
              ].map((option) => (
                <Button
                  key={option.value}
                  variant={typeFilter === option.value ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setTypeFilter(option.value as typeof typeFilter)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>
          <MaintenanceForm />
        </div>

        {/* Maintenances Grid */}
        {filteredMaintenances.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMaintenances.map((maintenance) => {
              const status = statusConfig[maintenance.status];
              
              return (
                <div key={maintenance.id} className="rounded-xl bg-card border border-border p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-bold text-foreground">{maintenance.vehicle_plate}</p>
                      <p className="text-sm text-muted-foreground">{categoryConfig[maintenance.category]}</p>
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
                          <DropdownMenuItem 
                            className="text-destructive"
                            onClick={() => deleteMaintenance.mutate(maintenance.id)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  
                  <p className="text-sm text-foreground mb-3">{maintenance.description}</p>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {maintenance.type === 'preventive' ? 'Preventiva' : 'Corretiva'}
                    </span>
                    <span className="text-foreground">
                      {format(new Date(maintenance.scheduled_date), "dd/MM/yyyy", { locale: ptBR })}
                    </span>
                  </div>
                  
                  {maintenance.cost && (
                    <div className="mt-2 pt-2 border-t border-border">
                      <span className="text-sm text-muted-foreground">
                        Custo: R$ {maintenance.cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <Wrench className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">Nenhuma manutenção encontrada</p>
            <MaintenanceForm />
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Manutencoes;
