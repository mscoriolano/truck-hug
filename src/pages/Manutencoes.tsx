import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { MaintenanceCard } from '@/components/dashboard/MaintenanceCard';
import { mockMaintenances } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { Plus, Wrench, Calendar, AlertTriangle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const Manutencoes = () => {
  const [filter, setFilter] = useState<'all' | 'scheduled' | 'in_progress' | 'overdue' | 'completed'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'preventive' | 'corrective'>('all');

  const filteredMaintenances = mockMaintenances.filter(maintenance => {
    const statusMatch = filter === 'all' || maintenance.status === filter;
    const typeMatch = typeFilter === 'all' || maintenance.type === typeFilter;
    return statusMatch && typeMatch;
  });

  const stats = {
    scheduled: mockMaintenances.filter(m => m.status === 'scheduled').length,
    inProgress: mockMaintenances.filter(m => m.status === 'in_progress').length,
    overdue: mockMaintenances.filter(m => m.status === 'overdue').length,
    completed: mockMaintenances.filter(m => m.status === 'completed').length,
  };

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
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Plus className="w-4 h-4 mr-2" />
            Nova Manutenção
          </Button>
        </div>

        {/* Maintenances Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMaintenances.map((maintenance) => (
            <MaintenanceCard key={maintenance.id} maintenance={maintenance} />
          ))}
        </div>

        {filteredMaintenances.length === 0 && (
          <div className="text-center py-12">
            <Wrench className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Nenhuma manutenção encontrada</p>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Manutencoes;
