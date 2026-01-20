import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useJourneyLegalSettings, useUpdateJourneyLegalSettings } from '@/hooks/useJourneyCompliance';
import { Settings, Save, AlertTriangle } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

export const JourneySettingsForm: React.FC = () => {
  const [open, setOpen] = useState(false);
  const { data: settings, isLoading } = useJourneyLegalSettings();
  const updateSettings = useUpdateJourneyLegalSettings();
  
  const [formData, setFormData] = useState({
    max_daily_hours: 8,
    max_overtime_hours: 2,
    min_inter_journey_hours: 11,
    min_weekly_rest_hours: 35,
    max_consecutive_work_days: 6,
    alert_overtime_warning_minutes: 90,
    macro_journey_start: '',
    macro_journey_end: '',
    macro_break_start: '',
    macro_break_end: '',
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        max_daily_hours: settings.max_daily_hours || 8,
        max_overtime_hours: settings.max_overtime_hours || 2,
        min_inter_journey_hours: settings.min_inter_journey_hours || 11,
        min_weekly_rest_hours: settings.min_weekly_rest_hours || 35,
        max_consecutive_work_days: settings.max_consecutive_work_days || 6,
        alert_overtime_warning_minutes: settings.alert_overtime_warning_minutes || 90,
        macro_journey_start: settings.macro_journey_start || '',
        macro_journey_end: settings.macro_journey_end || '',
        macro_break_start: settings.macro_break_start || '',
        macro_break_end: settings.macro_break_end || '',
      });
    }
  }, [settings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateSettings.mutateAsync(formData);
    setOpen(false);
  };

  if (isLoading) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="h-4 w-4 mr-2" />
          Configurar
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configurações de Jornada</DialogTitle>
          <DialogDescription>
            Configure os limites legais e macros do rastreador
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Limites Legais */}
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              Limites Legais (Lei 13.103/2015)
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Jornada Máxima (horas)</Label>
                <Input
                  type="number"
                  value={formData.max_daily_hours}
                  onChange={(e) => setFormData({ ...formData, max_daily_hours: parseFloat(e.target.value) })}
                  min={1}
                  max={24}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Hora Extra Máxima (horas)</Label>
                <Input
                  type="number"
                  value={formData.max_overtime_hours}
                  onChange={(e) => setFormData({ ...formData, max_overtime_hours: parseFloat(e.target.value) })}
                  min={0}
                  max={4}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Descanso Interjornada (horas)</Label>
                <Input
                  type="number"
                  value={formData.min_inter_journey_hours}
                  onChange={(e) => setFormData({ ...formData, min_inter_journey_hours: parseFloat(e.target.value) })}
                  min={1}
                  max={24}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Descanso Semanal (horas)</Label>
                <Input
                  type="number"
                  value={formData.min_weekly_rest_hours}
                  onChange={(e) => setFormData({ ...formData, min_weekly_rest_hours: parseFloat(e.target.value) })}
                  min={1}
                  max={72}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Dias Consecutivos Máx.</Label>
                <Input
                  type="number"
                  value={formData.max_consecutive_work_days}
                  onChange={(e) => setFormData({ ...formData, max_consecutive_work_days: parseInt(e.target.value) })}
                  min={1}
                  max={7}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Alerta Antes HE (min)</Label>
                <Input
                  type="number"
                  value={formData.alert_overtime_warning_minutes}
                  onChange={(e) => setFormData({ ...formData, alert_overtime_warning_minutes: parseInt(e.target.value) })}
                  min={0}
                  max={180}
                />
              </div>
            </div>
          </div>
          
          <Separator />
          
          {/* Macros do Rastreador */}
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <Settings className="h-4 w-4 text-primary" />
              Macros do Rastreador
            </h3>
            <p className="text-xs text-muted-foreground">
              Configure os códigos de macro enviados pelo rastreador para cada evento de jornada (ex: M1, M2, M3, M4)
            </p>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Início de Jornada</Label>
                <Input
                  value={formData.macro_journey_start}
                  onChange={(e) => setFormData({ ...formData, macro_journey_start: e.target.value })}
                  placeholder="Ex: M1"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Fim de Jornada</Label>
                <Input
                  value={formData.macro_journey_end}
                  onChange={(e) => setFormData({ ...formData, macro_journey_end: e.target.value })}
                  placeholder="Ex: M2"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Início de Pausa</Label>
                <Input
                  value={formData.macro_break_start}
                  onChange={(e) => setFormData({ ...formData, macro_break_start: e.target.value })}
                  placeholder="Ex: M3"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Fim de Pausa</Label>
                <Input
                  value={formData.macro_break_end}
                  onChange={(e) => setFormData({ ...formData, macro_break_end: e.target.value })}
                  placeholder="Ex: M4"
                />
              </div>
            </div>
          </div>
          
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={updateSettings.isPending}>
              <Save className="h-4 w-4 mr-2" />
              {updateSettings.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
