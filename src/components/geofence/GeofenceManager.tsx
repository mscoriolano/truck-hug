import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useGeofenceZones } from '@/hooks/useDrivingBehavior';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { MapPin, Plus, Trash2, Shield } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

export function GeofenceManager() {
  const { data: zones, isLoading } = useGeofenceZones();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: '',
    latitude: '',
    longitude: '',
    radius_meters: '5000',
    zone_type: 'allowed',
    alert_on_exit: true,
    alert_on_enter: false,
    description: '',
  });

  const handleSubmit = async () => {
    if (!form.name || !form.latitude || !form.longitude) {
      toast.error('Preencha nome, latitude e longitude');
      return;
    }

    const { error } = await supabase.from('geofence_zones').insert({
      name: form.name,
      latitude: parseFloat(form.latitude),
      longitude: parseFloat(form.longitude),
      radius_meters: parseInt(form.radius_meters) || 5000,
      zone_type: form.zone_type,
      alert_on_exit: form.alert_on_exit,
      alert_on_enter: form.alert_on_enter,
      description: form.description || null,
    });

    if (error) {
      toast.error('Erro ao criar zona: ' + error.message);
    } else {
      toast.success('Zona de geofencing criada!');
      queryClient.invalidateQueries({ queryKey: ['geofence_zones'] });
      setShowForm(false);
      setForm({ name: '', latitude: '', longitude: '', radius_meters: '5000', zone_type: 'allowed', alert_on_exit: true, alert_on_enter: false, description: '' });
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('geofence_zones').delete().eq('id', id);
    if (error) {
      toast.error('Erro ao excluir zona');
    } else {
      toast.success('Zona excluída');
      queryClient.invalidateQueries({ queryKey: ['geofence_zones'] });
    }
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    await supabase.from('geofence_zones').update({ is_active: !isActive }).eq('id', id);
    queryClient.invalidateQueries({ queryKey: ['geofence_zones'] });
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-foreground flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Zonas de Geofencing
          </CardTitle>
          <Button size="sm" onClick={() => setShowForm(!showForm)}>
            <Plus className="w-4 h-4 mr-1" /> Nova Zona
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {showForm && (
          <div className="p-4 rounded-lg border border-border bg-background mb-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Nome</Label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ex: Base Timóteo" />
              </div>
              <div>
                <Label>Tipo</Label>
                <Select value={form.zone_type} onValueChange={v => setForm({ ...form, zone_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="allowed">Permitida</SelectItem>
                    <SelectItem value="restricted">Restrita</SelectItem>
                    <SelectItem value="point_of_interest">Ponto de Interesse</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Latitude</Label>
                <Input value={form.latitude} onChange={e => setForm({ ...form, latitude: e.target.value })} placeholder="-19.5290" />
              </div>
              <div>
                <Label>Longitude</Label>
                <Input value={form.longitude} onChange={e => setForm({ ...form, longitude: e.target.value })} placeholder="-42.6360" />
              </div>
              <div>
                <Label>Raio (metros)</Label>
                <Input type="number" value={form.radius_meters} onChange={e => setForm({ ...form, radius_meters: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Descrição (opcional)</Label>
              <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch checked={form.alert_on_exit} onCheckedChange={v => setForm({ ...form, alert_on_exit: v })} />
                <Label className="text-sm">Alertar ao sair</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.alert_on_enter} onCheckedChange={v => setForm({ ...form, alert_on_enter: v })} />
                <Label className="text-sm">Alertar ao entrar</Label>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSubmit}>Salvar</Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            </div>
          </div>
        )}

        {zones && zones.length > 0 ? (
          <div className="space-y-2">
            {zones.map(zone => (
              <div key={zone.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-background">
                <MapPin className={`w-5 h-5 ${zone.zone_type === 'restricted' ? 'text-destructive' : zone.zone_type === 'allowed' ? 'text-green-500' : 'text-primary'}`} />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-foreground">{zone.name}</p>
                    <Badge variant={zone.zone_type === 'restricted' ? 'destructive' : 'secondary'} className="text-[10px]">
                      {zone.zone_type === 'allowed' ? 'Permitida' : zone.zone_type === 'restricted' ? 'Restrita' : 'POI'}
                    </Badge>
                    {!zone.is_active && <Badge variant="outline" className="text-[10px]">Inativa</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {zone.latitude.toFixed(4)}, {zone.longitude.toFixed(4)} • Raio: {zone.radius_meters}m
                  </p>
                </div>
                <Switch checked={zone.is_active} onCheckedChange={() => toggleActive(zone.id, zone.is_active)} />
                <Button variant="ghost" size="icon" onClick={() => handleDelete(zone.id)} className="text-destructive hover:text-destructive">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-6">
            Nenhuma zona configurada. Crie zonas para monitorar a posição dos veículos.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
