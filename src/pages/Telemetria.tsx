import { MainLayout } from '@/components/layout/MainLayout';
import { VehicleMap } from '@/components/telemetry/VehicleMap';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useVehicleTelemetry, useTelemetryAlerts } from '@/hooks/useTelemetry';
import { useVehicles } from '@/hooks/useVehicles';
import { Badge } from '@/components/ui/badge';
import { MapPin, AlertTriangle, Gauge, Activity } from 'lucide-react';
import { SpeedGauge } from '@/components/telemetry/SpeedGauge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const Telemetria = () => {
  const { data: telemetry } = useVehicleTelemetry();
  const { data: alerts } = useTelemetryAlerts(false);
  const { data: vehicles } = useVehicles();

  const activeVehicles = telemetry?.filter(t => t.ignition_on).length || 0;
  const movingVehicles = telemetry?.filter(t => t.speed > 0).length || 0;
  const recentAlerts = alerts?.slice(0, 5) || [];

  return (
    <MainLayout 
      title="Telemetria" 
      subtitle="Monitoramento em tempo real da frota"
    >
      <div className="space-y-6">
        {/* Cards de resumo */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
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

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-success/20">
                  <Activity className="h-6 w-6 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{activeVehicles}</p>
                  <p className="text-sm text-muted-foreground">Ignição Ligada</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-amber-500/20">
                  <Gauge className="h-6 w-6 text-amber-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{movingVehicles}</p>
                  <p className="text-sm text-muted-foreground">Em Movimento</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
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

        {/* Mapa */}
        <VehicleMap />

        {/* Veículos e Alertas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Lista de veículos */}
          <Card>
            <CardHeader>
              <CardTitle>Status dos Veículos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {telemetry?.map((t) => (
                  <div key={t.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <div className="flex items-center gap-3">
                      <SpeedGauge value={t.speed} size="sm" />
                      <div>
                        <p className="font-medium">{t.vehicle_plate}</p>
                        <p className="text-sm text-muted-foreground">
                          {t.ignition_on ? 'Ignição ligada' : 'Ignição desligada'}
                        </p>
                      </div>
                    </div>
                    <Badge variant={t.speed > 0 ? "default" : t.ignition_on ? "secondary" : "outline"}>
                      {t.speed > 0 ? 'Movimento' : t.ignition_on ? 'Parado' : 'Desligado'}
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

          {/* Alertas recentes */}
          <Card>
            <CardHeader>
              <CardTitle>Alertas Recentes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {recentAlerts.map((alert) => (
                  <div key={alert.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                    <AlertTriangle className={`h-5 w-5 mt-0.5 ${
                      alert.severity === 'critical' ? 'text-destructive' : 'text-warning'
                    }`} />
                    <div className="flex-1">
                      <p className="font-medium">{alert.title}</p>
                      <p className="text-sm text-muted-foreground">{alert.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(alert.event_timestamp), "dd/MM HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                    <Badge variant={alert.severity === 'critical' ? "destructive" : "secondary"}>
                      {alert.severity}
                    </Badge>
                  </div>
                ))}
                {recentAlerts.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhum alerta pendente
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
};

export default Telemetria;
