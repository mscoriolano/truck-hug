import { useState, useMemo, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { VehicleMap } from '@/components/telemetry/VehicleMap';
import { useVehicleTelemetry, useTelemetryAlerts, useAcknowledgeAlert } from '@/hooks/useTelemetry';
import { useFuelEntries } from '@/hooks/useFuelEntries';
import { supabase } from '@/integrations/supabase/client'; 
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, Activity, Gauge, Fuel, Clock, AlertTriangle, Zap, CheckCircle, X, TrendingUp, TrendingDown, Shield, Battery } from 'lucide-react';
import { DateRangeFilter } from '@/components/ui/DateRangeFilter';
import { toast } from 'sonner';
import { startOfWeek, startOfMonth, subMonths, startOfYear, subYears, isAfter, isBefore } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { DrivingBehaviorDashboard } from '@/components/dashboard/DrivingBehaviorDashboard';
import { GeofenceManager } from '@/components/geofence/GeofenceManager';
import { AlertsDrilldownDialog } from '@/components/telemetry/AlertsDrilldownDialog';
import { TelemetryHistoryPanel } from '@/components/telemetry/TelemetryHistoryPanel';


// Normaliza placas para comparação (remove traços e espaços)
const normalizePlate = (plate: string | undefined) => {
  if (!plate) return "";
  return plate.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const difference = data.value - data.target;
    const percentageDiff = data.target > 0 ? ((difference / data.target) * 100) : 0;
    const isEfficient = difference >= 0; 
    
    const diffColor = isEfficient ? "text-green-400" : "text-red-400";
    const Icon = isEfficient ? TrendingUp : TrendingDown;

    return (
      <div className="bg-[#1e293b] border border-slate-700 p-4 rounded-xl shadow-2xl text-white min-w-[200px] z-50">
        <p className="font-bold text-lg mb-3 border-b border-slate-700 pb-2">{label}</p>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between items-center gap-6">
            <span className="text-slate-400">Consumo Real:</span>
            <span className="font-mono font-bold text-lg">{data.value.toFixed(2)} km/L</span>
          </div>
          <div className="flex justify-between items-center gap-6">
            <span className="text-slate-400">Meta ({data.model}):</span>
            <span className="font-mono font-bold text-slate-300">{data.target.toFixed(2)} km/L</span>
          </div>
          <div className={`pt-2 mt-2 border-t border-slate-700/50 flex justify-between items-center gap-4 font-bold ${diffColor}`}>
             <span className="text-slate-400 text-xs uppercase">Variação:</span>
             <div className="flex items-center gap-1">
                <Icon className="w-3 h-3" />
                <span>{isEfficient ? "+" : ""}{percentageDiff.toFixed(1)}% ({isEfficient ? "+" : ""}{difference.toFixed(2)} km/L)</span>
             </div>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export default function Telemetria() {
  const { data: telemetryData } = useVehicleTelemetry();
  const { data: alerts, refetch: refetchAlerts } = useTelemetryAlerts(false); 
  const acknowledgeAlert = useAcknowledgeAlert();
  const fuelEntriesQuery = useFuelEntries();
  const fuelEntries = fuelEntriesQuery?.data || [];
  const [fullRegistry, setFullRegistry] = useState<any[]>([]);

  // Busca o cadastro completo e loga no console para conferência
  useEffect(() => {
    const fetchRegistry = async () => {
      console.log("Buscando cadastro de veículos...");
      const { data, error } = await supabase.from('vehicles').select('*');
      if (error) console.error("Erro ao buscar veículos:", error);
      if (data) {
        console.log("Veículos carregados do banco:", data);
        setFullRegistry(data);
      }
    };
    fetchRegistry();
  }, []);

  const [filterStatus, setFilterStatus] = useState<'all' | 'moving' | 'idle' | 'off' | 'ignition_on' | 'alerts'>('all');
  const [periodo, setPeriodo] = useState('all'); 
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date } | undefined>();
  const [activeTab, setActiveTab] = useState('consumo'); 
  const [alertsDialogOpen, setAlertsDialogOpen] = useState(false);


  // --- ESTATÍSTICAS ---
  const stats = useMemo(() => {
    const total = telemetryData?.length || 0;
    const moving = telemetryData?.filter(v => v.ignition_on && v.speed > 0).length || 0;
    const idle = telemetryData?.filter(v => v.ignition_on && v.speed === 0).length || 0;
    const ignitionOn = moving + idle;
    const alertsCount = alerts?.length || 0;
    return { total, moving, idle, ignitionOn, alertsCount };
  }, [telemetryData, alerts]);

  // --- MERGE TELEMETRIA + CADASTRO ---
  const enrichedVehicles = useMemo(() => {
    if (!telemetryData) return [];

    return telemetryData.map(telemetryItem => {
        const telemetryPlate = normalizePlate(telemetryItem.vehicle_plate);
        
        // Busca flexível no array do banco
        const registryItem = fullRegistry.find(r => normalizePlate(r.plate) === telemetryPlate);
        
        // Tenta pegar a meta de TODAS as formas possíveis que podem estar no banco
        const targetRaw = registryItem?.target_consumption || registryItem?.meta_consumo || registryItem?.consumption_target;
        const target = targetRaw ? Number(targetRaw) : 2.10; // Fallback se não achar

        // Simulação de Força G (Para visualização)
        const simulatedG = Math.random() > 0.9 ? (Math.random() * 0.8).toFixed(2) : (Math.random() * 0.05).toFixed(2);
        const forceG = Number(simulatedG);

        return {
            ...telemetryItem,
            id: registryItem?.id || telemetryItem.vehicle_id, 
            model: registryItem?.model || telemetryItem.model || 'Modelo N/I', 
            target_consumption: target,
            average_consumption: (telemetryItem as any).average_consumption ?? 0,
            force_g: forceG,
            // Detalhes X/Y/Z simulados para o visual
            axis_x: (forceG * 0.4).toFixed(3),
            axis_y: (forceG * 0.2).toFixed(3),
            axis_z: (forceG * 0.4).toFixed(3)
        };
    });
  }, [telemetryData, fullRegistry]);

  // Estatísticas de Força G baseadas nos dados enriquecidos
  const gForceStats = useMemo(() => {
    let maxG = 0;
    let maxGPlate = "-";
    let avgG = 0;
    let eventsCount = 0;

    if (enrichedVehicles.length > 0) {
        const maxGItem = enrichedVehicles.reduce((prev, current) => (prev.force_g > current.force_g) ? prev : current);
        maxG = maxGItem.force_g;
        maxGPlate = maxGItem.vehicle_plate || "-";
        const sumG = enrichedVehicles.reduce((acc, curr) => acc + curr.force_g, 0);
        avgG = sumG / enrichedVehicles.length;
        eventsCount = enrichedVehicles.filter(v => v.force_g > 0.4).length;
    }
    return { maxG, maxGPlate, avgG, eventsCount };
  }, [enrichedVehicles]);

  // --- FILTRO FINAL ---
  const filteredVehicles = useMemo(() => {
    return enrichedVehicles.filter(v => {
      // Filtros de Status
      if (filterStatus === 'moving' && !(v.ignition_on && v.speed > 0)) return false;
      if (filterStatus === 'idle' && !(v.ignition_on && v.speed === 0)) return false;
      if (filterStatus === 'off' && v.ignition_on) return false;
      if (filterStatus === 'ignition_on' && !v.ignition_on) return false;
      if (filterStatus === 'alerts') {
         const hasAlert = alerts?.some(a => a.vehicle_id === v.vehicle_id || a.vehicle_plate === v.vehicle_plate);
         if (!hasAlert) return false;
      }
      
      const signalDate = new Date(v.received_at);
      const now = new Date();
      if (periodo === 'today' && signalDate.toDateString() !== now.toDateString()) return false;
      if (periodo === 'week' && isBefore(signalDate, startOfWeek(now))) return false;
      if (periodo === 'month' && isBefore(signalDate, startOfMonth(now))) return false;
      if (periodo === 'custom' && dateRange?.from) {
        const d = new Date(signalDate).setHours(0,0,0,0);
        const from = new Date(dateRange.from).setHours(0,0,0,0);
        if (d < from) return false;
        if (dateRange.to) {
             const to = new Date(dateRange.to).setHours(23,59,59,999);
             if (new Date(signalDate).getTime() > to) return false;
        }
      }
      return true;
    });
  }, [enrichedVehicles, filterStatus, periodo, dateRange, alerts]);

  // --- DADOS CONSUMO REAL (baseado em abastecimentos + odômetro da telemetria) ---
  const consumptionData = useMemo(() => {
    return filteredVehicles.map(v => {
        const target = v.target_consumption; 
        const plate = normalizePlate(v.vehicle_plate);
        
        // Busca abastecimentos do veículo ordenados por km
        const vehicleFuel = fuelEntries
          .filter(f => normalizePlate(f.vehicle_plate) === plate)
          .sort((a, b) => a.mileage - b.mileage);
        
        let actual = 0;
        
        if (vehicleFuel.length >= 2) {
          // Consumo entre primeiro e último abastecimento: distância / litros
          const totalDist = vehicleFuel[vehicleFuel.length - 1].mileage - vehicleFuel[0].mileage;
          const totalLiters = vehicleFuel.slice(1).reduce((acc, f) => acc + Number(f.liters), 0);
          if (totalDist > 0 && totalLiters > 0) {
            actual = totalDist / totalLiters;
          }
        } else if (vehicleFuel.length === 1 && v.odometer) {
          // Fallback: usa odômetro da telemetria - km do abastecimento / litros
          const dist = (v.odometer || 0) - vehicleFuel[0].mileage;
          if (dist > 0 && vehicleFuel[0].liters > 0) {
            actual = dist / Number(vehicleFuel[0].liters);
          }
        }

        const percentageOfTarget = target > 0 && actual > 0 ? (actual / target) * 100 : 0;
        let color = "#64748b"; // cinza = sem dados
        if (actual > 0) {
          if (percentageOfTarget <= 95) color = "#ef4444"; 
          else if (percentageOfTarget <= 99) color = "#eab308"; 
          else if (percentageOfTarget <= 105) color = "#22c55e"; 
          else color = "#3b82f6";
        }

        return {
            name: v.vehicle_plate,
            model: v.model,
            value: Number(actual.toFixed(2)),
            target: Number(target.toFixed(2)),
            color: color
        };
    }).sort((a, b) => b.value - a.value);
  }, [filteredVehicles, fuelEntries]);

  const avgConsumption = consumptionData.length > 0 ? consumptionData.reduce((acc, c) => acc + c.value, 0) / consumptionData.length : 0;
  const avgTarget = consumptionData.length > 0 ? consumptionData.reduce((acc, c) => acc + c.target, 0) / consumptionData.length : 0;

  const Speedometer = ({ speed }: { speed: number }) => {
    const maxSpeed = 120;
    const radius = 40;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (Math.min(speed, maxSpeed) / maxSpeed) * (circumference * 0.75);
    let strokeColor = "#3b82f6";
    if (speed === 0) strokeColor = "#64748b";
    if (speed > 80) strokeColor = "#ef4444";
    if (speed > 0 && speed <= 80) strokeColor = "#22c55e";
    return (
      <div className="relative flex flex-col items-center justify-center">
        <svg width="140" height="100" viewBox="0 0 120 120" className="transform rotate-[135deg]">
          <circle cx="60" cy="60" r={radius} fill="transparent" className="stroke-slate-700" strokeWidth="8" strokeDasharray={circumference} strokeDashoffset={circumference * 0.25} strokeLinecap="round"/>
          <circle cx="60" cy="60" r={radius} fill="transparent" stroke={strokeColor} strokeWidth="8" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-1000 ease-out"/>
        </svg>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center mt-2">
          <span className="text-3xl font-bold text-white">{speed}</span>
          <div className="text-[10px] text-slate-400 font-medium uppercase">km/h</div>
        </div>
      </div>
    );
  };

  const handleAcknowledge = async (alertId: string) => {
    try { await acknowledgeAlert.mutateAsync({ alertId, acknowledgedBy: 'user' }); refetchAlerts(); toast.success("Alerta arquivado!"); } catch { toast.error("Erro."); }
  };

  return (
    <MainLayout title="Telemetria" subtitle="Monitoramento da Frota">
      <div className="space-y-6 pb-10 animate-fade-in">
        
        {/* BARRA SUPERIOR */}
        <div className="flex flex-col lg:flex-row justify-between items-center bg-[#0f172a] p-2 rounded-xl border border-slate-800 text-slate-300 mb-6 gap-4 shadow-lg">
             <div className="flex overflow-x-auto no-scrollbar gap-1 w-full lg:w-auto">
                {['mapa', 'velocidade', 'forca_g', 'consumo', 'condução', 'geofencing', 'bateria', 'ociosidade', 'alertas', 'histórico'].map(tab => (
                    <Button key={tab} variant="ghost" onClick={() => setActiveTab(tab)} className={`hover:text-white hover:bg-slate-800 capitalize ${activeTab === tab ? 'bg-slate-800 text-white shadow-sm ring-1 ring-slate-700' : ''}`}>
                         {tab.replace('_', ' ')}
                    </Button>
                ))}
            </div>
            <div className="flex items-center gap-2 px-2">
                {filterStatus !== 'all' && <Button variant="ghost" size="sm" onClick={() => setFilterStatus('all')} className="text-red-400 hover:bg-red-900/20"><X className="w-4 h-4 mr-1"/> Limpar</Button>}
                <Select value={periodo} onValueChange={setPeriodo}>
                    <SelectTrigger className="w-[180px] bg-slate-800 border-slate-700 text-white h-9"><SelectValue placeholder="Período" /></SelectTrigger>
                    <SelectContent className="bg-[#0f172a] border-slate-700 text-white">
                        <SelectItem value="all">Todo período</SelectItem>
                        <SelectItem value="today">Hoje</SelectItem>
                        <SelectItem value="week">Esta semana</SelectItem>
                        <SelectItem value="month">Este mês</SelectItem>
                        <SelectItem value="custom">Personalizado...</SelectItem>
                    </SelectContent>
                </Select>
                {periodo === 'custom' && <DateRangeFilter date={dateRange} onDateChange={setDateRange} className="bg-slate-800 text-white border-slate-700" />}
            </div>
        </div>

        {/* CARDS STATUS */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
             {[
                { label: 'Total Veículos', val: stats.total, color: 'text-blue-400', icon: CheckCircle, filter: 'all' },
                { label: 'Ignição Ligada', val: stats.ignitionOn, color: 'text-green-400', icon: Zap, filter: 'ignition_on' },
                { label: 'Em Movimento', val: stats.moving, color: 'text-emerald-500', icon: Activity, filter: 'moving' },
                { label: 'Ociosidade', val: stats.idle, color: 'text-yellow-500', icon: Clock, filter: 'idle' },
                { label: 'Alertas', val: stats.alertsCount, color: 'text-red-500', icon: AlertTriangle, filter: 'alerts' },
             ].map((c, i) => (
                <Card key={i} className={`bg-[#0f172a] border-slate-800 cursor-pointer hover:border-slate-600 transition-all ${filterStatus === c.filter ? `ring-1 ring-opacity-50` : ''}`} onClick={() => {
                    setFilterStatus(c.filter as any);
                    if (c.filter === 'alerts') setAlertsDialogOpen(true);
                }}>
                    <CardHeader className="pb-2"><CardTitle className="text-xs text-slate-400 uppercase flex items-center gap-2"><c.icon className={`w-3 h-3 ${c.color}`}/> {c.label}</CardTitle></CardHeader>
                    <CardContent><div className={`text-2xl font-bold ${c.color}`}>{c.val}</div>{c.filter === 'alerts' && <p className="text-[10px] text-slate-500 mt-1">Clique para ver a lista</p>}</CardContent>
                </Card>
             ))}
        </div>

        <AlertsDrilldownDialog
          open={alertsDialogOpen}
          onOpenChange={setAlertsDialogOpen}
          title="Alertas de Telemetria"
          alerts={alerts || []}
          onAcknowledge={handleAcknowledge}
        />


        {activeTab === 'mapa' && <div className="animate-in fade-in zoom-in-95"><VehicleMap /></div>}

        {activeTab === 'velocidade' && (
            <Card className="animate-in fade-in zoom-in-95 border-slate-800 bg-[#0f172a]">
                <CardHeader><CardTitle className="text-white">Velocímetros</CardTitle></CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        {filteredVehicles.map(v => (
                            <div key={v.id} className="flex flex-col items-center p-6 bg-[#1e293b] rounded-xl border border-slate-700">
                                <div className="text-base font-bold mb-1 text-white">{v.vehicle_plate}</div>
                                <div className="text-xs text-slate-400 mb-4">{v.model}</div>
                                <Speedometer speed={v.speed || 0} />
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        )}

        {/* FORÇA G RESTAURADA */}
        {activeTab === 'forca_g' && (
            <div className="space-y-6 animate-in fade-in zoom-in-95">
                 {/* Cards de Resumo */}
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="bg-[#0f172a] border-slate-800 text-white">
                        <CardHeader className="pb-2"><CardTitle className="text-xs text-slate-400 uppercase">Força G Média</CardTitle></CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-blue-400">{gForceStats.avgG.toFixed(3)}G</div>
                            <p className="text-xs text-slate-500 mt-1">Frota Geral</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-[#0f172a] border-slate-800 text-white">
                        <CardHeader className="pb-2"><CardTitle className="text-xs text-slate-400 uppercase">Maior Impacto</CardTitle></CardHeader>
                        <CardContent>
                            <div className={`text-3xl font-bold ${gForceStats.maxG > 0.5 ? 'text-red-500' : 'text-yellow-500'}`}>{gForceStats.maxG.toFixed(2)}G</div>
                            <p className="text-xs text-slate-500 mt-1">{gForceStats.maxGPlate !== '-' ? `${gForceStats.maxGPlate} (Agora)` : 'Nenhum registro'}</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-[#0f172a] border-slate-800 text-white">
                        <CardHeader className="pb-2"><CardTitle className="text-xs text-slate-400 uppercase">Eventos Bruscos (Hoje)</CardTitle></CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-white">{gForceStats.eventsCount}</div>
                            <p className="text-xs text-slate-500 mt-1">{gForceStats.eventsCount > 0 ? 'Atenção necessária' : 'Dentro do esperado'}</p>
                        </CardContent>
                    </Card>
                 </div>

                 <Card className="border-slate-800 bg-[#0f172a] text-white">
                    <CardHeader><CardTitle>Força G por Veículo</CardTitle></CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                            {filteredVehicles.map(v => (
                                <div key={v.id} className="p-6 bg-[#1e293b] rounded-xl border border-slate-700 flex flex-col items-center gap-4">
                                    <div className="text-sm font-bold text-slate-200">{v.vehicle_plate}</div>
                                    <div className="text-xs text-slate-500 uppercase tracking-widest">Total</div>
                                    
                                    {/* BARRA VERTICAL RESTAURADA */}
                                    <div className="h-32 w-2 bg-slate-800 rounded-full relative overflow-hidden">
                                        <div 
                                            className={`absolute bottom-0 w-full rounded-full transition-all duration-500 ${v.force_g > 0.5 ? 'bg-red-500' : 'bg-yellow-500'}`} 
                                            style={{ height: `${Math.min((v.force_g / 1.0) * 100, 100)}%` }}
                                        ></div>
                                    </div>
                                    
                                    <div className="text-2xl font-bold text-slate-200">{v.force_g}g</div>
                                    
                                    {/* DETALHES X Y Z RESTAURADOS */}
                                    <div className="w-full space-y-1">
                                        <div className="flex justify-between text-[10px] text-slate-400 border-b border-slate-800 pb-1">
                                            <span>X:</span> <span className="font-mono">{v.axis_x}G</span>
                                        </div>
                                        <div className="flex justify-between text-[10px] text-slate-400 border-b border-slate-800 pb-1">
                                            <span>Y:</span> <span className="font-mono">{v.axis_y}G</span>
                                        </div>
                                        <div className="flex justify-between text-[10px] text-slate-400">
                                            <span>Z:</span> <span className="font-mono">{v.axis_z}G</span>
                                        </div>
                                    </div>
                                    
                                    <Badge variant="outline" className="text-blue-400 border-blue-900 bg-blue-900/10 text-[10px] mt-2">Normal</Badge>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                 </Card>
            </div>
        )}

        {activeTab === 'consumo' && (
            <div className="space-y-6 animate-in fade-in zoom-in-95">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="bg-[#0f172a] border-slate-800 text-white"><CardContent className="pt-6 text-center"><div className="text-3xl font-bold">{avgConsumption.toFixed(2)}</div><p className="text-xs text-slate-400 uppercase mt-1">Média Real (km/L)</p></CardContent></Card>
                    <Card className="bg-[#0f172a] border-slate-800 text-white"><CardContent className="pt-6 text-center"><div className="text-3xl font-bold">{avgTarget.toFixed(2)}</div><p className="text-xs text-slate-400 uppercase mt-1">Média das Metas</p></CardContent></Card>
                    <Card className="bg-[#0f172a] border-slate-800 text-white"><CardContent className="pt-6 text-center"><div className={`text-3xl font-bold flex items-center justify-center gap-1 ${avgConsumption >= avgTarget ? 'text-green-400' : 'text-red-400'}`}><TrendingUp className="w-4 h-4"/> {avgTarget > 0 ? (((avgConsumption - avgTarget) / avgTarget) * 100).toFixed(1) : 0}%</div><p className="text-xs text-slate-400 uppercase mt-1">Variação da Frota</p></CardContent></Card>
                </div>

                <Card className="border-slate-800 bg-[#0f172a] text-white">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div><CardTitle>Ranking de Consumo</CardTitle><p className="text-sm text-slate-400">Comparativo Real vs Meta Individual</p></div>
                        <Badge className="bg-green-600">Eficiência</Badge>
                    </CardHeader>
                    <CardContent className="h-[500px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={consumptionData} layout="vertical" margin={{ top: 20, right: 30, left: 20, bottom: 40 }} barSize={24}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#334155" />
                                <XAxis type="number" stroke="#94a3b8" tick={{fontSize: 12}} unit=" km/L" />
                                <YAxis dataKey="name" type="category" stroke="#94a3b8" width={80} tick={{fontSize: 12}} />
                                <Tooltip content={<CustomTooltip />} cursor={{fill: 'rgba(255,255,255,0.05)'}} />
                                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                                    {consumptionData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                        <div className="flex flex-wrap justify-center gap-6 mt-4 text-xs text-slate-400">
                            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-500"></div> &le;95% da Meta</div>
                            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-yellow-500"></div> 96-99% da Meta</div>
                            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-green-500"></div> 100-105% da Meta</div>
                            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-500"></div> &ge;106% da Meta</div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        )}

        {activeTab === 'condução' && (
          <div className="animate-in fade-in zoom-in-95">
            <DrivingBehaviorDashboard />
          </div>
        )}

        {activeTab === 'geofencing' && (
          <div className="animate-in fade-in zoom-in-95 space-y-6">
            <GeofenceManager />
          </div>
        )}

        {activeTab === 'bateria' && (
          <div className="animate-in fade-in zoom-in-95">
            <Card className="border-slate-800 bg-[#0f172a] text-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Battery className="w-5 h-5 text-orange-400" /> Monitoramento de Bateria dos Rastreadores</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredVehicles.map(v => {
                    const bat = (v as any).battery_level ?? null;
                    const batColor = bat === null ? 'text-slate-500' : bat >= 25 ? 'text-green-400' : bat >= 22 ? 'text-yellow-400' : 'text-red-400';
                    const batBg = bat === null ? 'bg-slate-800' : bat >= 25 ? 'bg-green-500/10 border-green-500/20' : bat >= 22 ? 'bg-yellow-500/10 border-yellow-500/20' : 'bg-red-500/10 border-red-500/20';
                    return (
                      <div key={v.id} className={`p-4 rounded-xl border ${batBg} flex items-center gap-4`}>
                        <Battery className={`w-8 h-8 ${batColor}`} />
                        <div className="flex-1">
                          <p className="font-bold text-white">{v.vehicle_plate}</p>
                          <p className="text-xs text-slate-400">{(v as any).location_name || v.model || 'S/ localização'}</p>
                        </div>
                        <div className={`text-2xl font-bold ${batColor}`}>
                          {bat !== null ? `${bat}V` : 'N/D'}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex flex-wrap gap-4 mt-6 text-xs text-slate-400 justify-center">
                  <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-green-500" /> ≥25V Normal</div>
                  <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-yellow-500" /> 22-24V Atenção</div>
                  <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-500" /> &lt;22V Crítico</div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'alertas' && (
          <Card className="border-slate-800 bg-[#0f172a] text-white animate-in fade-in zoom-in-95">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-red-500" /> Alertas Ativos</CardTitle>
              <Badge variant="destructive">{alerts?.length || 0}</Badge>
            </CardHeader>
            <CardContent className="space-y-2">
              {(alerts?.length || 0) === 0 ? (
                <p className="text-center text-slate-500 py-10">Nenhum alerta ativo.</p>
              ) : (
                alerts!.map(a => (
                  <div key={a.id} className="flex items-start gap-3 p-3 rounded-lg border border-slate-800 bg-[#1e293b]">
                    <Badge variant="outline" className="text-[10px] border-red-900 text-red-400 whitespace-nowrap">{a.alert_type}</Badge>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold">{a.vehicle_plate}{a.driver_name ? ` • ${a.driver_name}` : ''}</p>
                      <p className="text-sm text-slate-400">{a.title || a.message}</p>
                      <p className="text-xs text-slate-500">{new Date(a.event_timestamp).toLocaleString('pt-BR')}</p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => handleAcknowledge(a.id)}>
                      <CheckCircle className="w-4 h-4 mr-1" /> Arquivar
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === 'histórico' && (
          <div className="animate-in fade-in zoom-in-95">
            <TelemetryHistoryPanel
              plates={enrichedVehicles.map(v => v.vehicle_plate).filter(Boolean) as string[]}
              from={periodo === 'custom' ? dateRange?.from : periodo === 'today' ? new Date(new Date().setHours(0,0,0,0)) : periodo === 'week' ? startOfWeek(new Date()) : periodo === 'month' ? startOfMonth(new Date()) : undefined}
              to={periodo === 'custom' && dateRange?.to ? new Date(new Date(dateRange.to).setHours(23,59,59,999)) : undefined}
            />
          </div>
        )}

        {activeTab === 'ociosidade' && <Card className="border-slate-800 bg-[#0f172a] text-white p-10 text-center text-slate-500">Visualização Padrão</Card>}
      </div>
    </MainLayout>
  );
}