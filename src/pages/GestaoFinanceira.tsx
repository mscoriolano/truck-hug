import React, { useState, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, TrendingUp, TrendingDown, DollarSign, Truck, BarChart3, PieChart, Target, Upload } from 'lucide-react';
import { BulkImportDialog } from '@/components/import/BulkImportDialog';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart as RechartsPie, Pie, Cell, AreaChart, Area } from 'recharts';
import {
  useMonthlyCosts,
  useMonthlyPerformance,
  useExpenseCategories,
  useCreateMonthlyCost,
  useUpsertMonthlyPerformance,
  getMonthName,
  formatCurrency,
  MonthlyCost,
  MonthlyPerformance,
} from '@/hooks/useFinancialData';

const MONTHS = [
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

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

export default function GestaoFinanceira() {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [isAddCostOpen, setIsAddCostOpen] = useState(false);
  const [isAddPerformanceOpen, setIsAddPerformanceOpen] = useState(false);

  const { data: monthlyCosts, isLoading: isLoadingCosts } = useMonthlyCosts(selectedYear);
  const { data: monthlyPerformance, isLoading: isLoadingPerformance } = useMonthlyPerformance(selectedYear);
  const { data: categories } = useExpenseCategories();
  const createCost = useCreateMonthlyCost();
  const upsertPerformance = useUpsertMonthlyPerformance();

  // Form states
  const [newCost, setNewCost] = useState({
    year: currentYear,
    month: 1,
    category_name: '',
    cost_type: 'FIXO' as 'FIXO' | 'VARIAVEL' | 'OUTROS',
    amount: 0,
    notes: '',
  });

  const [newPerformance, setNewPerformance] = useState({
    year: currentYear,
    month: 1,
    total_insourcing_cost: 0,
    fixed_cost: 0,
    variable_cost: 0,
    external_freight_cost: 0,
    invoiced_weight: 0,
    average_freight_per_ton: 0,
    availability_percentage: 0,
    target_compliance_percentage: 0,
    notes: '',
  });

  // Calculations
  const summaryData = useMemo(() => {
    if (!monthlyCosts || !monthlyPerformance) return null;

    const totalFixo = monthlyCosts
      .filter(c => c.cost_type === 'FIXO')
      .reduce((sum, c) => sum + Number(c.amount), 0);
    
    const totalVariavel = monthlyCosts
      .filter(c => c.cost_type === 'VARIAVEL')
      .reduce((sum, c) => sum + Number(c.amount), 0);
    
    const totalOutros = monthlyCosts
      .filter(c => c.cost_type === 'OUTROS')
      .reduce((sum, c) => sum + Number(c.amount), 0);

    const totalCosts = totalFixo + totalVariavel + totalOutros;

    const totalCostAvoided = monthlyPerformance.reduce((sum, p) => sum + Number(p.cost_avoided), 0);
    const totalResult = monthlyPerformance.reduce((sum, p) => sum + Number(p.result), 0);
    const totalWeight = monthlyPerformance.reduce((sum, p) => sum + Number(p.invoiced_weight), 0);
    const avgAvailability = monthlyPerformance.length > 0
      ? monthlyPerformance.reduce((sum, p) => sum + Number(p.availability_percentage), 0) / monthlyPerformance.length
      : 0;

    return {
      totalFixo,
      totalVariavel,
      totalOutros,
      totalCosts,
      totalCostAvoided,
      totalResult,
      totalWeight,
      avgAvailability,
    };
  }, [monthlyCosts, monthlyPerformance]);

  // Chart data
  const costsByCategory = useMemo(() => {
    if (!monthlyCosts) return [];

    const grouped: Record<string, number> = {};
    monthlyCosts.forEach(cost => {
      if (!grouped[cost.category_name]) {
        grouped[cost.category_name] = 0;
      }
      grouped[cost.category_name] += Number(cost.amount);
    });

    return Object.entries(grouped).map(([name, value]) => ({
      name,
      value,
    }));
  }, [monthlyCosts]);

  const monthlyTrend = useMemo(() => {
    if (!monthlyPerformance) return [];

    return monthlyPerformance.map(p => ({
      month: getMonthName(p.month).substring(0, 3),
      'Custo Insourcing': Number(p.total_insourcing_cost),
      'Frete Externo': Number(p.external_freight_cost),
      'Custo Evitado': Number(p.cost_avoided),
      'Resultado': Number(p.result),
    }));
  }, [monthlyPerformance]);

  const costTypeDistribution = useMemo(() => {
    if (!summaryData) return [];

    return [
      { name: 'Custos Fixos', value: summaryData.totalFixo, color: '#3b82f6' },
      { name: 'Custos Variáveis', value: summaryData.totalVariavel, color: '#10b981' },
      { name: 'Outros', value: summaryData.totalOutros, color: '#f59e0b' },
    ];
  }, [summaryData]);

  const handleAddCost = async () => {
    await createCost.mutateAsync({
      year: newCost.year,
      month: newCost.month,
      category_name: newCost.category_name,
      cost_type: newCost.cost_type,
      amount: newCost.amount,
      notes: newCost.notes || null,
      category_id: null,
    });
    setIsAddCostOpen(false);
    setNewCost({ year: currentYear, month: 1, category_name: '', cost_type: 'FIXO', amount: 0, notes: '' });
  };

  const handleAddPerformance = async () => {
    const costAvoided = newPerformance.external_freight_cost - newPerformance.total_insourcing_cost;
    const result = costAvoided;

    // Get previous accumulated result
    const prevPerformance = monthlyPerformance
      ?.filter(p => p.month < newPerformance.month)
      .sort((a, b) => b.month - a.month)[0];
    const prevAccumulated = prevPerformance ? Number(prevPerformance.accumulated_result) : 0;

    await upsertPerformance.mutateAsync({
      year: newPerformance.year,
      month: newPerformance.month,
      total_insourcing_cost: newPerformance.total_insourcing_cost,
      fixed_cost: newPerformance.fixed_cost,
      variable_cost: newPerformance.variable_cost,
      external_freight_cost: newPerformance.external_freight_cost,
      cost_avoided: costAvoided,
      invoiced_weight: newPerformance.invoiced_weight,
      average_freight_per_ton: newPerformance.average_freight_per_ton,
      availability_percentage: newPerformance.availability_percentage,
      target_compliance_percentage: newPerformance.target_compliance_percentage,
      result,
      accumulated_result: prevAccumulated + result,
      notes: newPerformance.notes || null,
    });
    setIsAddPerformanceOpen(false);
    setNewPerformance({
      year: currentYear,
      month: 1,
      total_insourcing_cost: 0,
      fixed_cost: 0,
      variable_cost: 0,
      external_freight_cost: 0,
      invoiced_weight: 0,
      average_freight_per_ton: 0,
      availability_percentage: 0,
      target_compliance_percentage: 0,
      notes: '',
    });
  };

  if (isLoadingCosts || isLoadingPerformance) {
    return (
      <MainLayout title="Gestão Financeira" subtitle="Carregando dados...">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Gestão Financeira" subtitle="Controle de custos e performance da frota">
      {/* Year Selector and Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <Label>Ano:</Label>
          <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(Number(v))}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[2023, 2024, 2025, 2026].map(year => (
                <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2 flex-wrap">
          <BulkImportDialog />
          <Dialog open={isAddCostOpen} onOpenChange={setIsAddCostOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Custo
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar Custo Mensal</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Ano</Label>
                    <Select value={newCost.year.toString()} onValueChange={(v) => setNewCost(prev => ({ ...prev, year: Number(v) }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[2023, 2024, 2025, 2026].map(year => (
                          <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Mês</Label>
                    <Select value={newCost.month.toString()} onValueChange={(v) => setNewCost(prev => ({ ...prev, month: Number(v) }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MONTHS.map(m => (
                          <SelectItem key={m.value} value={m.value.toString()}>{m.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Tipo</Label>
                    <Select value={newCost.cost_type} onValueChange={(v: 'FIXO' | 'VARIAVEL' | 'OUTROS') => setNewCost(prev => ({ ...prev, cost_type: v }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="FIXO">Fixo</SelectItem>
                        <SelectItem value="VARIAVEL">Variável</SelectItem>
                        <SelectItem value="OUTROS">Outros</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Categoria</Label>
                  <Select value={newCost.category_name} onValueChange={(v) => setNewCost(prev => ({ ...prev, category_name: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {categories?.filter(c => c.type === newCost.cost_type).map(c => (
                        <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Valor (R$)</Label>
                  <Input
                    type="number"
                    value={newCost.amount}
                    onChange={(e) => setNewCost(prev => ({ ...prev, amount: Number(e.target.value) }))}
                  />
                </div>
                <div>
                  <Label>Observações</Label>
                  <Input
                    value={newCost.notes}
                    onChange={(e) => setNewCost(prev => ({ ...prev, notes: e.target.value }))}
                  />
                </div>
                <Button onClick={handleAddCost} className="w-full" disabled={!newCost.category_name}>
                  Salvar
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isAddPerformanceOpen} onOpenChange={setIsAddPerformanceOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Registrar Performance
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Registrar Performance Mensal</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <Label>Ano</Label>
                    <Select value={newPerformance.year.toString()} onValueChange={(v) => setNewPerformance(prev => ({ ...prev, year: Number(v) }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[2023, 2024, 2025, 2026].map(year => (
                          <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Mês</Label>
                    <Select value={newPerformance.month.toString()} onValueChange={(v) => setNewPerformance(prev => ({ ...prev, month: Number(v) }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MONTHS.map(m => (
                          <SelectItem key={m.value} value={m.value.toString()}>{m.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Custo Total Insourcing (R$)</Label>
                    <Input
                      type="number"
                      value={newPerformance.total_insourcing_cost}
                      onChange={(e) => setNewPerformance(prev => ({ ...prev, total_insourcing_cost: Number(e.target.value) }))}
                    />
                  </div>
                  <div>
                    <Label>Frete Externo (R$)</Label>
                    <Input
                      type="number"
                      value={newPerformance.external_freight_cost}
                      onChange={(e) => setNewPerformance(prev => ({ ...prev, external_freight_cost: Number(e.target.value) }))}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Custo Fixo (R$)</Label>
                    <Input
                      type="number"
                      value={newPerformance.fixed_cost}
                      onChange={(e) => setNewPerformance(prev => ({ ...prev, fixed_cost: Number(e.target.value) }))}
                    />
                  </div>
                  <div>
                    <Label>Custo Variável (R$)</Label>
                    <Input
                      type="number"
                      value={newPerformance.variable_cost}
                      onChange={(e) => setNewPerformance(prev => ({ ...prev, variable_cost: Number(e.target.value) }))}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Peso Faturado (ton)</Label>
                    <Input
                      type="number"
                      value={newPerformance.invoiced_weight}
                      onChange={(e) => setNewPerformance(prev => ({ ...prev, invoiced_weight: Number(e.target.value) }))}
                    />
                  </div>
                  <div>
                    <Label>Frete Médio por Ton (R$)</Label>
                    <Input
                      type="number"
                      value={newPerformance.average_freight_per_ton}
                      onChange={(e) => setNewPerformance(prev => ({ ...prev, average_freight_per_ton: Number(e.target.value) }))}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>% Disponibilidade</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={newPerformance.availability_percentage}
                      onChange={(e) => setNewPerformance(prev => ({ ...prev, availability_percentage: Number(e.target.value) }))}
                    />
                  </div>
                  <div>
                    <Label>% Cumprimento de Meta</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={newPerformance.target_compliance_percentage}
                      onChange={(e) => setNewPerformance(prev => ({ ...prev, target_compliance_percentage: Number(e.target.value) }))}
                    />
                  </div>
                </div>
                <div>
                  <Label>Observações</Label>
                  <Input
                    value={newPerformance.notes}
                    onChange={(e) => setNewPerformance(prev => ({ ...prev, notes: e.target.value }))}
                  />
                </div>
                <Button onClick={handleAddPerformance} className="w-full">
                  Salvar Performance
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Custo Total</p>
                <p className="text-2xl font-bold">{formatCurrency(summaryData?.totalCosts || 0)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Custo Evitado</p>
                <p className="text-2xl font-bold text-success">{formatCurrency(summaryData?.totalCostAvoided || 0)}</p>
              </div>
              <TrendingDown className="h-8 w-8 text-success" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Resultado Acumulado</p>
                <p className={`text-2xl font-bold ${(summaryData?.totalResult || 0) >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {formatCurrency(summaryData?.totalResult || 0)}
                </p>
              </div>
              {(summaryData?.totalResult || 0) >= 0 ? (
                <TrendingUp className="h-8 w-8 text-success" />
              ) : (
                <TrendingDown className="h-8 w-8 text-destructive" />
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Peso Faturado</p>
                <p className="text-2xl font-bold">{(summaryData?.totalWeight || 0).toLocaleString('pt-BR')} ton</p>
              </div>
              <Truck className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="costs">Custos Detalhados</TabsTrigger>
          <TabsTrigger value="performance">Performance Mensal</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Cost Distribution Pie Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Distribuição de Custos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPie>
                    <Pie
                      data={costTypeDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {costTypeDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  </RechartsPie>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Monthly Trend Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Comparativo Mensal
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={monthlyTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend />
                    <Area type="monotone" dataKey="Custo Insourcing" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
                    <Area type="monotone" dataKey="Custo Evitado" stackId="2" stroke="#10b981" fill="#10b981" fillOpacity={0.6} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Costs by Category */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Custos por Categoria
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={costsByCategory} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} />
                  <YAxis dataKey="name" type="category" width={100} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]}>
                    {costsByCategory.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="costs">
          <Card>
            <CardHeader>
              <CardTitle>Custos Mensais - {selectedYear}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mês</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Observações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monthlyCosts?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        Nenhum custo registrado para {selectedYear}
                      </TableCell>
                    </TableRow>
                  ) : (
                    monthlyCosts?.map((cost) => (
                      <TableRow key={cost.id}>
                        <TableCell>{getMonthName(cost.month)}</TableCell>
                        <TableCell>{cost.category_name}</TableCell>
                        <TableCell>
                          <Badge variant={
                            cost.cost_type === 'FIXO' ? 'default' :
                            cost.cost_type === 'VARIAVEL' ? 'secondary' : 'outline'
                          }>
                            {cost.cost_type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(Number(cost.amount))}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{cost.notes || '-'}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance">
          <Card>
            <CardHeader>
              <CardTitle>Performance Mensal - {selectedYear}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mês</TableHead>
                      <TableHead className="text-right">Custo Insourcing</TableHead>
                      <TableHead className="text-right">Frete Externo</TableHead>
                      <TableHead className="text-right">Custo Evitado</TableHead>
                      <TableHead className="text-right">Peso (ton)</TableHead>
                      <TableHead className="text-right">Disponibilidade</TableHead>
                      <TableHead className="text-right">Resultado</TableHead>
                      <TableHead className="text-right">Acumulado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {monthlyPerformance?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                          Nenhuma performance registrada para {selectedYear}
                        </TableCell>
                      </TableRow>
                    ) : (
                      monthlyPerformance?.map((perf) => (
                        <TableRow key={perf.id}>
                          <TableCell className="font-medium">{getMonthName(perf.month)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(Number(perf.total_insourcing_cost))}</TableCell>
                          <TableCell className="text-right">{formatCurrency(Number(perf.external_freight_cost))}</TableCell>
                          <TableCell className="text-right text-success">{formatCurrency(Number(perf.cost_avoided))}</TableCell>
                          <TableCell className="text-right">{Number(perf.invoiced_weight).toLocaleString('pt-BR')}</TableCell>
                          <TableCell className="text-right">{Number(perf.availability_percentage).toFixed(1)}%</TableCell>
                          <TableCell className={`text-right font-medium ${Number(perf.result) >= 0 ? 'text-success' : 'text-destructive'}`}>
                            {formatCurrency(Number(perf.result))}
                          </TableCell>
                          <TableCell className={`text-right font-bold ${Number(perf.accumulated_result) >= 0 ? 'text-success' : 'text-destructive'}`}>
                            {formatCurrency(Number(perf.accumulated_result))}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </MainLayout>
  );
}
