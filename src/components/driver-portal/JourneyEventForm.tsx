import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useVehicles } from '@/hooks/useVehicles';
import { useDrivers } from '@/hooks/useDrivers';
import { useCreateJourneyEvent, useJourneyEvents } from '@/hooks/useJourneyCompliance';
import { useAuth } from '@/hooks/useAuth';
import { Clock, Play, Pause, Square, Coffee, MapPin, Gauge, Calendar, Edit, Trash2, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

const eventTypes = [
  { value: 'journey_start', label: 'Início de Jornada', icon: Play, color: 'bg-success/20 text-success' },
  { value: 'break_start', label: 'Início de Pausa', icon: Pause, color: 'bg-warning/20 text-warning' },
  { value: 'break_end', label: 'Fim de Pausa', icon: Coffee, color: 'bg-info/20 text-info' },
  { value: 'journey_end', label: 'Fim de Jornada', icon: Square, color: 'bg-muted text-muted-foreground' },
];

interface JourneyEventFormProps {
  /** Se true, mostra seletor de motorista (modo admin). Se false, usa o motorista logado */
  showDriverSelector?: boolean;
  /** ID do motorista pré-selecionado */
  preselectedDriverId?: string;
}

export const JourneyEventForm: React.FC<JourneyEventFormProps> = ({
  showDriverSelector = true,
  preselectedDriverId,
}) => {
  const [open, setOpen] = useState(false);
  const [eventType, setEventType] = useState<string>('');
  const [vehicleId, setVehicleId] = useState<string>('');
  const [driverId, setDriverId] = useState<string>(preselectedDriverId || '');
  const [location, setLocation] = useState('');
  const [mileage, setMileage] = useState('');
  const [notes, setNotes] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [editingEventId, setEditingEventId] = useState<string | null>(null);

  const { user } = useAuth();
  const { data: vehicles = [] } = useVehicles();
  const { data: drivers = [] } = useDrivers();
  const createEvent = useCreateJourneyEvent();
  const queryClient = useQueryClient();
  
  // Buscar eventos do motorista selecionado
  const { data: journeyEvents = [] } = useJourneyEvents(driverId || undefined, 20);

  // Encontrar motorista atual
  const currentDriver = driverId 
    ? drivers.find(d => d.id === driverId)
    : drivers.find(d => d.id === user?.id) || drivers[0];
    
  const selectedVehicle = vehicles.find(v => v.id === vehicleId);

  const resetForm = () => {
    setEventType('');
    setVehicleId('');
    setLocation('');
    setMileage('');
    setNotes('');
    setEventDate('');
    setEventTime('');
    setEditingEventId(null);
  };

  const getEventTimestamp = (): string => {
    if (eventDate && eventTime) {
      return new Date(`${eventDate}T${eventTime}`).toISOString();
    } else if (eventDate) {
      return new Date(`${eventDate}T12:00:00`).toISOString();
    }
    return new Date().toISOString();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!eventType || !currentDriver) return;

    const eventTimestamp = getEventTimestamp();

    if (editingEventId) {
      // Atualizar evento existente
      const { error } = await supabase
        .from('driver_journey_events')
        .update({
          event_type: eventType,
          event_timestamp: eventTimestamp,
          vehicle_id: vehicleId || null,
          vehicle_plate: selectedVehicle?.plate || null,
          location_name: location || null,
          mileage: mileage ? parseInt(mileage) : null,
        })
        .eq('id', editingEventId);
      
      if (error) {
        toast.error('Erro ao atualizar evento: ' + error.message);
      } else {
        toast.success('Evento atualizado com sucesso!');
        queryClient.invalidateQueries({ queryKey: ['journey_events'] });
        queryClient.invalidateQueries({ queryKey: ['journey_compliance'] });
      }
    } else {
      // Criar novo evento
      await createEvent.mutateAsync({
        driver_id: currentDriver.id,
        driver_name: currentDriver.name,
        vehicle_id: vehicleId || undefined,
        vehicle_plate: selectedVehicle?.plate || undefined,
        event_type: eventType as 'journey_start' | 'journey_end' | 'break_start' | 'break_end',
        event_timestamp: eventTimestamp,
        location_name: location || undefined,
        mileage: mileage ? parseInt(mileage) : undefined,
        source: 'driver_portal',
      });
    }

    resetForm();
    setOpen(false);
  };

  const handleQuickEvent = async (type: string) => {
    if (!currentDriver) {
      toast.error('Selecione um motorista primeiro');
      return;
    }

    // Para evento rápido, usar veículo atual do motorista se disponível
    const driverVehicle = currentDriver.current_vehicle 
      ? vehicles.find(v => v.plate === currentDriver.current_vehicle)
      : null;

    await createEvent.mutateAsync({
      driver_id: currentDriver.id,
      driver_name: currentDriver.name,
      vehicle_id: driverVehicle?.id || undefined,
      vehicle_plate: driverVehicle?.plate || undefined,
      event_type: type as 'journey_start' | 'journey_end' | 'break_start' | 'break_end',
      source: 'driver_portal',
    });
  };

  const handleEditEvent = (event: typeof journeyEvents[0]) => {
    setEditingEventId(event.id);
    setEventType(event.event_type);
    setVehicleId(event.vehicle_id || '');
    setLocation(event.location_name || '');
    setMileage(event.mileage?.toString() || '');
    
    const eventDate = new Date(event.event_timestamp);
    setEventDate(format(eventDate, 'yyyy-MM-dd'));
    setEventTime(format(eventDate, 'HH:mm'));
    
    setOpen(true);
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm('Tem certeza que deseja excluir este evento?')) return;
    
    const { error } = await supabase
      .from('driver_journey_events')
      .delete()
      .eq('id', eventId);
    
    if (error) {
      toast.error('Erro ao excluir evento: ' + error.message);
    } else {
      toast.success('Evento excluído com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['journey_events'] });
      queryClient.invalidateQueries({ queryKey: ['journey_compliance'] });
    }
  };

  const getEventTypeLabel = (type: string) => {
    return eventTypes.find(t => t.value === type)?.label || type;
  };

  const getEventTypeBadge = (type: string) => {
    const config = eventTypes.find(t => t.value === type);
    if (!config) return <Badge variant="outline">{type}</Badge>;
    
    const Icon = config.icon;
    return (
      <Badge className={cn("flex items-center gap-1", config.color)}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          Controle de Jornada
        </CardTitle>
        <CardDescription>
          Registre o início e fim da jornada de trabalho
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Seletor de Motorista */}
        {showDriverSelector && (
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Motorista
            </Label>
            <Select value={driverId} onValueChange={setDriverId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o motorista" />
              </SelectTrigger>
              <SelectContent>
                {drivers.map((driver) => (
                  <SelectItem key={driver.id} value={driver.id}>
                    <div className="flex items-center gap-2">
                      {driver.name}
                      <Badge variant="outline" className="text-xs">
                        {driver.status}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Info do motorista selecionado */}
        {currentDriver && (
          <div className="p-3 rounded-lg bg-secondary/50 text-sm space-y-1">
            <p className="font-medium">{currentDriver.name}</p>
            <div className="flex flex-wrap gap-2 text-muted-foreground text-xs">
              <span>Status: <Badge variant="outline" className="text-xs">{currentDriver.status}</Badge></span>
              {currentDriver.current_vehicle && (
                <span>Veículo: {currentDriver.current_vehicle}</span>
              )}
              {currentDriver.journey_start && (
                <span>Jornada: {format(new Date(currentDriver.journey_start), 'HH:mm')}</span>
              )}
            </div>
          </div>
        )}

        {/* Botões de ação rápida */}
        <div className="grid grid-cols-2 gap-2">
          {eventTypes.map((type) => {
            const Icon = type.icon;
            return (
              <Button
                key={type.value}
                variant="outline"
                className={cn(
                  "h-16 flex flex-col items-center justify-center gap-1",
                  "hover:bg-accent transition-colors"
                )}
                onClick={() => handleQuickEvent(type.value)}
                disabled={createEvent.isPending || !currentDriver}
              >
                <div className={cn("p-2 rounded-lg", type.color)}>
                  <Icon className="h-4 w-4" />
                </div>
                <span className="text-xs">{type.label}</span>
              </Button>
            );
          })}
        </div>

        {/* Formulário completo */}
        <Dialog open={open} onOpenChange={(isOpen) => {
          setOpen(isOpen);
          if (!isOpen) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button variant="secondary" className="w-full">
              <MapPin className="h-4 w-4 mr-2" />
              Registro Detalhado
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingEventId ? 'Editar Evento' : 'Registro de Jornada'}
              </DialogTitle>
              <DialogDescription>
                Preencha os detalhes do evento de jornada
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Tipo de Evento *</Label>
                <Select value={eventType} onValueChange={setEventType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {eventTypes.map((type) => {
                      const Icon = type.icon;
                      return (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4" />
                            {type.label}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {/* Data e Hora */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Data
                  </Label>
                  <Input
                    type="date"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Hora
                  </Label>
                  <Input
                    type="time"
                    value={eventTime}
                    onChange={(e) => setEventTime(e.target.value)}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground -mt-2">
                Se não informados, serão usados data e hora atuais
              </p>

              <div className="space-y-2">
                <Label>Veículo</Label>
                <Select value={vehicleId} onValueChange={setVehicleId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o veículo" />
                  </SelectTrigger>
                  <SelectContent>
                    {vehicles.map((vehicle) => (
                      <SelectItem key={vehicle.id} value={vehicle.id}>
                        {vehicle.plate} - {vehicle.model}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Local
                </Label>
                <Input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Ex: Pátio da empresa, Cliente ABC"
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Gauge className="h-4 w-4" />
                  Quilometragem
                </Label>
                <Input
                  type="number"
                  value={mileage}
                  onChange={(e) => setMileage(e.target.value)}
                  placeholder="KM atual do veículo"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => {
                  setOpen(false);
                  resetForm();
                }}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={!eventType || createEvent.isPending}>
                  {createEvent.isPending ? 'Registrando...' : editingEventId ? 'Atualizar' : 'Registrar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Histórico de eventos recentes */}
        {currentDriver && journeyEvents.length > 0 && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Eventos Recentes</Label>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {journeyEvents.slice(0, 5).map((event) => (
                <div 
                  key={event.id} 
                  className="flex items-center justify-between p-2 rounded-lg bg-secondary/30 text-sm"
                >
                  <div className="flex items-center gap-2">
                    {getEventTypeBadge(event.event_type)}
                    <span className="text-muted-foreground">
                      {format(new Date(event.event_timestamp), "dd/MM HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleEditEvent(event)}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      onClick={() => handleDeleteEvent(event.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
