import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Target, Trophy, TrendingUp, Award, Plus, Calendar, User, Fuel, Gauge, AlertTriangle } from 'lucide-react';
import { useDrivers } from '@/hooks/useDrivers';
import { useTripStatistics } from '@/hooks/useTripStatistics';
import { useDriverScores } from '@/hooks/useDriverScores';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface DriverGoal {
  id: string;
  driver_id: string;
  driver_name: string;
  month: number;
  year: number;
  target_score: number;
  target_consumption: number;
  target_speed_violations: number;
  target_km: number;
  bonus_amount: number;
  achieved: boolean;
  created_at: string;
}

const Metas = () => {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newGoal, setNewGoal] = useState({
    driver_id: '',
    target_score: 85,
    target_consumption: 3.5,
    target_speed_violations: 5,
    target_km: 5000,
    bonus_amount: 500,
  });

  const queryClient = useQueryClient();
  const { data: drivers } = useDrivers();
  const { data: driverScores } = useDriverScores();
  const { data: tripStats } = useTripStatistics();

  // Buscar metas do mês
  const { data: goals, isLoading } = useQuery({
    queryKey: ['driver-goals', selectedMonth, selectedYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('driver_goals')
        .select('*')
        .eq('month', selectedMonth)
        .eq('year', selectedYear);
      
      if (error) throw error;
      return data as DriverGoal[];
    },
  });

  // Criar nova meta
  const createGoalMutation = useMutation({
    mutationFn: async (goal: typeof newGoal) => {
      const driver = drivers?.find(d => d.id === goal.driver_id);
      const { error } = await supabase.from('driver_goals').insert({
        driver_id: goal.driver_id,
        driver_name: driver?.name || '',
        month: selectedMonth,
        year: selectedYear,
        target_score: goal.target_score,
        target_consumption: goal.target_consumption,
        target_speed_violations: goal.target_speed_violations,
        target_km: goal.target_km,
        bonus_amount: goal.bonus_amount,
        achieved: false,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-goals'] });
      setIsDialogOpen(false);
      toast.success('Meta criada com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao criar meta: ' + error.message);
    },
  });

  // Calcular progresso do motorista
  const calculateProgress = (goal: DriverGoal) => {
    const driverScore = driverScores?.find(s => s.driver_id === goal.driver_id);
    const driverStats = tripStats?.filter(s => s.driver_id === goal.driver_id) || [];
    
    const currentScore = driverScore?.total_score || 0;
    const currentKm = driverStats.reduce((acc, s) => acc + (s.total_distance_km || 0), 0);
    const currentViolations = driverStats.reduce((acc, s) => acc + (s.time_over_speed_limit_minutes || 0), 0);
    const avgConsumption = driverStats.length > 0 
      ? driverStats.reduce((acc, s) => acc + (s.avg_consumption_km_per_liter || 0), 0) / driverStats.length 
      : 0;

    const scoreProgress = Math.min((currentScore / goal.target_score) * 100, 100);
    const kmProgress = Math.min((currentKm / goal.target_km) * 100, 100);
    const violationsProgress = goal.target_speed_violations > 0 
      ? Math.max(100 - (currentViolations / goal.target_speed_violations) * 100, 0)
      : 100;
    const consumptionProgress = avgConsumption > 0 && goal.target_consumption > 0
      ? Math.min((avgConsumption / goal.target_consumption) * 100, 100)
      : 0;

    const overallProgress = (scoreProgress + kmProgress + violationsProgress + consumptionProgress) / 4;

    return {
      currentScore,
      currentKm,
      currentViolations,
      avgConsumption,
      scoreProgress,
      kmProgress,
      violationsProgress,
      consumptionProgress,
      overallProgress,
      isAchieved: overallProgress >= 100,
    };
  };

  const months = [
    { value: 1, label: 'Janeiro' },
    { value: 2, label: 'Fevereiro' },
    { value: 3, label: 'Março' },
    { value: 4, label: 'Abril' },
    { value: 5, label: 'Maio' },
    { value: 6, label: 'Junho' },
    { value: 7, label: 'Julho' },
    { value: 8, label: 'Agosto' },
    { value: 9, label: 'Setembro' },
    { value: 10, label: 'Outubro' },
    { value: 11, label: 'Novembro' },
    { value: 12, label: 'Dezembro' },
  ];

  const activeDrivers = drivers?.filter(d => d.status !== 'terminated') || [];

  return (
    <MainLayout 
      title="Sistema de Metas" 
      subtitle="Acompanhe as metas mensais e bonificações dos motoristas"
    >
      <div className="space-y-6 animate-fade-in">
        {/* Header com filtros */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <Select
                value={selectedMonth.toString()}
                onValueChange={(v) => setSelectedMonth(parseInt(v))}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {months.map((m) => (
                    <SelectItem key={m.value} value={m.value.toString()}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={selectedYear.toString()}
                onValueChange={(v) => setSelectedYear(parseInt(v))}
              >
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2024">2024</SelectItem>
                  <SelectItem value="2025">2025</SelectItem>
                  <SelectItem value="2026">2026</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Nova Meta
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Criar Nova Meta</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Motorista</Label>
                  <Select
                    value={newGoal.driver_id}
                    onValueChange={(v) => setNewGoal({ ...newGoal, driver_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o motorista" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeDrivers.map((driver) => (
                        <SelectItem key={driver.id} value={driver.id}>
                          {driver.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Score Mínimo</Label>
                    <Input
                      type="number"
                      value={newGoal.target_score}
                      onChange={(e) => setNewGoal({ ...newGoal, target_score: parseInt(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Consumo Mínimo (km/L)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={newGoal.target_consumption}
                      onChange={(e) => setNewGoal({ ...newGoal, target_consumption: parseFloat(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Máx. Violações Velocidade</Label>
                    <Input
                      type="number"
                      value={newGoal.target_speed_violations}
                      onChange={(e) => setNewGoal({ ...newGoal, target_speed_violations: parseInt(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>KM Mínimo</Label>
                    <Input
                      type="number"
                      value={newGoal.target_km}
                      onChange={(e) => setNewGoal({ ...newGoal, target_km: parseInt(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Valor da Bonificação (R$)</Label>
                  <Input
                    type="number"
                    value={newGoal.bonus_amount}
                    onChange={(e) => setNewGoal({ ...newGoal, bonus_amount: parseFloat(e.target.value) })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button 
                  onClick={() => createGoalMutation.mutate(newGoal)}
                  disabled={!newGoal.driver_id || createGoalMutation.isPending}
                >
                  Criar Meta
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Resumo do mês */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-primary/20">
                  <Target className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Metas Definidas</p>
                  <p className="text-2xl font-bold text-foreground">{goals?.length || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-success/10 to-success/5 border-success/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-success/20">
                  <Trophy className="w-6 h-6 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Metas Atingidas</p>
                  <p className="text-2xl font-bold text-foreground">
                    {goals?.filter(g => calculateProgress(g).isAchieved).length || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-warning/10 to-warning/5 border-warning/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-warning/20">
                  <TrendingUp className="w-6 h-6 text-warning" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Em Progresso</p>
                  <p className="text-2xl font-bold text-foreground">
                    {goals?.filter(g => !calculateProgress(g).isAchieved).length || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-info/10 to-info/5 border-info/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-info/20">
                  <Award className="w-6 h-6 text-info" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Bonificações</p>
                  <p className="text-2xl font-bold text-foreground">
                    R$ {goals?.filter(g => calculateProgress(g).isAchieved)
                      .reduce((acc, g) => acc + g.bonus_amount, 0)
                      .toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lista de metas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {isLoading ? (
            <div className="col-span-2 text-center py-12 text-muted-foreground">
              Carregando metas...
            </div>
          ) : goals?.length === 0 ? (
            <div className="col-span-2 text-center py-12 text-muted-foreground">
              Nenhuma meta definida para {months.find(m => m.value === selectedMonth)?.label} de {selectedYear}
            </div>
          ) : (
            goals?.map((goal) => {
              const progress = calculateProgress(goal);
              
              return (
                <Card key={goal.id} className={cn(
                  "transition-all duration-300",
                  progress.isAchieved && "border-success/50 bg-success/5"
                )}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <User className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{goal.driver_name}</CardTitle>
                          <CardDescription>
                            Bonificação: R$ {goal.bonus_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </CardDescription>
                        </div>
                      </div>
                      {progress.isAchieved ? (
                        <Badge className="bg-success text-success-foreground">
                          <Trophy className="w-3 h-3 mr-1" />
                          Atingida
                        </Badge>
                      ) : (
                        <Badge variant="outline">
                          {Math.round(progress.overallProgress)}%
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Score */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <Target className="w-4 h-4 text-muted-foreground" />
                          <span>Score de Direção</span>
                        </div>
                        <span className="font-medium">
                          {progress.currentScore.toFixed(0)} / {goal.target_score}
                        </span>
                      </div>
                      <Progress value={progress.scoreProgress} className="h-2" />
                    </div>

                    {/* KM */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <Gauge className="w-4 h-4 text-muted-foreground" />
                          <span>Quilometragem</span>
                        </div>
                        <span className="font-medium">
                          {progress.currentKm.toFixed(0)} / {goal.target_km} km
                        </span>
                      </div>
                      <Progress value={progress.kmProgress} className="h-2" />
                    </div>

                    {/* Consumo */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <Fuel className="w-4 h-4 text-muted-foreground" />
                          <span>Consumo Médio</span>
                        </div>
                        <span className="font-medium">
                          {progress.avgConsumption.toFixed(2)} / {goal.target_consumption} km/L
                        </span>
                      </div>
                      <Progress value={progress.consumptionProgress} className="h-2" />
                    </div>

                    {/* Violações */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-muted-foreground" />
                          <span>Violações de Velocidade</span>
                        </div>
                        <span className="font-medium">
                          {progress.currentViolations} / {goal.target_speed_violations} máx
                        </span>
                      </div>
                      <Progress 
                        value={progress.violationsProgress} 
                        className={cn("h-2", progress.violationsProgress < 50 && "[&>div]:bg-destructive")} 
                      />
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default Metas;