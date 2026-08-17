import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useDrivingBehaviorEvents, useDrivingScores } from '@/hooks/useDrivingBehavior';
import { 
  Gauge, AlertTriangle, Zap, Clock, Battery, MapPin, 
  TrendingUp, TrendingDown, Shield, Activity 
} from 'lucide-react';
import { EventDrilldownDialog } from '@/components/telemetry/EventDrilldownDialog';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';

const EVENT_LABELS: Record<string, string> = {
  speeding: 'Excesso Velocidade',
  high_rpm: 'RPM Alto',
  excessive_idle: 'Ociosidade',
  low_battery: 'Bateria Baixa',
  geofence_exit: 'Saída de Zona',
  geofence_enter_restricted: 'Zona Restrita',
  harsh_brake: 'Frenagem Brusca',
  harsh_accel: 'Aceleração Brusca',
};

const SEVERITY_COLORS: Record<string, string> = {
  info: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  warning: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  critical: 'bg-red-500/20 text-red-400 border-red-500/30',
};

const SCORE_COLOR = (score: number) => {
  if (score >= 80) return '#22c55e';
  if (score >= 60) return '#eab308';
  if (score >= 40) return '#f97316';
  return '#ef4444';
};

export function DrivingBehaviorDashboard() {
  const { data: events } = useDrivingBehaviorEvents(300);
  const { data: scores } = useDrivingScores();
  const [drilldown, setDrilldown] = useState<{ title: string; events: typeof events } | null>(null);

  const openDrilldown = (title: string, filter: (e: NonNullable<typeof events>[number]) => boolean) => {
    setDrilldown({ title, events: (events || []).filter(filter) });
  };

  // Event type distribution
  const eventDistribution = useMemo(() => {
    if (!events?.length) return [];
    const counts: Record<string, number> = {};
    for (const e of events) {
      counts[e.event_type] = (counts[e.event_type] || 0) + 1;
    }
    return Object.entries(counts).map(([type, count]) => ({
      name: EVENT_LABELS[type] || type,
      value: count,
      type,
    })).sort((a, b) => b.value - a.value);
  }, [events]);

  // Summary stats
  const stats = useMemo(() => {
    if (!events?.length) return { total: 0, critical: 0, warning: 0, info: 0, batteryAlerts: 0, geofenceAlerts: 0 };
    return {
      total: events.length,
      critical: events.filter(e => e.severity === 'critical').length,
      warning: events.filter(e => e.severity === 'warning').length,
      info: events.filter(e => e.severity === 'info').length,
      batteryAlerts: events.filter(e => e.event_type === 'low_battery').length,
      geofenceAlerts: events.filter(e => e.event_type.startsWith('geofence')).length,
    };
  }, [events]);

  // Recent events
  const recentEvents = events?.slice(0, 10) || [];

  // Score chart data
  const scoreChartData = useMemo(() => {
    if (!scores?.length) return [];
    return scores.slice(0, 10).map(s => ({
      name: s.vehiclePlate,
      score: s.overallScore,
      driver: s.driverName || 'N/I',
      color: SCORE_COLOR(s.overallScore),
    }));
  }, [scores]);

  const avgScore = scores?.length 
    ? Math.round(scores.reduce((acc, s) => acc + s.overallScore, 0) / scores.length) 
    : 0;

  const PIE_COLORS = ['#ef4444', '#f97316', '#eab308', '#3b82f6', '#22c55e', '#8b5cf6'];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground uppercase flex items-center gap-1">
              <Shield className="w-3 h-3" /> Score Médio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" style={{ color: SCORE_COLOR(avgScore) }}>{avgScore}</div>
            <p className="text-xs text-muted-foreground">últimos 7 dias</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border cursor-pointer hover:border-primary/50 transition-colors" onClick={() => openDrilldown('Todos os Eventos', () => true)}>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground uppercase flex items-center gap-1">
              <Activity className="w-3 h-3" /> Total Eventos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats.total}</div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border cursor-pointer hover:border-primary/50 transition-colors" onClick={() => openDrilldown('Eventos Críticos', (e) => e.severity === 'critical')}>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground uppercase flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-destructive" /> Críticos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.critical}</div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border cursor-pointer hover:border-primary/50 transition-colors" onClick={() => openDrilldown('Alertas de Excesso de Velocidade', (e) => e.event_type === 'speeding')}>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground uppercase flex items-center gap-1">
              <Gauge className="w-3 h-3 text-warning" /> Velocidade
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{eventDistribution.find(e => e.type === 'speeding')?.value || 0}</div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border cursor-pointer hover:border-primary/50 transition-colors" onClick={() => openDrilldown('Alertas de Bateria', (e) => e.event_type === 'low_battery')}>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground uppercase flex items-center gap-1">
              <Battery className="w-3 h-3 text-orange-400" /> Bateria
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-400">{stats.batteryAlerts}</div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border cursor-pointer hover:border-primary/50 transition-colors" onClick={() => openDrilldown('Alertas de Geofence', (e) => e.event_type.startsWith('geofence'))}>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground uppercase flex items-center gap-1">
              <MapPin className="w-3 h-3 text-purple-400" /> Geofence
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-400">{stats.geofenceAlerts}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Score by Vehicle */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Score de Condução por Veículo
            </CardTitle>
          </CardHeader>
          <CardContent>
            {scoreChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={scoreChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" domain={[0, 100]} stroke="hsl(var(--muted-foreground))" />
                  <YAxis dataKey="name" type="category" width={80} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--foreground))' }}
                    formatter={(value: number, _name: string, props: any) => [`${value} pts - ${props.payload.driver}`, 'Score']}
                  />
                  <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                    {scoreChartData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-muted-foreground py-8">Nenhum dado de comportamento ainda. Execute a sincronização.</p>
            )}
          </CardContent>
        </Card>

        {/* Event Distribution */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              Distribuição de Eventos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {eventDistribution.length > 0 ? (
              <div className="flex items-center gap-6">
                <ResponsiveContainer width="50%" height={250}>
                  <PieChart>
                    <Pie data={eventDistribution} dataKey="value" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${value}`}>
                      {eventDistribution.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 flex-1">
                  {eventDistribution.map((item, i) => (
                    <div
                      key={item.type}
                      className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 rounded px-1 py-0.5"
                      onClick={() => openDrilldown(item.name, (e) => e.event_type === item.type)}
                    >
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="text-xs text-muted-foreground flex-1">{item.name}</span>
                      <span className="text-sm font-bold text-foreground">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">Sem eventos registrados.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Vehicle Scores Detail */}
      {scores && scores.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Detalhamento por Veículo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {scores.slice(0, 9).map((s) => (
                <div key={s.vehiclePlate} className="p-4 rounded-lg border border-border bg-background">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-bold text-foreground">{s.vehiclePlate}</p>
                      <p className="text-xs text-muted-foreground">{s.driverName || 'Motorista N/I'}</p>
                    </div>
                    <div className="text-2xl font-bold" style={{ color: SCORE_COLOR(s.overallScore) }}>
                      {s.overallScore}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground">Velocidade</span>
                        <span className="text-foreground">{s.speedScore}</span>
                      </div>
                      <Progress value={s.speedScore} className="h-1.5" />
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground">RPM</span>
                        <span className="text-foreground">{s.rpmScore}</span>
                      </div>
                      <Progress value={s.rpmScore} className="h-1.5" />
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground">Ociosidade</span>
                        <span className="text-foreground">{s.idleScore}</span>
                      </div>
                      <Progress value={s.idleScore} className="h-1.5" />
                    </div>
                    <div className="flex items-center gap-2 mt-2 text-xs">
                      <span className="text-muted-foreground">{s.totalEvents} eventos</span>
                      {s.criticalEvents > 0 && (
                        <Badge variant="destructive" className="text-[10px]">{s.criticalEvents} críticos</Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Events */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Eventos Recentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentEvents.length > 0 ? (
            <div className="space-y-2">
              {recentEvents.map((evt) => (
                <div
                  key={evt.id}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border bg-background cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => openDrilldown(EVENT_LABELS[evt.event_type] || evt.event_type, (e) => e.event_type === evt.event_type)}
                >
                  <Badge className={`text-[10px] ${SEVERITY_COLORS[evt.severity] || SEVERITY_COLORS.info}`}>
                    {evt.severity === 'critical' ? '🔴' : evt.severity === 'warning' ? '🟡' : '🔵'} {EVENT_LABELS[evt.event_type] || evt.event_type}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate">
                      <span className="font-semibold">{evt.vehicle_plate}</span>
                      {evt.driver_name && <span className="text-muted-foreground"> • {evt.driver_name}</span>}
                    </p>
                    {evt.location_name && (
                      <p className="text-xs text-muted-foreground truncate">{evt.location_name}</p>
                    )}
                  </div>
                  <div className="text-right text-xs text-muted-foreground whitespace-nowrap">
                    {evt.speed !== null && evt.speed !== undefined && <span>{evt.speed} km/h</span>}
                    {evt.rpm && <span className="ml-2">{evt.rpm} RPM</span>}
                    {evt.battery_level && <span className="ml-2">🔋{evt.battery_level}V</span>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">Nenhum evento de comportamento registrado ainda.</p>
          )}
        </CardContent>
      </Card>
      <EventDrilldownDialog
        open={!!drilldown}
        onOpenChange={(o) => !o && setDrilldown(null)}
        title={drilldown?.title || ''}
        events={drilldown?.events || []}
      />
    </div>
  );
}
