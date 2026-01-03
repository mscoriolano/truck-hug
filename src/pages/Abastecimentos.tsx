import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useFuelEntries, useDeleteFuelEntry } from '@/hooks/useFuelEntries';
import { useVehicles } from '@/hooks/useVehicles';
import { FuelEntryForm } from '@/components/forms/FuelEntryForm';
import { DateRangeFilter } from '@/components/DateRangeFilter';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Fuel, 
  Loader2, 
  MoreVertical, 
  Trash2, 
  TrendingUp,
  DollarSign,
  Gauge,
  Route,
  User,
  Truck as TruckIcon
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
  ReferenceLine,
  ComposedChart,
} from 'recharts';

const fuelTypeLabels: Record<string, string> = {
  diesel: 'Diesel',
  diesel_s10: 'Diesel S10',
  gasoline: 'Gasolina',
  ethanol: 'Etanol',
};

const Abastecimentos = () => {
  const [view, setView] = useState<'list' | 'charts'>('list');
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  
  const { data: fuelEntries, isLoading } = useFuelEntries(startDate, endDate);
  const { data: vehicles } = useVehicles();
  const deleteFuelEntry = useDeleteFuelEntry();

  const handleDateChange = (start?: Date, end?: Date) => {
    setStartDate(start);
    setEndDate(end);
  };

  // Calcular consumo por km (km/L) para cada entrada
  const entriesWithConsumption = fuelEntries?.map((entry, index, arr) => {
    // Encontrar entrada anterior do mesmo veículo
    const previousEntries = arr.slice(index + 1).filter(e => e.vehicle_id === entry.vehicle_id);
    const previousEntry = previousEntries[0];
    
    let kmPerLiter = 0;
    let kmRodados = 0;
    
    if (previousEntry && entry.mileage > previousEntry.mileage) {
      kmRodados = entry.mileage - previousEntry.mileage;
      kmPerLiter = kmRodados / Number(entry.liters);
    }
    
    return { ...entry, kmPerLiter, kmRodados };
  }) || [];

  // Estatísticas
  const totalKm = entriesWithConsumption.reduce((acc, e) => acc + e.kmRodados, 0);
  const totalLiters = fuelEntries?.reduce((acc, e) => acc + Number(e.liters), 0) || 0;
  const avgConsumption = totalLiters > 0 ? totalKm / totalLiters : 0;
  
  const stats = {
    totalLiters,
    totalCost: fuelEntries?.reduce((acc, e) => acc + Number(e.total_cost), 0) || 0,
    avgPricePerLiter: fuelEntries?.length 
      ? fuelEntries.reduce((acc, e) => acc + Number(e.price_per_liter), 0) / fuelEntries.length 
      : 0,
    entriesCount: fuelEntries?.length || 0,
    avgConsumption,
    totalKm,
  };

  // Meta de consumo média dos veículos
  const avgTarget = vehicles?.reduce((acc, v) => acc + (Number(v.consumption_target) || 2.5), 0) / (vehicles?.length || 1) || 2.5;

  // Dados para gráfico de abastecimentos por motorista
  const driverData = fuelEntries?.reduce((acc, entry) => {
    const existing = acc.find(d => d.driver_name === entry.driver_name);
    if (existing) {
      existing.abastecimentos += 1;
      existing.liters += Number(entry.liters);
      existing.cost += Number(entry.total_cost);
    } else {
      acc.push({
        driver_name: entry.driver_name,
        abastecimentos: 1,
        liters: Number(entry.liters),
        cost: Number(entry.total_cost),
      });
    }
    return acc;
  }, [] as { driver_name: string; abastecimentos: number; liters: number; cost: number }[]) || [];

  // Km rodados por motorista
  const kmByDriver = entriesWithConsumption.reduce((acc, entry) => {
    const existing = acc.find(d => d.driver_name === entry.driver_name);
    if (existing) {
      existing.km += entry.kmRodados;
      existing.liters += Number(entry.liters);
    } else {
      acc.push({
        driver_name: entry.driver_name,
        km: entry.kmRodados,
        liters: Number(entry.liters),
      });
    }
    return acc;
  }, [] as { driver_name: string; km: number; liters: number }[]);

  // Km rodados por veículo
  const kmByVehicle = entriesWithConsumption.reduce((acc, entry) => {
    const existing = acc.find(v => v.vehicle_plate === entry.vehicle_plate);
    if (existing) {
      existing.km += entry.kmRodados;
      existing.liters += Number(entry.liters);
    } else {
      acc.push({
        vehicle_plate: entry.vehicle_plate,
        km: entry.kmRodados,
        liters: Number(entry.liters),
      });
    }
    return acc;
  }, [] as { vehicle_plate: string; km: number; liters: number }[]);

  // Média km/L por veículo com meta
  const consumptionByVehicle = kmByVehicle.map(v => {
    const vehicle = vehicles?.find(veh => veh.plate === v.vehicle_plate);
    const target = Number(vehicle?.consumption_target) || 2.5;
    const avgKmL = v.liters > 0 ? v.km / v.liters : 0;
    return {
      vehicle_plate: v.vehicle_plate,
      avgKmL: Number(avgKmL.toFixed(2)),
      target,
    };
  });

  // Dados para gráfico de consumo ao longo do tempo
  const consumptionOverTime = entriesWithConsumption
    .filter(e => e.kmPerLiter > 0)
    .slice(0, 15)
    .reverse()
    .map(entry => ({
      date: format(new Date(entry.entry_date), 'dd/MM', { locale: ptBR }),
      kmL: Number(entry.kmPerLiter.toFixed(2)),
      vehicle: entry.vehicle_plate,
    }));

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
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
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
          <div className="rounded-xl bg-card border border-border p-4">
            <div className="flex items-center gap-2 mb-2">
              <Route className="w-5 h-5 text-primary" />
              <span className="text-sm text-muted-foreground">Km Rodados</span>
            </div>
            <p className="text-2xl font-bold text-foreground">
              {stats.totalKm.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
            </p>
          </div>
          <div className="rounded-xl bg-card border border-border p-4">
            <div className="flex items-center gap-2 mb-2">
              <Gauge className="w-5 h-5 text-success" />
              <span className="text-sm text-muted-foreground">Média km/L</span>
            </div>
            <p className={cn(
              "text-2xl font-bold",
              stats.avgConsumption >= avgTarget ? "text-success" : "text-destructive"
            )}>
              {stats.avgConsumption.toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground">Meta: {avgTarget.toFixed(2)} km/L</p>
          </div>
        </div>

        {/* Toggle, Filter & Form */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
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
            <DateRangeFilter
              startDate={startDate}
              endDate={endDate}
              onDateChange={handleDateChange}
            />
          </div>
          <FuelEntryForm />
        </div>

        {view === 'charts' && fuelEntries && fuelEntries.length > 0 && (
          <div className="space-y-6">
            {/* Primeira linha de gráficos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Abastecimentos por Motorista */}
              <div className="rounded-xl bg-card border border-border p-5">
                <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Abastecimentos por Motorista
                </h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={driverData.sort((a, b) => b.abastecimentos - a.abastecimentos)}>
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
                      formatter={(value: number) => [value, 'Abastecimentos']}
                    />
                    <Bar dataKey="abastecimentos" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Km por Motorista */}
              <div className="rounded-xl bg-card border border-border p-5">
                <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Route className="w-4 h-4" />
                  Km Rodados por Motorista
                </h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={kmByDriver.sort((a, b) => b.km - a.km)}>
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
                      formatter={(value: number) => [`${value.toLocaleString('pt-BR')} km`, 'Km Rodados']}
                    />
                    <Bar dataKey="km" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Segunda linha de gráficos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Km por Veículo */}
              <div className="rounded-xl bg-card border border-border p-5">
                <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                  <TruckIcon className="w-4 h-4" />
                  Km Rodados por Veículo
                </h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={kmByVehicle.sort((a, b) => b.km - a.km)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="vehicle_plate" 
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    />
                    <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number) => [`${value.toLocaleString('pt-BR')} km`, 'Km Rodados']}
                    />
                    <Bar dataKey="km" fill="hsl(var(--info))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Média km/L por Veículo com Meta */}
              <div className="rounded-xl bg-card border border-border p-5">
                <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Gauge className="w-4 h-4" />
                  Média km/L por Veículo (com Meta)
                </h3>
                <ResponsiveContainer width="100%" height={250}>
                  <ComposedChart data={consumptionByVehicle.sort((a, b) => b.avgKmL - a.avgKmL)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="vehicle_plate" 
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    />
                    <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number, name: string) => [
                        `${value.toFixed(2)} km/L`, 
                        name === 'avgKmL' ? 'Consumo' : 'Meta'
                      ]}
                    />
                    <Bar dataKey="avgKmL" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    <ReferenceLine y={avgTarget} stroke="hsl(var(--destructive))" strokeDasharray="5 5" label={{ value: `Meta: ${avgTarget}`, fill: 'hsl(var(--destructive))', fontSize: 12 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Evolução do Consumo */}
            {consumptionOverTime.length > 0 && (
              <div className="rounded-xl bg-card border border-border p-5">
                <h3 className="font-semibold text-foreground mb-4">Evolução do Consumo (km/L)</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={consumptionOverTime}>
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
                      formatter={(value: number, name: string) => [`${value.toFixed(2)} km/L`, name === 'kmL' ? 'Consumo' : name]}
                      labelFormatter={(label) => `Data: ${label}`}
                    />
                    <ReferenceLine y={avgTarget} stroke="hsl(var(--destructive))" strokeDasharray="5 5" />
                    <Line 
                      type="monotone" 
                      dataKey="kmL" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--primary))' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  Linha vermelha tracejada = Meta de consumo ({avgTarget.toFixed(2)} km/L)
                </p>
              </div>
            )}
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
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">km/L</th>
                      <th className="p-4"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {entriesWithConsumption.map((entry) => {
                      const vehicle = vehicles?.find(v => v.id === entry.vehicle_id);
                      const target = Number(vehicle?.consumption_target) || 2.5;
                      const isAboveTarget = entry.kmPerLiter >= target;
                      
                      return (
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
                            {entry.kmPerLiter > 0 ? (
                              <Badge className={cn(
                                "text-xs",
                                isAboveTarget 
                                  ? "bg-success text-success-foreground" 
                                  : "bg-destructive text-destructive-foreground"
                              )}>
                                {entry.kmPerLiter.toFixed(2)}
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">-</span>
                            )}
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
                      );
                    })}
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