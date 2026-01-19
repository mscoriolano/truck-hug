import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useDrivers } from '@/hooks/useDrivers';
import { useVehicles } from '@/hooks/useVehicles';
import { useCreateJourneyEvent } from '@/hooks/useJourneyCompliance';
import { Play, Pause, Square, Coffee, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface JourneyEventButtonProps {
  eventType: 'journey_start' | 'journey_end' | 'break_start' | 'break_end';
  driverId?: string;
  driverName?: string;
  vehicleId?: string;
  vehiclePlate?: string;
  variant?: 'default' | 'compact';
}

const eventConfig = {
  journey_start: { 
    label: 'Iniciar Jornada', 
    shortLabel: 'Iniciar',
    icon: Play, 
    color: 'bg-success hover:bg-success/90 text-success-foreground' 
  },
  journey_end: { 
    label: 'Encerrar Jornada', 
    shortLabel: 'Encerrar',
    icon: Square, 
    color: 'bg-destructive hover:bg-destructive/90 text-destructive-foreground' 
  },
  break_start: { 
    label: 'Iniciar Pausa', 
    shortLabel: 'Pausa',
    icon: Coffee, 
    color: 'bg-warning hover:bg-warning/90 text-warning-foreground' 
  },
  break_end: { 
    label: 'Fim da Pausa', 
    shortLabel: 'Retomar',
    icon: Play, 
    color: 'bg-info hover:bg-info/90 text-info-foreground' 
  },
};

export function JourneyEventButton({ 
  eventType, 
  driverId: initialDriverId,
  driverName: initialDriverName,
  vehicleId: initialVehicleId,
  vehiclePlate: initialVehiclePlate,
  variant = 'default'
}: JourneyEventButtonProps) {
  const [open, setOpen] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState(initialDriverId || '');
  const [selectedVehicle, setSelectedVehicle] = useState(initialVehicleId || '');
  const [location, setLocation] = useState('');
  const [mileage, setMileage] = useState('');
  
  const { data: drivers } = useDrivers();
  const { data: vehicles } = useVehicles();
  const createEvent = useCreateJourneyEvent();
  
  const config = eventConfig[eventType];
  const Icon = config.icon;
  
  const handleSubmit = () => {
    const driver = drivers?.find(d => d.id === selectedDriver);
    const vehicle = vehicles?.find(v => v.id === selectedVehicle);
    
    if (!driver) return;
    
    createEvent.mutate({
      driver_id: driver.id,
      driver_name: driver.name,
      vehicle_id: vehicle?.id,
      vehicle_plate: vehicle?.plate,
      event_type: eventType,
      location_name: location || undefined,
      mileage: mileage ? parseInt(mileage, 10) : undefined,
      source: 'manual',
    }, {
      onSuccess: () => {
        setOpen(false);
        setLocation('');
        setMileage('');
      },
    });
  };
  
  // Se já temos os dados do motorista, botão direto
  if (initialDriverId && initialDriverName) {
    return (
      <Button
        size={variant === 'compact' ? 'sm' : 'default'}
        className={cn(config.color)}
        onClick={() => {
          createEvent.mutate({
            driver_id: initialDriverId,
            driver_name: initialDriverName,
            vehicle_id: initialVehicleId,
            vehicle_plate: initialVehiclePlate,
            event_type: eventType,
            source: 'manual',
          });
        }}
        disabled={createEvent.isPending}
      >
        {createEvent.isPending ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <>
            <Icon className="w-4 h-4 mr-1" />
            {variant === 'compact' ? config.shortLabel : config.label}
          </>
        )}
      </Button>
    );
  }
  
  // Caso contrário, abrir dialog para selecionar
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size={variant === 'compact' ? 'sm' : 'default'}
          className={cn(config.color)}
        >
          <Icon className="w-4 h-4 mr-1" />
          {variant === 'compact' ? config.shortLabel : config.label}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{config.label}</DialogTitle>
          <DialogDescription>
            Registre o evento de jornada do motorista
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Motorista *</Label>
            <Select value={selectedDriver} onValueChange={setSelectedDriver}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o motorista" />
              </SelectTrigger>
              <SelectContent>
                {drivers?.filter(d => d.status !== 'terminated').map((driver) => (
                  <SelectItem key={driver.id} value={driver.id}>
                    {driver.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label>Veículo</Label>
            <Select value={selectedVehicle} onValueChange={setSelectedVehicle}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o veículo (opcional)" />
              </SelectTrigger>
              <SelectContent>
                {vehicles?.filter(v => v.status === 'active').map((vehicle) => (
                  <SelectItem key={vehicle.id} value={vehicle.id}>
                    {vehicle.plate} - {vehicle.model}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label>Localização</Label>
            <Input 
              placeholder="Local do evento (opcional)"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label>Quilometragem</Label>
            <Input 
              type="number"
              placeholder="KM atual (opcional)"
              value={mileage}
              onChange={(e) => setMileage(e.target.value)}
            />
          </div>
          
          <Button 
            className={cn("w-full", config.color)}
            onClick={handleSubmit}
            disabled={!selectedDriver || createEvent.isPending}
          >
            {createEvent.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Icon className="w-4 h-4 mr-2" />
            )}
            {config.label}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
