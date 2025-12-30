import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { TireStatusCard } from '@/components/dashboard/TireStatusCard';
import { mockTires, mockVehicles } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { Plus, CircleDot, AlertTriangle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const Pneus = () => {
  const [filter, setFilter] = useState<'all' | 'good' | 'warning' | 'critical'>('all');
  const [vehicleFilter, setVehicleFilter] = useState<string>('all');

  const filteredTires = mockTires.filter(tire => {
    const statusMatch = filter === 'all' || tire.status === filter;
    const vehicleMatch = vehicleFilter === 'all' || tire.vehiclePlate === vehicleFilter;
    return statusMatch && vehicleMatch;
  });

  const stats = {
    good: mockTires.filter(t => t.status === 'good').length,
    warning: mockTires.filter(t => t.status === 'warning').length,
    critical: mockTires.filter(t => t.status === 'critical').length,
    total: mockTires.length,
  };

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
              {mockVehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.plate}>
                  {vehicle.plate} - {vehicle.model}
                </option>
              ))}
            </select>
          </div>
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Pneu
          </Button>
        </div>

        {/* Tires Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredTires.map((tire) => (
            <TireStatusCard key={tire.id} tire={tire} />
          ))}
        </div>

        {filteredTires.length === 0 && (
          <div className="text-center py-12">
            <CircleDot className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Nenhum pneu encontrado</p>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Pneus;
