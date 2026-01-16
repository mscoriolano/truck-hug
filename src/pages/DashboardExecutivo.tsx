import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Truck, Users, Fuel, Wrench, AlertTriangle, TrendingUp, TrendingDown,
  DollarSign, Gauge, Timer, Target, Award, BarChart3, PieChart,
  Activity, Calendar, MapPin, Trophy
} from 'lucide-react';
import { useVehicles } from '@/hooks/useVehicles';
import { useDrivers } from '@/hooks/useDrivers';
import { useFuelEntries } from '@/hooks/useFuelEntries';
import { useMaintenances } from '@/hooks/useMaintenances';
import { useTrips } from '@/hooks/useTrips';
import { useTelemetryAlerts, useVehicleTelemetry } from '@/hooks/useTelemetry';
import { useTripStatistics } from '@/hooks/useTripStatistics';
import { useDriverScores } from '@/hooks/useDriverScores';
import { useMonthlyPerformance } from '@/hooks/useFinancialData';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart as RechartsPie, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--success))', 'hsl(var(--warning))', 'hsl(var(--destructive))', 'hsl(var(--info))'];

const DashboardExecutivo = () => {
  const [period, setPeriod] = useState('month');
  
  const { data: vehicles } = useVehicles();
  const { data: drivers } = useDrivers();
  const { data: fuelEntries } = useFuelEntries();
  const { data: maintenances } = useMaintenances();
  const { data: trips } = useTrips();
  const { data: telemetryAlerts } = useTelemetryAlerts();
  const { data: telemetry } = useVehicleTelemetry();
  const { data: tripStats } = useTripStatistics();
  const { data: driverScores } = useDriverScores();
  const { data: monthlyPerformance } = useMonthlyPerformance();

  // KPIs calculados
  const activeVehicles = vehicles?.filter(v => v.status === 'active').length || 0;
  const totalVehicles = vehicles?.length || 0;
  const fleetAvailability = totalVehicles > 0 ? (activeVehicles / totalVehicles) * 100 : 0;

  const activeDrivers = drivers?.filter(d => d.status !== 'terminated').length || 0;
  const drivingDrivers = drivers?.filter(d => d.status === 'driving').length || 0;

  const totalFuelCost = fuelEntries?.reduce((acc, e) => acc + e.total_cost, 0) || 0;
  const totalFuelLiters = fuelEntries?.reduce((acc, e) => acc + e.liters, 0) || 0;
  
  // Calcular consumo médio a partir dos abastecimentos (dados reais)
  const sortedFuelEntries = [...(fuelEntries || [])].sort((a, b) => {
    if (a.vehicle_id !== b.vehicle_id) return a.vehicle_id.localeCompare(b.vehicle_id);
    return new Date(b.entry_date).getTime() - new Date(a.entry_date).getTime();
  });
  
  let totalKmFromFuel = 0;
  let totalLitersForCalc = 0;
  sortedFuelEntries.forEach((entry, index, arr) => {
    const previousEntries = arr.slice(index + 1).filter(e => e.vehicle_id === entry.vehicle_id);
    const previousEntry = previousEntries[0];
    if (previousEntry && entry.mileage > previousEntry.mileage) {
      totalKmFromFuel += entry.mileage - previousEntry.mileage;
      totalLitersForCalc += entry.liters;
    }
  });
  
  const avgConsumption = totalLitersForCalc > 0 ? totalKmFromFuel / totalLitersForCalc : 0;

  const totalMaintenanceCost = maintenances?.reduce((acc, m) => acc + (m.cost || 0), 0) || 0;
  const pendingMaintenances = maintenances?.filter(m => m.status === 'scheduled' || m.status === 'overdue').length || 0;

  const criticalAlerts = telemetryAlerts?.filter(a => a.severity === 'critical' && !a.acknowledged).length || 0;
  const warningAlerts = telemetryAlerts?.filter(a => a.severity === 'warning' && !a.acknowledged).length || 0;

  const totalTrips = trips?.length || 0;
  const totalWeight = trips?.reduce((acc, t) => acc + t.weight, 0) || 0;
  const totalKm = totalKmFromFuel; // Usar km calculado dos abastecimentos

  const avgDriverScore = driverScores?.length 
    ? driverScores.reduce((acc, s) => acc + (s.total_score || 0), 0) / driverScores.length 
    : 0;

  // Dados para gráficos
  const costBreakdown = [
    { name: 'Combustível', value: totalFuelCost, color: 'hsl(var(--primary))' },
    { name: 'Manutenção', value: totalMaintenanceCost, color: 'hsl(var(--warning))' },
    { name: 'Outros', value: (monthlyPerformance?.[0]?.variable_cost || 0) - totalFuelCost - totalMaintenanceCost, color: 'hsl(var(--info))' },
  ].filter(c => c.value > 0);

  const vehicleStatusData = [
    { name: 'Ativos', value: vehicles?.filter(v => v.status === 'active').length || 0 },
    { name: 'Manutenção', value: vehicles?.filter(v => v.status === 'maintenance').length || 0 },
    { name: 'Inativos', value: vehicles?.filter(v => v.status === 'inactive').length || 0 },
  ];

  const driverStatusData = [
    { name: 'Dirigindo', value: drivers?.filter(d => d.status === 'driving').length || 0 },
    { name: 'Disponíveis', value: drivers?.filter(d => d.status === 'available').length || 0 },
    { name: 'Descansando', value: drivers?.filter(d => d.status === 'resting').length || 0 },
    { name: 'Folga/Férias', value: drivers?.filter(d => d.status === 'off' || d.status === 'vacation').length || 0 },
  ];

  // Top motoristas por score
  const topDrivers = driverScores
    ?.sort((a, b) => (b.total_score || 0) - (a.total_score || 0))
    .slice(0, 5) || [];

  // Consumo por veículo - calculado a partir dos abastecimentos reais
  const consumptionByVehicle = sortedFuelEntries
    .reduce((acc, entry, index, arr) => {
      const previousEntries = arr.slice(index + 1).filter(e => e.vehicle_id === entry.vehicle_id);
      const previousEntry = previousEntries[0];
      
      if (previousEntry && entry.mileage > previousEntry.mileage) {
        const kmRodados = entry.mileage - previousEntry.mileage;
        const consumption = kmRodados / entry.liters;
        
        const existing = acc.find(v => v.plate === entry.vehicle_plate);
        if (existing) {
          existing.totalKm += kmRodados;
          existing.totalLiters += entry.liters;
        } else {
          acc.push({
            plate: entry.vehicle_plate,
            totalKm: kmRodados,
            totalLiters: entry.liters,
          });
        }
      }
      return acc;
    }, [] as { plate: string; totalKm: number; totalLiters: number }[])
    .map(v => ({
      plate: v.plate,
      consumption: v.totalLiters > 0 ? v.totalKm / v.totalLiters : 0,
      km: v.totalKm,
    }))
    .filter(v => v.consumption > 0)
    .sort((a, b) => b.consumption - a.consumption)
    .slice(0, 8);

  return (
    <MainLayout 
      title="Dashboard Executivo" 
      subtitle="Visão consolidada da frota, custos e performance"
    >
      <div className="space-y-6 animate-fade-in">
        {/* Filtro de período */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">Última Semana</SelectItem>
                <SelectItem value="month">Este Mês</SelectItem>
                <SelectItem value="quarter">Trimestre</SelectItem>
                <SelectItem value="year">Este Ano</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Badge variant="outline" className="text-sm">
            Atualizado em {format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          </Badge>
        </div>

        {/* KPIs Principais */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {/* Disponibilidade da Frota */}
          <Card className={cn(
            "col-span-1",
            fleetAvailability >= 90 ? "border-success/30" : fleetAvailability >= 70 ? "border-warning/30" : "border-destructive/30"
          )}>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-2">
                <Truck className="w-4 h-4 text-primary" />
                <span className="text-xs text-muted-foreground">Disponibilidade</span>
              </div>
              <div className="text-2xl font-bold">{fleetAvailability.toFixed(1)}%</div>
              <div className="text-xs text-muted-foreground">{activeVehicles}/{totalVehicles} veículos</div>
            </CardContent>
          </Card>

          {/* Motoristas Ativos */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-success" />
                <span className="text-xs text-muted-foreground">Motoristas</span>
              </div>
              <div className="text-2xl font-bold">{drivingDrivers}/{activeDrivers}</div>
              <div className="text-xs text-muted-foreground">dirigindo agora</div>
            </CardContent>
          </Card>

          {/* Custo Combustível */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-2">
                <Fuel className="w-4 h-4 text-warning" />
                <span className="text-xs text-muted-foreground">Combustível</span>
              </div>
              <div className="text-2xl font-bold">
                R$ {(totalFuelCost / 1000).toFixed(1)}k
              </div>
              <div className="text-xs text-muted-foreground">{totalFuelLiters.toFixed(0)} litros</div>
            </CardContent>
          </Card>

          {/* Consumo Médio */}
          <Card className={cn(
            avgConsumption >= 3.5 ? "border-success/30" : avgConsumption >= 2.5 ? "border-warning/30" : "border-destructive/30"
          )}>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-2">
                <Gauge className="w-4 h-4 text-info" />
                <span className="text-xs text-muted-foreground">Consumo Médio</span>
              </div>
              <div className="text-2xl font-bold">{avgConsumption.toFixed(2)}</div>
              <div className="text-xs text-muted-foreground">km/L</div>
            </CardContent>
          </Card>

          {/* Custo Manutenção */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-2">
                <Wrench className="w-4 h-4 text-primary" />
                <span className="text-xs text-muted-foreground">Manutenção</span>
              </div>
              <div className="text-2xl font-bold">
                R$ {(totalMaintenanceCost / 1000).toFixed(1)}k
              </div>
              <div className="text-xs text-muted-foreground">{pendingMaintenances} pendentes</div>
            </CardContent>
          </Card>

          {/* Alertas */}
          <Card className={cn(
            criticalAlerts > 0 && "border-destructive/50 bg-destructive/5"
          )}>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className={cn("w-4 h-4", criticalAlerts > 0 ? "text-destructive" : "text-muted-foreground")} />
                <span className="text-xs text-muted-foreground">Alertas</span>
              </div>
              <div className="text-2xl font-bold">{criticalAlerts + warningAlerts}</div>
              <div className="text-xs text-muted-foreground">{criticalAlerts} críticos</div>
            </CardContent>
          </Card>
        </div>

        {/* Segunda linha de KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="w-4 h-4 text-primary" />
                <span className="text-xs text-muted-foreground">Total Viagens</span>
              </div>
              <div className="text-2xl font-bold">{totalTrips}</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-4 h-4 text-success" />
                <span className="text-xs text-muted-foreground">KM Rodados</span>
              </div>
              <div className="text-2xl font-bold">{(totalKm / 1000).toFixed(1)}k</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-warning" />
                <span className="text-xs text-muted-foreground">Peso Transportado</span>
              </div>
              <div className="text-2xl font-bold">{(totalWeight / 1000).toFixed(1)}t</div>
            </CardContent>
          </Card>

          <Card className={cn(
            avgDriverScore >= 85 ? "border-success/30" : avgDriverScore >= 70 ? "border-warning/30" : "border-destructive/30"
          )}>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-2">
                <Award className="w-4 h-4 text-info" />
                <span className="text-xs text-muted-foreground">Score Médio</span>
              </div>
              <div className="text-2xl font-bold">{avgDriverScore.toFixed(0)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Status da Frota */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Truck className="w-4 h-4" />
                Status da Frota
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPie>
                    <Pie
                      data={vehicleStatusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                      labelLine={false}
                    >
                      {vehicleStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RechartsPie>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Status dos Motoristas */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-4 h-4" />
                Status dos Motoristas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPie>
                    <Pie
                      data={driverStatusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                      labelLine={false}
                    >
                      {driverStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RechartsPie>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Distribuição de Custos */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Distribuição de Custos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPie>
                    <Pie
                      data={costBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, value }) => `${name}: R$${(value / 1000).toFixed(1)}k`}
                      labelLine={false}
                    >
                      {costBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} />
                  </RechartsPie>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Segunda linha de gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Consumo por Veículo */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Fuel className="w-4 h-4" />
                Consumo por Veículo (km/L)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={consumptionByVehicle} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" domain={[0, 5]} />
                    <YAxis type="category" dataKey="plate" width={80} tick={{ fontSize: 11 }} />
                    <Tooltip 
                      formatter={(value: number, name: string) => [
                        name === 'consumption' ? `${value.toFixed(2)} km/L` : `${value.toFixed(0)} km`,
                        name === 'consumption' ? 'Consumo' : 'Distância'
                      ]} 
                    />
                    <Bar dataKey="consumption" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Top Motoristas */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Trophy className="w-4 h-4" />
                Top 5 Motoristas por Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topDrivers.map((driver, index) => (
                  <div key={driver.id} className="flex items-center gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                      index === 0 ? "bg-yellow-500/20 text-yellow-600" :
                      index === 1 ? "bg-gray-300/30 text-gray-600" :
                      index === 2 ? "bg-amber-600/20 text-amber-700" :
                      "bg-muted text-muted-foreground"
                    )}>
                      {index + 1}º
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium truncate">{driver.driver_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {driver.total_km?.toFixed(0) || 0} km | {driver.avg_consumption?.toFixed(2) || 0} km/L
                      </p>
                    </div>
                    <div className={cn(
                      "text-lg font-bold",
                      (driver.total_score || 0) >= 85 ? "text-success" :
                      (driver.total_score || 0) >= 70 ? "text-warning" : "text-destructive"
                    )}>
                      {driver.total_score?.toFixed(0) || 0}
                    </div>
                  </div>
                ))}
                {topDrivers.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhum dado de score disponível
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Alertas recentes */}
        {(criticalAlerts > 0 || warningAlerts > 0) && (
          <Card className="border-destructive/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2 text-destructive">
                <AlertTriangle className="w-4 h-4" />
                Alertas Não Reconhecidos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {telemetryAlerts
                  ?.filter(a => !a.acknowledged)
                  .slice(0, 6)
                  .map((alert) => (
                    <div 
                      key={alert.id} 
                      className={cn(
                        "p-3 rounded-lg border",
                        alert.severity === 'critical' ? "bg-destructive/10 border-destructive/30" : "bg-warning/10 border-warning/30"
                      )}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <Badge variant={alert.severity === 'critical' ? 'destructive' : 'outline'} className="text-xs">
                          {alert.severity === 'critical' ? 'Crítico' : 'Alerta'}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(alert.event_timestamp), 'HH:mm')}
                        </span>
                      </div>
                      <p className="text-sm font-medium">{alert.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">{alert.vehicle_plate}</p>
                    </div>
                  ))
                }
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
};

export default DashboardExecutivo;