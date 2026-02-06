import { useState } from 'react';
import { cn } from '@/lib/utils';
import { MainLayout } from '@/components/layout/MainLayout';
import { VehicleMap } from '@/components/telemetry/VehicleMap';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useVehicleTelemetry, useTelemetryAlerts, useTelemetrySettings, useUpdateTelemetrySettings } from '@/hooks/useTelemetry';
import { useVehicles } from '@/hooks/useVehicles';
import { useUserRole } from '@/hooks/useUserRole';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  MapPin, AlertTriangle, Gauge, Activity, Settings, 
  Fuel, Zap, ChevronDown, ChevronUp,
  Check, Timer
} from 'lucide-react';
import { TelemetryReportExport } from '@/components/reports/TelemetryReportExport';
import { NotificationSettings } from '@/components/notifications/NotificationSettings';
import { SpeedGauge } from '@/components/telemetry/SpeedGauge';
import { GForceGauge } from '@/components/telemetry/GForceGauge';
import { FuelConsumptionGauge } from '@/components/telemetry/FuelConsumptionGauge';
import { LiveSpeedometers } from '@/components/telemetry/LiveSpeedometers';
import { IdleTimeChart } from '@/components/telemetry/IdleTimeChart';
import { FuelConsumptionChart } from '@/components/telemetry/FuelConsumptionChart';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const Telemetria = () => {
  const { data: telemetry, isLoading: telemetryLoading } = useVehicleTelemetry();
  const { data: alerts } = useTelemetryAlerts(false);
  const { data: vehicles } = useVehicles();
  const { data: settings } = useTelemetrySettings();
  const updateSettings = useUpdateTelemetrySettings();
  
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [expandedAlerts, setExpandedAlerts] = useState<Set<string>>(new Set());
  const [dashboardFilter, setDashboardFilter] = useState<string | null>(null);
  
  // Estado para configurações
  const [speedLimitUrban, setSpeedLimitUrban] = useState(settings?.speed_limit_urban?.toString() || '60');
  const [speedLimitHighway, setSpeedLimitHighway] = useState(settings?.speed_limit_highway?.toString() || '80');
  const [idleWarning, setIdleWarning] = useState(settings?.idle_warning_minutes?.toString() || '10');
  const [idleCritical, setIdleCritical] = useState(settings?.idle_critical_minutes?.toString() || '30');
  const [hardBrakeThreshold, setHardBrakeThreshold] = useState(settings?.hard_brake_threshold?.toString() || '0.5');
  const [hardAccelThreshold, setHardAccelThreshold] = useState(settings?.hard_accel_threshold?.toString() || '0.4');
  const [expectedConsumption, setExpectedConsumption] = useState(settings?.expected_consumption?.toString() || '3.5');

  // Contagens corrigidas: speed > 0 implica ignição ligada (safety net)
  const ignitionOn = telemetry?.filter(t => t.ignition_on || t.speed > 0).length || 0;
  const movingVehicles = telemetry?.filter(t => t.speed > 0).length || 0;
  const idleVehicles = telemetry?.filter(t => t.speed === 0 && (t.ignition_on || false)).length || 0;
  const recentAlerts = alerts?.slice(0, 10) || [];

  // Filtrar telemetria pelos cards clicáveis
  const filteredTelemetry = dashboardFilter
    ? telemetry?.filter(t => {
        switch (dashboardFilter) {
          case 'all': return true;
          case 'ignition': return t.ignition_on || t.speed > 0;
          case 'moving': return t.speed > 0; // speed > 0 implica ignição
          case 'idle': return t.speed === 0 && t.ignition_on;
          case 'off': return !t.ignition_on && t.speed === 0;
          case 'alerts': return true; // alerts are separate
          default: return true;
        }
      })
    : telemetry;

  const toggleFilter = (filter: string) => {
    setDashboardFilter(prev => prev === filter ? null : filter);
  };

  // Dados do veículo selecionado
  const selectedTelemetry = telemetry?.find(t => t.vehicle_id === selectedVehicle);

  // Toggle detalhes do alerta
  const toggleAlertDetails = (alertId: string) => {
    const newSet = new Set(expandedAlerts);
    if (newSet.has(alertId)) {
      newSet.delete(alertId);
    } else {
      newSet.add(alertId);
    }
    setExpandedAlerts(newSet);
  };

  // Salvar configurações
  const handleSaveSettings = () => {
    if (settings?.id) {
      updateSettings.mutate({
        id: settings.id,
        speed_limit_urban: parseInt(speedLimitUrban),
        speed_limit_highway: parseInt(speedLimitHighway),
        idle_warning_minutes: parseInt(idleWarning),
        idle_critical_minutes: parseInt(idleCritical),
        hard_brake_threshold: parseFloat(hardBrakeThreshold),
        hard_accel_threshold: parseFloat(hardAccelThreshold),
        expected_consumption: parseFloat(expectedConsumption),
      });
      setSettingsOpen(false);
    }
  };

  // Calcular estatísticas de força G
  const gForceStats = telemetry?.reduce((acc, t) => {
    const maxG = Math.max(Math.abs(t.g_force_x || 0), Math.abs(t.g_force_y || 0), Math.abs(t.g_force_z || 0));
    if (maxG > acc.max) acc.max = maxG;
    acc.total += maxG;
    acc.count++;
    return acc;
  }, { max: 0, total: 0, count: 0 }) || { max: 0, total: 0, count: 0 };

  const avgGForce = gForceStats.count > 0 ? gForceStats.total / gForceStats.count : 0;

  return (
    <MainLayout 
      title="Telemetria" 
      subtitle="Monitoramento em tempo real da frota"
    >
      <Tabs defaultValue="mapa" className="space-y-6">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="mapa">
              <MapPin className="w-4 h-4 mr-2" />
              Mapa
            </TabsTrigger>
            <TabsTrigger value="velocidade">
              <Gauge className="w-4 h-4 mr-2" />
              Velocidade
            </TabsTrigger>
            <TabsTrigger value="gforce">
              <Zap className="w-4 h-4 mr-2" />
              Força G
            </TabsTrigger>
            <TabsTrigger value="consumo">
              <Fuel className="w-4 h-4 mr-2" />
              Consumo
            </TabsTrigger>
            <TabsTrigger value="ociosidade">
              <Timer className="w-4 h-4 mr-2" />
              Ociosidade
            </TabsTrigger>
            <TabsTrigger value="alertas">
              <AlertTriangle className="w-4 h-4 mr-2" />
              Alertas
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            <TelemetryReportExport />
            <NotificationSettings />
            <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Settings className="w-4 h-4 mr-2" />
                  Configurações
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Configurações de Telemetria</DialogTitle>
                <DialogDescription>
                  Defina os limites e parâmetros para alertas automáticos
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Limite Urbano (km/h)</Label>
                    <Input 
                      type="number" 
                      value={speedLimitUrban} 
                      onChange={(e) => setSpeedLimitUrban(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Limite Rodovia (km/h)</Label>
                    <Input 
                      type="number" 
                      value={speedLimitHighway} 
                      onChange={(e) => setSpeedLimitHighway(e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Alerta Ociosidade (min)</Label>
                    <Input 
                      type="number" 
                      value={idleWarning} 
                      onChange={(e) => setIdleWarning(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Crítico Ociosidade (min)</Label>
                    <Input 
                      type="number" 
                      value={idleCritical} 
                      onChange={(e) => setIdleCritical(e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Frenagem Brusca (G)</Label>
                    <Input 
                      type="number" 
                      step="0.1"
                      value={hardBrakeThreshold} 
                      onChange={(e) => setHardBrakeThreshold(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Aceleração Brusca (G)</Label>
                    <Input 
                      type="number" 
                      step="0.1"
                      value={hardAccelThreshold} 
                      onChange={(e) => setHardAccelThreshold(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Consumo Esperado (km/l)</Label>
                  <Input 
                    type="number" 
                    step="0.1"
                    value={expectedConsumption} 
                    onChange={(e) => setExpectedConsumption(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setSettingsOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSaveSettings} disabled={updateSettings.isPending}>
                  <Check className="w-4 h-4 mr-2" />
                  Salvar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        {/* Cards de resumo - clicáveis para filtrar */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card 
            className={cn("cursor-pointer transition-all hover:ring-2 hover:ring-primary/50", dashboardFilter === 'all' && "ring-2 ring-primary")}
            onClick={() => toggleFilter('all')}
          >
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-primary/20">
                  <MapPin className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{vehicles?.length || 0}</p>
                  <p className="text-sm text-muted-foreground">Veículos</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card 
            className={cn("cursor-pointer transition-all hover:ring-2 hover:ring-success/50", dashboardFilter === 'ignition' && "ring-2 ring-success")}
            onClick={() => toggleFilter('ignition')}
          >
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-success/20">
                  <Activity className="h-6 w-6 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{ignitionOn}</p>
                  <p className="text-sm text-muted-foreground">Ignição Ligada</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card 
            className={cn("cursor-pointer transition-all hover:ring-2 hover:ring-emerald-500/50", dashboardFilter === 'moving' && "ring-2 ring-emerald-500")}
            onClick={() => toggleFilter('moving')}
          >
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-emerald-500/20">
                  <Gauge className="h-6 w-6 text-emerald-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{movingVehicles}</p>
                  <p className="text-sm text-muted-foreground">Em Movimento</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card 
            className={cn("cursor-pointer transition-all hover:ring-2 hover:ring-amber-500/50", dashboardFilter === 'idle' && "ring-2 ring-amber-500")}
            onClick={() => toggleFilter('idle')}
          >
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-amber-500/20">
                  <Timer className="h-6 w-6 text-amber-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{idleVehicles}</p>
                  <p className="text-sm text-muted-foreground">Ociosidade</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card 
            className={cn("cursor-pointer transition-all hover:ring-2 hover:ring-destructive/50", dashboardFilter === 'alerts' && "ring-2 ring-destructive")}
            onClick={() => toggleFilter('alerts')}
          >
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-destructive/20">
                  <AlertTriangle className="h-6 w-6 text-destructive" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{recentAlerts.length}</p>
                  <p className="text-sm text-muted-foreground">Alertas Pendentes</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {dashboardFilter && (
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-sm">
              Filtro: {dashboardFilter === 'all' ? 'Todos' : dashboardFilter === 'ignition' ? 'Ignição Ligada' : dashboardFilter === 'moving' ? 'Em Movimento' : dashboardFilter === 'idle' ? 'Ociosidade' : dashboardFilter === 'off' ? 'Desligados' : 'Alertas'}
            </Badge>
            <Button variant="ghost" size="sm" onClick={() => setDashboardFilter(null)}>
              Limpar filtro
            </Button>
          </div>
        )}

        {/* Tab: Mapa */}
        <TabsContent value="mapa" className="space-y-6">
          <VehicleMap filterData={filteredTelemetry} />
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Status dos Veículos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {(filteredTelemetry || telemetry)?.map((t) => (
                    <div 
                      key={t.id} 
                      className={cn(
                        "flex items-center justify-between p-3 rounded-lg bg-muted/30 cursor-pointer transition-colors",
                        selectedVehicle === t.vehicle_id ? 'ring-2 ring-primary' : 'hover:bg-muted/50'
                      )}
                      onClick={() => setSelectedVehicle(t.vehicle_id)}
                    >
                      <div className="flex items-center gap-3">
                        <SpeedGauge value={t.speed} size="sm" />
                        <div>
                          <p className="font-medium">{t.vehicle_plate}</p>
                          <p className="text-sm text-muted-foreground">
                            {t.speed > 0 ? 'Em movimento' : t.ignition_on ? 'Ocioso' : 'Desligado'}
                          </p>
                        </div>
                      </div>
                      <Badge 
                        variant={t.speed > 0 ? "default" : t.ignition_on ? "secondary" : "outline"}
                        className={cn(
                          t.speed > 0 && "bg-success text-success-foreground",
                          t.speed === 0 && t.ignition_on && "bg-amber-500 text-white",
                        )}
                      >
                        {t.speed > 0 ? 'Movimento' : t.ignition_on ? 'Ocioso' : 'Desligado'}
                      </Badge>
                    </div>
                  ))}
                  {(!telemetry || telemetry.length === 0) && (
                    <p className="text-center text-muted-foreground py-8">
                      Nenhum dado de telemetria disponível
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Detalhes do veículo selecionado */}
            <Card>
              <CardHeader>
                <CardTitle>
                  {selectedTelemetry ? `Detalhes: ${selectedTelemetry.vehicle_plate}` : 'Selecione um veículo'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedTelemetry ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 rounded-lg bg-muted/30">
                        <SpeedGauge value={selectedTelemetry.speed} size="lg" />
                        <p className="mt-2 text-sm text-muted-foreground">Velocidade</p>
                      </div>
                      <div className="text-center p-4 rounded-lg bg-muted/30">
                        <GForceGauge 
                          value={Math.max(
                            Math.abs(selectedTelemetry.g_force_x || 0), 
                            Math.abs(selectedTelemetry.g_force_y || 0)
                          )}
                          label="Força G"
                          size="lg"
                        />
                        <p className="mt-2 text-sm text-muted-foreground">Força G</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Coordenadas</span>
                        <span>{selectedTelemetry.latitude?.toFixed(6)}, {selectedTelemetry.longitude?.toFixed(6)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Direção</span>
                        <span>{selectedTelemetry.heading}°</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Odômetro</span>
                        <span>{selectedTelemetry.odometer?.toLocaleString()} km</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Última atualização</span>
                        <span>{format(new Date(selectedTelemetry.received_at), "dd/MM HH:mm:ss", { locale: ptBR })}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    Clique em um veículo para ver detalhes
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab: Velocidade */}
        <TabsContent value="velocidade" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Monitoramento de Velocidade</CardTitle>
              <CardDescription>
                Limite urbano: {settings?.speed_limit_urban || 60} km/h | 
                Limite rodovia: {settings?.speed_limit_highway || 80} km/h
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {telemetry?.map((t) => (
                  <div key={t.id} className="text-center p-6 rounded-lg bg-muted/30">
                    <p className="font-medium mb-4">{t.vehicle_plate}</p>
                    <SpeedGauge 
                      value={t.speed} 
                      size="lg" 
                      limit={settings?.speed_limit_highway || 80}
                    />
                    <Badge 
                      className="mt-4"
                      variant={
                        t.speed > (settings?.speed_limit_highway || 80) ? "destructive" :
                        t.speed > (settings?.speed_limit_urban || 60) ? "secondary" :
                        "default"
                      }
                    >
                      {t.speed > (settings?.speed_limit_highway || 80) ? 'Acima do limite' :
                       t.speed > (settings?.speed_limit_urban || 60) ? 'Atenção' :
                       'Normal'}
                    </Badge>
                  </div>
                ))}
                {(!telemetry || telemetry.length === 0) && (
                  <p className="col-span-full text-center text-muted-foreground py-8">
                    Nenhum dado de velocidade disponível
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Força G */}
        <TabsContent value="gforce" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-3xl font-bold text-primary">{avgGForce.toFixed(2)}G</p>
                  <p className="text-sm text-muted-foreground">Força G Média</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-3xl font-bold text-destructive">{gForceStats.max.toFixed(2)}G</p>
                  <p className="text-sm text-muted-foreground">Maior Impacto</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-3xl font-bold">
                    {alerts?.filter(a => a.alert_type === 'hard_brake' || a.alert_type === 'hard_accel').length || 0}
                  </p>
                  <p className="text-sm text-muted-foreground">Eventos Bruscos (hoje)</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Força G por Veículo</CardTitle>
              <CardDescription>
                Frenagem brusca: {'>'}{settings?.hard_brake_threshold || 0.5}G | 
                Aceleração brusca: {'>'}{settings?.hard_accel_threshold || 0.4}G
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {telemetry?.map((t) => {
                  const maxG = Math.max(
                    Math.abs(t.g_force_x || 0), 
                    Math.abs(t.g_force_y || 0), 
                    Math.abs(t.g_force_z || 0)
                  );
                  const threshold = settings?.hard_brake_threshold || 0.5;
                  
                  return (
                    <div key={t.id} className="text-center p-6 rounded-lg bg-muted/30">
                      <p className="font-medium mb-4">{t.vehicle_plate}</p>
                      <GForceGauge 
                        value={maxG}
                        label="Total"
                        size="lg"
                        threshold={threshold}
                      />
                      <div className="mt-4 text-sm">
                        <p>X: {(t.g_force_x || 0).toFixed(2)}G</p>
                        <p>Y: {(t.g_force_y || 0).toFixed(2)}G</p>
                        <p>Z: {(t.g_force_z || 0).toFixed(2)}G</p>
                      </div>
                      <Badge 
                        className="mt-2"
                        variant={maxG > threshold ? "destructive" : "default"}
                      >
                        {maxG > threshold ? 'Impacto Detectado' : 'Normal'}
                      </Badge>
                    </div>
                  );
                })}
                {(!telemetry || telemetry.length === 0) && (
                  <p className="col-span-full text-center text-muted-foreground py-8">
                    Nenhum dado de força G disponível
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Consumo */}
        <TabsContent value="consumo" className="space-y-6">
          <FuelConsumptionChart />
        </TabsContent>

        {/* Tab: Ociosidade */}
        <TabsContent value="ociosidade" className="space-y-6">
          <IdleTimeChart />
        </TabsContent>

        {/* Tab: Alertas */}
        <TabsContent value="alertas" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Alertas de Telemetria</CardTitle>
              <CardDescription>
                Clique em um alerta para ver detalhes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentAlerts.map((alert) => (
                  <Collapsible 
                    key={alert.id}
                    open={expandedAlerts.has(alert.id)}
                    onOpenChange={() => toggleAlertDetails(alert.id)}
                  >
                    <CollapsibleTrigger asChild>
                      <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors">
                        <AlertTriangle className={`h-5 w-5 mt-0.5 flex-shrink-0 ${
                          alert.severity === 'critical' ? 'text-destructive' : 'text-warning'
                        }`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{alert.title}</p>
                            <Badge variant="outline" className="text-xs">
                              {alert.vehicle_plate}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground truncate">{alert.message}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(alert.event_timestamp), "dd/MM HH:mm", { locale: ptBR })}
                          </p>
                        </div>
                        <Badge variant={alert.severity === 'critical' ? "destructive" : "secondary"}>
                          {alert.severity}
                        </Badge>
                        {expandedAlerts.has(alert.id) ? (
                          <ChevronUp className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="p-4 mt-2 rounded-lg bg-card border">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Tipo de Alerta</p>
                            <p className="font-medium">{alert.alert_type}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Veículo</p>
                            <p className="font-medium">{alert.vehicle_plate}</p>
                          </div>
                          {alert.driver_name && (
                            <div>
                              <p className="text-muted-foreground">Motorista</p>
                              <p className="font-medium">{alert.driver_name}</p>
                            </div>
                          )}
                          {alert.speed !== null && (
                            <div>
                              <p className="text-muted-foreground">Velocidade</p>
                              <p className="font-medium">{alert.speed} km/h</p>
                            </div>
                          )}
                          {alert.g_force !== null && (
                            <div>
                              <p className="text-muted-foreground">Força G</p>
                              <p className="font-medium">{alert.g_force?.toFixed(2)}G</p>
                            </div>
                          )}
                          {alert.location_name && (
                            <div className="col-span-2">
                              <p className="text-muted-foreground">Localização</p>
                              <p className="font-medium">{alert.location_name}</p>
                            </div>
                          )}
                          {alert.latitude && alert.longitude && (
                            <div className="col-span-2">
                              <p className="text-muted-foreground">Coordenadas</p>
                              <p className="font-medium">{alert.latitude}, {alert.longitude}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                ))}
                {recentAlerts.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhum alerta pendente
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </MainLayout>
  );
};

export default Telemetria;
