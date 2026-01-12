import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Upload, FileSpreadsheet, Download, CheckCircle2, XCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type ImportType = 'drivers' | 'vehicles' | 'fuel_entries' | 'trips' | 'monthly_performance' | 'monthly_costs';

interface ImportResult {
  success: number;
  errors: string[];
}

const IMPORT_CONFIGS: Record<ImportType, {
  label: string;
  tableName: string;
  requiredColumns: string[];
  optionalColumns: string[];
  example: Record<string, string>;
}> = {
  drivers: {
    label: 'Motoristas',
    tableName: 'drivers',
    requiredColumns: ['name', 'phone', 'license'],
    optionalColumns: ['cnh_category', 'cnh_expiry', 'status', 'current_vehicle', 'ac', 'r3'],
    example: {
      name: 'João Silva',
      phone: '11999999999',
      license: 'ABC123456',
      cnh_category: 'E',
      cnh_expiry: '2025-12-31',
      status: 'available',
      current_vehicle: 'ABC-1234',
      ac: 'AC001',
      r3: 'R3001',
    },
  },
  vehicles: {
    label: 'Veículos',
    tableName: 'vehicles',
    requiredColumns: ['plate', 'model', 'brand', 'year', 'next_maintenance'],
    optionalColumns: ['mileage', 'status', 'fuel_type', 'consumption_target'],
    example: {
      plate: 'ABC-1234',
      model: 'FH 540',
      brand: 'Volvo',
      year: '2022',
      mileage: '150000',
      next_maintenance: '2025-03-01',
      status: 'active',
      fuel_type: 'diesel',
      consumption_target: '2.5',
    },
  },
  fuel_entries: {
    label: 'Abastecimentos',
    tableName: 'fuel_entries',
    requiredColumns: ['vehicle_plate', 'driver_name', 'liters', 'price_per_liter', 'total_cost', 'mileage'],
    optionalColumns: ['entry_date', 'fuel_type', 'station', 'notes'],
    example: {
      vehicle_plate: 'ABC-1234',
      driver_name: 'João Silva',
      liters: '250',
      price_per_liter: '5.89',
      total_cost: '1472.50',
      mileage: '155000',
      entry_date: '2025-01-10',
      fuel_type: 'diesel',
      station: 'Posto Shell Centro',
      notes: '',
    },
  },
  trips: {
    label: 'Viagens',
    tableName: 'trips',
    requiredColumns: ['vehicle_plate', 'driver_name', 'departure_date', 'trip_type', 'weight'],
    optionalColumns: ['cycle_value', 'notes'],
    example: {
      vehicle_plate: 'ABC-1234',
      driver_name: 'João Silva',
      departure_date: '2025-01-10T08:00:00',
      trip_type: 'entrega',
      weight: '28000',
      cycle_value: '1500',
      notes: 'Entrega para cliente X',
    },
  },
  monthly_performance: {
    label: 'Performance Mensal',
    tableName: 'monthly_performance',
    requiredColumns: ['year', 'month', 'total_insourcing_cost', 'fixed_cost', 'variable_cost', 'external_freight_cost', 'invoiced_weight', 'average_freight_per_ton'],
    optionalColumns: ['availability_percentage', 'target_compliance_percentage', 'notes'],
    example: {
      year: '2024',
      month: '6',
      total_insourcing_cost: '450000',
      fixed_cost: '200000',
      variable_cost: '250000',
      external_freight_cost: '600000',
      invoiced_weight: '5000',
      average_freight_per_ton: '120',
      availability_percentage: '95',
      target_compliance_percentage: '98',
      notes: '',
    },
  },
  monthly_costs: {
    label: 'Custos Mensais',
    tableName: 'monthly_costs',
    requiredColumns: ['year', 'month', 'category_name', 'cost_type', 'amount'],
    optionalColumns: ['notes'],
    example: {
      year: '2024',
      month: '6',
      category_name: 'Combustível',
      cost_type: 'VARIAVEL',
      amount: '85000',
      notes: '',
    },
  },
};

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split(';').map(h => h.trim().toLowerCase().replace(/['"]/g, ''));
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(';').map(v => v.trim().replace(/['"]/g, ''));
    if (values.length !== headers.length) continue;

    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index];
    });
    rows.push(row);
  }

  return rows;
}

function downloadTemplate(type: ImportType) {
  const config = IMPORT_CONFIGS[type];
  const allColumns = [...config.requiredColumns, ...config.optionalColumns];
  const headerRow = allColumns.join(';');
  const exampleRow = allColumns.map(col => config.example[col] || '').join(';');
  
  const content = `${headerRow}\n${exampleRow}`;
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `template_${type}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function BulkImportDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ImportType>('drivers');
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setProgress(0);
    setResult(null);

    try {
      const text = await file.text();
      const rows = parseCSV(text);
      
      if (rows.length === 0) {
        throw new Error('Arquivo vazio ou formato inválido');
      }

      const config = IMPORT_CONFIGS[activeTab];
      const errors: string[] = [];
      let successCount = 0;

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNum = i + 2; // +2 because 1-indexed and header row

        // Validate required columns
        const missingColumns = config.requiredColumns.filter(col => !row[col] || row[col].trim() === '');
        if (missingColumns.length > 0) {
          errors.push(`Linha ${rowNum}: Colunas obrigatórias faltando: ${missingColumns.join(', ')}`);
          continue;
        }

        try {
          const data = await prepareRowData(activeTab, row);
          const { error } = await supabase.from(config.tableName as any).insert(data as any);
          
          if (error) {
            errors.push(`Linha ${rowNum}: ${error.message}`);
          } else {
            successCount++;
          }
        } catch (err: any) {
          errors.push(`Linha ${rowNum}: ${err.message}`);
        }

        setProgress(Math.round(((i + 1) / rows.length) * 100));
      }

      setResult({ success: successCount, errors });
      
      if (successCount > 0) {
        toast.success(`${successCount} registros importados com sucesso!`);
      }
      if (errors.length > 0) {
        toast.warning(`${errors.length} erros encontrados durante a importação`);
      }
    } catch (error: any) {
      toast.error(`Erro ao processar arquivo: ${error.message}`);
      setResult({ success: 0, errors: [error.message] });
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const prepareRowData = async (type: ImportType, row: Record<string, string>) => {
    switch (type) {
      case 'drivers':
        return {
          name: row.name,
          phone: row.phone,
          license: row.license,
          cnh_category: row.cnh_category || null,
          cnh_expiry: row.cnh_expiry || null,
          status: row.status || 'available',
          current_vehicle: row.current_vehicle || null,
          ac: row.ac || null,
          r3: row.r3 || null,
        };

      case 'vehicles':
        return {
          plate: row.plate,
          model: row.model,
          brand: row.brand,
          year: parseInt(row.year),
          mileage: parseInt(row.mileage) || 0,
          next_maintenance: row.next_maintenance,
          status: row.status || 'active',
          fuel_type: row.fuel_type || 'diesel',
          consumption_target: parseFloat(row.consumption_target) || 2.5,
        };

      case 'fuel_entries': {
        // Look up vehicle and driver IDs
        const { data: vehicle } = await supabase
          .from('vehicles')
          .select('id')
          .eq('plate', row.vehicle_plate)
          .single();
        
        const { data: driver } = await supabase
          .from('drivers')
          .select('id')
          .eq('name', row.driver_name)
          .single();

        if (!vehicle) throw new Error(`Veículo ${row.vehicle_plate} não encontrado`);
        if (!driver) throw new Error(`Motorista ${row.driver_name} não encontrado`);

        return {
          vehicle_id: vehicle.id,
          vehicle_plate: row.vehicle_plate,
          driver_id: driver.id,
          driver_name: row.driver_name,
          liters: parseFloat(row.liters),
          price_per_liter: parseFloat(row.price_per_liter),
          total_cost: parseFloat(row.total_cost),
          mileage: parseInt(row.mileage),
          entry_date: row.entry_date || new Date().toISOString(),
          fuel_type: row.fuel_type || 'diesel',
          station: row.station || null,
          notes: row.notes || null,
        };
      }

      case 'trips': {
        const { data: vehicle } = await supabase
          .from('vehicles')
          .select('id')
          .eq('plate', row.vehicle_plate)
          .single();
        
        const { data: driver } = await supabase
          .from('drivers')
          .select('id')
          .eq('name', row.driver_name)
          .single();

        if (!vehicle) throw new Error(`Veículo ${row.vehicle_plate} não encontrado`);
        if (!driver) throw new Error(`Motorista ${row.driver_name} não encontrado`);

        return {
          vehicle_id: vehicle.id,
          vehicle_plate: row.vehicle_plate,
          driver_id: driver.id,
          driver_name: row.driver_name,
          departure_date: row.departure_date,
          trip_type: row.trip_type,
          weight: parseFloat(row.weight) || 0,
          cycle_value: parseFloat(row.cycle_value) || 0,
          notes: row.notes || null,
        };
      }

      case 'monthly_performance': {
        const costAvoided = parseFloat(row.external_freight_cost) - parseFloat(row.total_insourcing_cost);
        return {
          year: parseInt(row.year),
          month: parseInt(row.month),
          total_insourcing_cost: parseFloat(row.total_insourcing_cost),
          fixed_cost: parseFloat(row.fixed_cost),
          variable_cost: parseFloat(row.variable_cost),
          external_freight_cost: parseFloat(row.external_freight_cost),
          cost_avoided: costAvoided,
          result: costAvoided,
          accumulated_result: 0, // Will need recalculation
          invoiced_weight: parseFloat(row.invoiced_weight),
          average_freight_per_ton: parseFloat(row.average_freight_per_ton),
          availability_percentage: parseFloat(row.availability_percentage) || 0,
          target_compliance_percentage: parseFloat(row.target_compliance_percentage) || 0,
          notes: row.notes || null,
        };
      }

      case 'monthly_costs':
        return {
          year: parseInt(row.year),
          month: parseInt(row.month),
          category_name: row.category_name,
          cost_type: row.cost_type,
          amount: parseFloat(row.amount),
          notes: row.notes || null,
        };

      default:
        throw new Error('Tipo de importação não suportado');
    }
  };

  const config = IMPORT_CONFIGS[activeTab];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="h-4 w-4 mr-2" />
          Importar Dados em Massa
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Importação em Massa via CSV/Excel
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as ImportType); setResult(null); }}>
          <TabsList className="grid grid-cols-3 lg:grid-cols-6">
            <TabsTrigger value="drivers">Motoristas</TabsTrigger>
            <TabsTrigger value="vehicles">Veículos</TabsTrigger>
            <TabsTrigger value="fuel_entries">Abastec.</TabsTrigger>
            <TabsTrigger value="trips">Viagens</TabsTrigger>
            <TabsTrigger value="monthly_performance">Perform.</TabsTrigger>
            <TabsTrigger value="monthly_costs">Custos</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Instruções para {config.label}</CardTitle>
                <CardDescription>
                  Baixe o template, preencha os dados e faça o upload do arquivo CSV.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium text-sm mb-2">Colunas obrigatórias:</h4>
                  <div className="flex flex-wrap gap-1">
                    {config.requiredColumns.map(col => (
                      <span key={col} className="px-2 py-1 bg-destructive/10 text-destructive rounded text-xs font-mono">
                        {col}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-sm mb-2">Colunas opcionais:</h4>
                  <div className="flex flex-wrap gap-1">
                    {config.optionalColumns.map(col => (
                      <span key={col} className="px-2 py-1 bg-muted text-muted-foreground rounded text-xs font-mono">
                        {col}
                      </span>
                    ))}
                  </div>
                </div>

                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    O arquivo deve estar no formato CSV com separador de ponto e vírgula (;). 
                    {activeTab === 'fuel_entries' || activeTab === 'trips' 
                      ? ' Certifique-se de que os motoristas e veículos já estejam cadastrados antes de importar.' 
                      : ''}
                  </AlertDescription>
                </Alert>

                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => downloadTemplate(activeTab)}>
                    <Download className="h-4 w-4 mr-2" />
                    Baixar Template
                  </Button>

                  <div className="relative">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv,.txt"
                      onChange={handleFileChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      disabled={isImporting}
                    />
                    <Button disabled={isImporting}>
                      {isImporting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Importando...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          Fazer Upload
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {isImporting && (
                  <div className="space-y-2">
                    <Progress value={progress} />
                    <p className="text-sm text-muted-foreground text-center">{progress}% concluído</p>
                  </div>
                )}

                {result && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span>{result.success} registros importados com sucesso</span>
                    </div>
                    {result.errors.length > 0 && (
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm text-destructive">
                          <XCircle className="h-4 w-4" />
                          <span>{result.errors.length} erros encontrados:</span>
                        </div>
                        <div className="max-h-32 overflow-y-auto bg-muted p-2 rounded text-xs">
                          {result.errors.slice(0, 10).map((error, i) => (
                            <div key={i} className="text-destructive">{error}</div>
                          ))}
                          {result.errors.length > 10 && (
                            <div className="text-muted-foreground mt-1">
                              ... e mais {result.errors.length - 10} erros
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
