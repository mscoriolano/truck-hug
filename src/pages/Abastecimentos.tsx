import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useFuelEntries, useDeleteFuelEntry } from '@/hooks/useFuelEntries';
import { FuelEntryForm } from '@/components/forms/FuelEntryForm';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Fuel, 
  Loader2, 
  MoreVertical, 
  Trash2, 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  Gauge
} from 'lucide-react';
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
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';

const fuelTypeLabels: Record<string, string> = {
  diesel: 'Diesel',
  diesel_s10: 'Diesel S10',
  gasoline: 'Gasolina',
  ethanol: 'Etanol',
};

const Abastecimentos = () => {
  const [view, setView] = useState<'list' | 'charts'>('list');
  const { data: fuelEntries, isLoading } = useFuelEntries();
  const deleteFuelEntry = useDeleteFuelEntry();

  // Calcular estatísticas
  const stats = {
    totalLiters: fuelEntries?.reduce((acc, e) => acc + Number(e.liters), 0) || 0,
    totalCost: fuelEntries?.reduce((acc, e) => acc + Number(e.total_cost), 0) || 0,
    avgPricePerLiter: fuelEntries?.length 
      ? fuelEntries.reduce((acc, e) => acc + Number(e.price_per_liter), 0) / fuelEntries.length 
      : 0,
    entriesCount: fuelEntries?.length || 0,
  };

  // Dados para gráfico por motorista
  const driverData = fuelEntries?.reduce((acc, entry) => {
    const existing = acc.find(d => d.driver_name === entry.driver_name);
    if (existing) {
      existing.liters += Number(entry.liters);
      existing.cost += Number(entry.total_cost);
    } else {
      acc.push({
        driver_name: entry.driver_name,
        liters: Number(entry.liters),
        cost: Number(entry.total_cost),
      });
    }
    return acc;
  }, [] as { driver_name: string; liters: number; cost: number }[]) || [];

  // Dados para gráfico de custo ao longo do tempo
  const costOverTime = fuelEntries?.slice().reverse().map(entry => ({
    date: format(new Date(entry.entry_date), 'dd/MM', { locale: ptBR }),
    cost: Number(entry.total_cost),
    price: Number(entry.price_per_liter),
  })).slice(-10) || [];

  if (isLoading) {
    return (
      <MainLayout title="Abastecimentos" subtitle="Controle de combustível e custos">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout 
      title="Abastecimentos" 
      subtitle="Controle de combustível e custos"
    >
      <div className="space-y-6 animate-fade-in">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-xl bg-card border border-border p-4">
            <div className="flex items-center gap-2 mb-2">
              <Fuel className="w-5 h-5 text-primary" />
              <span className="text-sm text-muted-foreground">Total Litros</span>
            </div>
            <p className="text-2xl font-bold text-foreground">
              {stats.totalLiters.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} L
            </p>
          </div>
          <div className="rounded-xl bg-card border border-border p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-5 h-5 text-success" />
              <span className="text-sm text-muted-foreground">Total Gasto</span>
            </div>
            <p className="text-2xl font-bold text-foreground">
              R$ {stats.totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="rounded-xl bg-card border border-border p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5 text-warning" />
              <span className="text-sm text-muted-foreground">Média R$/L</span>
            </div>
            <p className="text-2xl font-bold text-foreground">
              R$ {stats.avgPricePerLiter.toLocaleString('pt-BR', { minimumFractionDigits: 3 })}
            </p>
          </div>
          <div className="rounded-xl bg-card border border-border p-4">
            <div className="flex items-center gap-2 mb-2">
              <Gauge className="w-5 h-5 text-info" />
              <span className="text-sm text-muted-foreground">Abastecimentos</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{stats.entriesCount}</p>
          </div>
        </div>

        {/* Toggle & Form */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex gap-1 p-1 bg-secondary rounded-lg">
            <Button
              variant={view === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setView('list')}
            >
              Lista
            </Button>
            <Button
              variant={view === 'charts' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setView('charts')}
            >
              Gráficos
            </Button>
          </div>
          <FuelEntryForm />
        </div>

        {view === 'charts' && fuelEntries && fuelEntries.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Custo por Motorista */}
            <div className="rounded-xl bg-card border border-border p-5">
              <h3 className="font-semibold text-foreground mb-4">Custo por Motorista</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={driverData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="driver_name" 
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    tickFormatter={(value) => value.split(' ')[0]}
                  />
                  <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'Custo']}
                  />
                  <Bar dataKey="cost" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Evolução do Preço */}
            <div className="rounded-xl bg-card border border-border p-5">
              <h3 className="font-semibold text-foreground mb-4">Evolução do Preço/Litro</h3>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={costOverTime}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  />
                  <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 3 })}`, 'Preço/L']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="price" 
                    stroke="hsl(var(--warning))" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--warning))' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Lista de abastecimentos */}
        {view === 'list' && (
          <>
            {fuelEntries && fuelEntries.length > 0 ? (
              <div className="rounded-xl border border-border overflow-hidden">
                <table className="w-full">
                  <thead className="bg-secondary">
                    <tr>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Data</th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Veículo</th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Motorista</th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Litros</th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Preço/L</th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Total</th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Km</th>
                      <th className="p-4"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {fuelEntries.map((entry) => (
                      <tr 
                        key={entry.id} 
                        className="border-t border-border hover:bg-secondary/50 transition-colors"
                      >
                        <td className="p-4 text-sm text-foreground">
                          {format(new Date(entry.entry_date), "dd/MM/yyyy", { locale: ptBR })}
                        </td>
                        <td className="p-4">
                          <div>
                            <p className="font-medium text-foreground">{entry.vehicle_plate}</p>
                            <p className="text-xs text-muted-foreground">{fuelTypeLabels[entry.fuel_type] || entry.fuel_type}</p>
                          </div>
                        </td>
                        <td className="p-4 text-sm text-foreground">{entry.driver_name}</td>
                        <td className="p-4 text-sm text-foreground">
                          {Number(entry.liters).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} L
                        </td>
                        <td className="p-4 text-sm text-foreground">
                          R$ {Number(entry.price_per_liter).toLocaleString('pt-BR', { minimumFractionDigits: 3 })}
                        </td>
                        <td className="p-4">
                          <span className="font-medium text-success">
                            R$ {Number(entry.total_cost).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </td>
                        <td className="p-4 text-sm text-muted-foreground">
                          {entry.mileage.toLocaleString('pt-BR')} km
                        </td>
                        <td className="p-4">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem 
                                className="text-destructive"
                                onClick={() => deleteFuelEntry.mutate(entry.id)}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 rounded-xl border border-border bg-card">
                <Fuel className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">Nenhum abastecimento registrado</p>
                <FuelEntryForm />
              </div>
            )}
          </>
        )}
      </div>
    </MainLayout>
  );
};

export default Abastecimentos;
