import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { Download, FileSpreadsheet, FileText, CalendarIcon, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

interface TelemetryReportExportProps {
  className?: string;
}

export function TelemetryReportExport({ className }: TelemetryReportExportProps) {
  const [open, setOpen] = useState(false);
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [reportType, setReportType] = useState<'summary' | 'detailed'>('summary');
  const [includeAlerts, setIncludeAlerts] = useState(true);
  const [includeStatistics, setIncludeStatistics] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  const fetchReportData = async () => {
    const queries = [];

    // Fetch trip statistics
    if (includeStatistics) {
      let statsQuery = supabase
        .from('trip_statistics')
        .select('*')
        .order('start_time', { ascending: false });

      if (startDate) {
        statsQuery = statsQuery.gte('start_time', startDate.toISOString());
      }
      if (endDate) {
        statsQuery = statsQuery.lte('start_time', endDate.toISOString());
      }

      queries.push(statsQuery);
    }

    // Fetch telemetry alerts
    if (includeAlerts) {
      let alertsQuery = supabase
        .from('telemetry_alerts')
        .select('*')
        .order('event_timestamp', { ascending: false });

      if (startDate) {
        alertsQuery = alertsQuery.gte('event_timestamp', startDate.toISOString());
      }
      if (endDate) {
        alertsQuery = alertsQuery.lte('event_timestamp', endDate.toISOString());
      }

      queries.push(alertsQuery);
    }

    // Fetch vehicle telemetry if detailed
    if (reportType === 'detailed') {
      let telemetryQuery = supabase
        .from('telemetry_history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1000);

      if (startDate) {
        telemetryQuery = telemetryQuery.gte('created_at', startDate.toISOString());
      }
      if (endDate) {
        telemetryQuery = telemetryQuery.lte('created_at', endDate.toISOString());
      }

      queries.push(telemetryQuery);
    }

    const results = await Promise.all(queries);
    
    return {
      statistics: includeStatistics ? results[0]?.data || [] : [],
      alerts: includeAlerts ? results[includeStatistics ? 1 : 0]?.data || [] : [],
      telemetry: reportType === 'detailed' ? results[results.length - 1]?.data || [] : [],
    };
  };

  const exportToPDF = async () => {
    setIsExporting(true);
    try {
      const data = await fetchReportData();
      const doc = new jsPDF();
      
      // Header
      doc.setFontSize(20);
      doc.text('Relatório de Telemetria', 14, 22);
      
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(
        `Período: ${startDate ? format(startDate, 'dd/MM/yyyy', { locale: ptBR }) : 'Início'} até ${endDate ? format(endDate, 'dd/MM/yyyy', { locale: ptBR }) : 'Hoje'}`,
        14, 30
      );
      doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, 14, 36);

      let yPos = 45;

      // Statistics Summary
      if (includeStatistics && data.statistics.length > 0) {
        doc.setFontSize(14);
        doc.setTextColor(0);
        doc.text('Estatísticas de Viagem', 14, yPos);
        yPos += 6;

        autoTable(doc, {
          startY: yPos,
          head: [['Veículo', 'Motorista', 'Distância (km)', 'Vel. Média', 'Consumo (km/L)', 'Frenagens', 'Acelerações', 'Score']],
          body: data.statistics.map((stat: Record<string, unknown>) => [
            stat.vehicle_plate,
            stat.driver_name || 'N/A',
            (stat.total_distance_km as number)?.toFixed(1) || '0',
            (stat.avg_speed as number)?.toFixed(0) || '0',
            (stat.avg_consumption_km_per_liter as number)?.toFixed(2) || 'N/A',
            stat.hard_brakes_count || 0,
            stat.hard_accels_count || 0,
            stat.driving_score || 'N/A',
          ]),
          styles: { fontSize: 8 },
          headStyles: { fillColor: [59, 130, 246] },
        });

        yPos = (doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ? (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15 : yPos + 50;
      }

      // Alerts
      if (includeAlerts && data.alerts.length > 0) {
        if (yPos > 250) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(14);
        doc.setTextColor(0);
        doc.text('Alertas de Telemetria', 14, yPos);
        yPos += 6;

        autoTable(doc, {
          startY: yPos,
          head: [['Data/Hora', 'Veículo', 'Tipo', 'Severidade', 'Mensagem']],
          body: data.alerts.map((alert: Record<string, unknown>) => [
            format(new Date(alert.event_timestamp as string), 'dd/MM HH:mm', { locale: ptBR }),
            alert.vehicle_plate,
            alert.alert_type,
            alert.severity,
            (alert.message as string)?.substring(0, 50) + ((alert.message as string)?.length > 50 ? '...' : ''),
          ]),
          styles: { fontSize: 8 },
          headStyles: { fillColor: [239, 68, 68] },
        });
      }

      doc.save(`relatorio-telemetria-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      toast.success('PDF exportado com sucesso!');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error('Erro ao exportar PDF');
    } finally {
      setIsExporting(false);
    }
  };

  const exportToExcel = async () => {
    setIsExporting(true);
    try {
      const data = await fetchReportData();
      const workbook = XLSX.utils.book_new();

      // Statistics Sheet
      if (includeStatistics && data.statistics.length > 0) {
        const statsSheet = XLSX.utils.json_to_sheet(
          data.statistics.map((stat: Record<string, unknown>) => ({
            'Veículo': stat.vehicle_plate,
            'Motorista': stat.driver_name || 'N/A',
            'Data Início': stat.start_time ? format(new Date(stat.start_time as string), 'dd/MM/yyyy HH:mm', { locale: ptBR }) : '',
            'Data Fim': stat.end_time ? format(new Date(stat.end_time as string), 'dd/MM/yyyy HH:mm', { locale: ptBR }) : '',
            'Distância (km)': stat.total_distance_km,
            'Velocidade Média (km/h)': stat.avg_speed,
            'Velocidade Máxima (km/h)': stat.max_speed,
            'Combustível (L)': stat.fuel_consumed_liters,
            'Consumo (km/L)': stat.avg_consumption_km_per_liter,
            'Frenagens Bruscas': stat.hard_brakes_count,
            'Acelerações Bruscas': stat.hard_accels_count,
            'Curvas Bruscas': stat.hard_turns_count,
            'Tempo Ocioso (min)': stat.total_idle_time_minutes,
            'Tempo Acima Limite (min)': stat.time_over_speed_limit_minutes,
            'Paradas': stat.total_stops,
            'Score de Direção': stat.driving_score,
          }))
        );
        XLSX.utils.book_append_sheet(workbook, statsSheet, 'Estatísticas');
      }

      // Alerts Sheet
      if (includeAlerts && data.alerts.length > 0) {
        const alertsSheet = XLSX.utils.json_to_sheet(
          data.alerts.map((alert: Record<string, unknown>) => ({
            'Data/Hora': alert.event_timestamp ? format(new Date(alert.event_timestamp as string), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR }) : '',
            'Veículo': alert.vehicle_plate,
            'Motorista': alert.driver_name || 'N/A',
            'Tipo': alert.alert_type,
            'Severidade': alert.severity,
            'Título': alert.title,
            'Mensagem': alert.message,
            'Velocidade': alert.speed,
            'Limite': alert.speed_limit,
            'Força G': alert.g_force,
            'Localização': alert.location_name,
            'Reconhecido': alert.acknowledged ? 'Sim' : 'Não',
          }))
        );
        XLSX.utils.book_append_sheet(workbook, alertsSheet, 'Alertas');
      }

      // Telemetry Sheet (detailed)
      if (reportType === 'detailed' && data.telemetry.length > 0) {
        const telemetrySheet = XLSX.utils.json_to_sheet(
          data.telemetry.map((t: Record<string, unknown>) => ({
            'Data/Hora': t.created_at ? format(new Date(t.created_at as string), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR }) : '',
            'Veículo': t.vehicle_plate,
            'Motorista': t.driver_name || 'N/A',
            'Latitude': t.latitude,
            'Longitude': t.longitude,
            'Velocidade (km/h)': t.speed,
            'Força G (X)': t.g_force_x,
            'Força G (Y)': t.g_force_y,
            'Força G (Z)': t.g_force_z,
            'Direção': t.heading,
            'Ignição': t.ignition_on ? 'Ligada' : 'Desligada',
            'Tipo Evento': t.event_type,
            'Severidade': t.event_severity,
          }))
        );
        XLSX.utils.book_append_sheet(workbook, telemetrySheet, 'Telemetria Detalhada');
      }

      XLSX.writeFile(workbook, `relatorio-telemetria-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
      toast.success('Excel exportado com sucesso!');
    } catch (error) {
      console.error('Error exporting Excel:', error);
      toast.error('Erro ao exportar Excel');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className={className}>
          <Download className="w-4 h-4 mr-2" />
          Exportar Relatório
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Exportar Relatório de Telemetria</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data Início</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "dd/MM/yyyy", { locale: ptBR }) : "Selecione"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Data Fim</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "dd/MM/yyyy", { locale: ptBR }) : "Selecione"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Report Type */}
          <div className="space-y-2">
            <Label>Tipo de Relatório</Label>
            <Select value={reportType} onValueChange={(v) => setReportType(v as 'summary' | 'detailed')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="summary">Resumido</SelectItem>
                <SelectItem value="detailed">Detalhado (inclui histórico)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Options */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="include-stats">Incluir Estatísticas</Label>
              <Switch
                id="include-stats"
                checked={includeStatistics}
                onCheckedChange={setIncludeStatistics}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="include-alerts">Incluir Alertas</Label>
              <Switch
                id="include-alerts"
                checked={includeAlerts}
                onCheckedChange={setIncludeAlerts}
              />
            </div>
          </div>

          {/* Export Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              onClick={exportToPDF}
              disabled={isExporting}
              className="flex-1"
              variant="outline"
            >
              {isExporting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <FileText className="w-4 h-4 mr-2" />
              )}
              PDF
            </Button>
            <Button
              onClick={exportToExcel}
              disabled={isExporting}
              className="flex-1"
            >
              {isExporting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <FileSpreadsheet className="w-4 h-4 mr-2" />
              )}
              Excel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
