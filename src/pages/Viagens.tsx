import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useTrips, useDeleteTrip, Trip } from '@/hooks/useTrips';
import { TripForm } from '@/components/forms/TripForm';
import { TripEditForm } from '@/components/forms/TripEditForm';
import { DateRangeFilter } from '@/components/DateRangeFilter';
import { DriverVehicleAssignment } from '@/components/driver-portal/DriverVehicleAssignment';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Truck, 
  Loader2, 
  MoreVertical, 
  Trash2,
  Pencil,
  ArrowUpRight,
  ArrowDownLeft,
  Package,
  RotateCcw,
  User,
  Link2
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
  LabelList,
} from 'recharts';

const Viagens = () => {
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [view, setView] = useState<'list' | 'charts'>('list');
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  
  const { data: trips, isLoading } = useTrips(startDate, endDate);
  const deleteTrip = useDeleteTrip();

  const handleDateChange = (start?: Date, end?: Date) => {
    setStartDate(start);
    setEndDate(end);
  };

  // Calcular estatísticas de ciclos - sem conversão de peso
  const stats = {
    totalTrips: trips?.length || 0,
    totalCycles: trips?.reduce((acc, t) => acc + Number(t.cycle_value), 0) || 0,
    escoamento: trips?.filter(t => t.trip_type === 'escoamento').length || 0,
    abastecimento: trips?.filter(t => t.trip_type === 'abastecimento').length || 0,
    pesoEscoamento: trips?.filter(t => t.trip_type === 'escoamento').reduce((acc, t) => acc + Number(t.weight), 0) || 0,
    pesoAbastecimento: trips?.filter(t => t.trip_type === 'abastecimento').reduce((acc, t) => acc + Number(t.weight), 0) || 0,
  };

  // Ciclos por motorista
  const cyclesByDriver = trips?.reduce((acc, trip) => {
    const existing = acc.find(d => d.driver_name === trip.driver_name);
    if (existing) {
      existing.cycles += Number(trip.cycle_value);
      existing.trips += 1;
    } else {
      acc.push({
        driver_name: trip.driver_name,
        cycles: Number(trip.cycle_value),
        trips: 1,
      });
    }
    return acc;
  }, [] as { driver_name: string; cycles: number; trips: number }[]) || [];

  // Ciclos por veículo
  const cyclesByVehicle = trips?.reduce((acc, trip) => {
    const existing = acc.find(v => v.vehicle_plate === trip.vehicle_plate);
    if (existing) {
      existing.cycles += Number(trip.cycle_value);
      existing.trips += 1;
    } else {
      acc.push({
        vehicle_plate: trip.vehicle_plate,
        cycles: Number(trip.cycle_value),
        trips: 1,
      });
    }
    return acc;
  }, [] as { vehicle_plate: string; cycles: number; trips: number }[]) || [];

  if (isLoading) {
    return (
      <MainLayout title="Viagens" subtitle="Controle de viagens e ciclos">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout 
      title="Viagens" 
      subtitle="Controle de viagens e ciclos"
    >
      <Tabs defaultValue="viagens" className="space-y-6 animate-fade-in">
        <TabsList>
          <TabsTrigger value="viagens">
            <Truck className="w-4 h-4 mr-2" />
            Viagens
          </TabsTrigger>
          <TabsTrigger value="vinculacao">
            <Link2 className="w-4 h-4 mr-2" />
            Vinculação Motorista-Veículo
          </TabsTrigger>
        </TabsList>

        <TabsContent value="viagens" className="space-y-6">
          {/* Stats - Peso exibido sem conversão (já está em toneladas) */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="rounded-xl bg-card border border-border p-4">
              <div className="flex items-center gap-2 mb-2">
                <Truck className="w-5 h-5 text-primary" />
                <span className="text-sm text-muted-foreground">Total Viagens</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{stats.totalTrips}</p>
            </div>
            <div className="rounded-xl bg-card border border-border p-4">
              <div className="flex items-center gap-2 mb-2">
                <RotateCcw className="w-5 h-5 text-success" />
                <span className="text-sm text-muted-foreground">Total Ciclos</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{stats.totalCycles.toFixed(1)}</p>
            </div>
            <div className="rounded-xl bg-card border border-border p-4">
              <div className="flex items-center gap-2 mb-2">
                <ArrowUpRight className="w-5 h-5 text-warning" />
                <span className="text-sm text-muted-foreground">Escoamentos</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{stats.escoamento}</p>
            </div>
            <div className="rounded-xl bg-card border border-border p-4">
              <div className="flex items-center gap-2 mb-2">
                <ArrowDownLeft className="w-5 h-5 text-info" />
                <span className="text-sm text-muted-foreground">Abastecimentos</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{stats.abastecimento}</p>
            </div>
            <div className="rounded-xl bg-card border border-border p-4">
              <div className="flex items-center gap-2 mb-2">
                <Package className="w-5 h-5 text-warning" />
                <span className="text-sm text-muted-foreground">Peso Escoam.</span>
              </div>
              <p className="text-2xl font-bold text-foreground">
                {stats.pesoEscoamento.toFixed(2)} t
              </p>
            </div>
            <div className="rounded-xl bg-card border border-border p-4">
              <div className="flex items-center gap-2 mb-2">
                <Package className="w-5 h-5 text-info" />
                <span className="text-sm text-muted-foreground">Peso Abast.</span>
              </div>
              <p className="text-2xl font-bold text-foreground">
                {stats.pesoAbastecimento.toFixed(2)} t
              </p>
            </div>
          </div>

        {/* Toggle, Filtros e Form */}
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
          <TripForm />
        </div>

        {/* Gráficos */}
        {view === 'charts' && trips && trips.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Ciclos por Motorista - Gráfico */}
            <div className="rounded-xl bg-card border border-border p-5">
              <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <User className="w-4 h-4" />
                Ciclos por Motorista
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={cyclesByDriver.sort((a, b) => b.cycles - a.cycles)}>
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
                    formatter={(value: number) => [`${value.toFixed(1)} ciclos`, 'Ciclos']}
                  />
                  <Bar dataKey="cycles" fill="hsl(var(--success))" radius={[4, 4, 0, 0]}>
                    <LabelList dataKey="cycles" position="top" fill="hsl(var(--foreground))" fontSize={11} formatter={(v: number) => v.toFixed(1)} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Ciclos por Veículo - Gráfico */}
            <div className="rounded-xl bg-card border border-border p-5">
              <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <Truck className="w-4 h-4" />
                Ciclos por Veículo
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={cyclesByVehicle.sort((a, b) => b.cycles - a.cycles)}>
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
                    formatter={(value: number) => [`${value.toFixed(1)} ciclos`, 'Ciclos']}
                  />
                  <Bar dataKey="cycles" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]}>
                    <LabelList dataKey="cycles" position="top" fill="hsl(var(--foreground))" fontSize={11} formatter={(v: number) => v.toFixed(1)} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Resumo por Motorista e Veículo (lista) */}
        {view === 'list' && trips && trips.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-xl bg-card border border-border p-5">
              <h3 className="font-semibold text-foreground mb-4">Ciclos por Motorista</h3>
              <div className="space-y-3">
                {cyclesByDriver.sort((a, b) => b.cycles - a.cycles).slice(0, 5).map((item) => (
                  <div key={item.driver_name} className="flex items-center justify-between">
                    <span className="text-sm text-foreground">{item.driver_name}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground">{item.trips} viagens</span>
                      <Badge className="bg-success text-success-foreground">
                        {item.cycles.toFixed(1)} ciclos
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl bg-card border border-border p-5">
              <h3 className="font-semibold text-foreground mb-4">Ciclos por Veículo</h3>
              <div className="space-y-3">
                {cyclesByVehicle.sort((a, b) => b.cycles - a.cycles).slice(0, 5).map((item) => (
                  <div key={item.vehicle_plate} className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">{item.vehicle_plate}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground">{item.trips} viagens</span>
                      <Badge className="bg-primary text-primary-foreground">
                        {item.cycles.toFixed(1)} ciclos
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Lista de viagens */}
        {view === 'list' && (
          <>
            {trips && trips.length > 0 ? (
              <div className="rounded-xl border border-border overflow-hidden">
                <table className="w-full">
                  <thead className="bg-secondary">
                    <tr>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Data</th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Tipo</th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Veículo</th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Motorista</th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Peso (t)</th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Ciclo</th>
                      <th className="p-4"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {trips.map((trip) => (
                      <tr 
                        key={trip.id} 
                        className="border-t border-border hover:bg-secondary/50 transition-colors"
                      >
                        <td className="p-4 text-sm text-foreground">
                          {format(new Date(trip.departure_date), "dd/MM/yyyy", { locale: ptBR })}
                        </td>
                        <td className="p-4">
                          <Badge className={cn(
                            "text-xs",
                            trip.trip_type === 'escoamento' 
                              ? "bg-warning text-warning-foreground" 
                              : "bg-info text-info-foreground"
                          )}>
                            <span className="flex items-center gap-1">
                              {trip.trip_type === 'escoamento' ? (
                                <><ArrowUpRight className="w-3 h-3" /> Escoamento</>
                              ) : (
                                <><ArrowDownLeft className="w-3 h-3" /> Abastecimento</>
                              )}
                            </span>
                          </Badge>
                        </td>
                        <td className="p-4 text-sm font-medium text-foreground">
                          {trip.vehicle_plate}
                        </td>
                        <td className="p-4 text-sm text-foreground">{trip.driver_name}</td>
                        <td className="p-4">
                          <div className="flex items-center gap-1 text-sm">
                            <Package className="w-3.5 h-3.5 text-muted-foreground" />
                            <span className={cn(
                              Number(trip.weight) > 0 ? "text-foreground" : "text-muted-foreground"
                            )}>
                              {Number(trip.weight).toFixed(2)}
                            </span>
                          </div>
                        </td>
                        <td className="p-4">
                          <Badge className={cn(
                            "text-xs",
                            Number(trip.cycle_value) > 0 
                              ? "bg-success text-success-foreground" 
                              : "bg-muted text-muted-foreground"
                          )}>
                            {Number(trip.cycle_value).toFixed(1)}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setEditingTrip(trip)}>
                                <Pencil className="w-4 h-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="text-destructive"
                                onClick={() => deleteTrip.mutate(trip.id)}
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
                <Truck className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">Nenhuma viagem registrada</p>
                <TripForm />
              </div>
            )}
          </>
        )}
        </TabsContent>

        <TabsContent value="vinculacao">
          <DriverVehicleAssignment />
        </TabsContent>
      </Tabs>

      {/* Modal de Edição */}
      {editingTrip && (
        <TripEditForm 
          trip={editingTrip} 
          open={!!editingTrip} 
          onOpenChange={(open) => !open && setEditingTrip(null)} 
        />
      )}
    </MainLayout>
  );
};

export default Viagens;
