import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useDriverVehicleAssignments, useCreateAssignment, useEndAssignment } from '@/hooks/useDriverVehicleAssignments';
import { useVehicles } from '@/hooks/useVehicles';
import { useDrivers } from '@/hooks/useDrivers';
import { useTrips } from '@/hooks/useTrips';
import { Truck, User, Link2, Unlink, QrCode, Clock, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function DriverVehicleAssignment() {
  const { data: vehicles } = useVehicles();
  const { data: drivers } = useDrivers();
  const { data: trips } = useTrips();
  const { data: activeAssignments, isLoading } = useDriverVehicleAssignments(true);
  
  const createAssignmentMutation = useCreateAssignment();
  const endAssignmentMutation = useEndAssignment();

  const [selectedDriver, setSelectedDriver] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [selectedTrip, setSelectedTrip] = useState('');
  const [assignmentCode, setAssignmentCode] = useState('');
  const [mode, setMode] = useState<'manual' | 'code'>('manual');

  // Gerar código aleatório
  const generateCode = () => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    setAssignmentCode(code);
    toast.success(`Código gerado: ${code}`);
  };

  // Criar vinculação
  const handleCreateAssignment = async () => {
    if (!selectedDriver || !selectedVehicle) {
      toast.error('Selecione motorista e veículo');
      return;
    }

    const driver = drivers?.find(d => d.id === selectedDriver);
    const vehicle = vehicles?.find(v => v.id === selectedVehicle);

    if (!driver || !vehicle) {
      toast.error('Motorista ou veículo não encontrado');
      return;
    }

    createAssignmentMutation.mutate({
      driver_id: selectedDriver,
      driver_name: driver.name,
      vehicle_id: selectedVehicle,
      vehicle_plate: vehicle.plate,
      trip_id: selectedTrip || undefined,
    });

    // Limpar campos
    setSelectedDriver('');
    setSelectedVehicle('');
    setSelectedTrip('');
    setAssignmentCode('');
  };

  // Encerrar vinculação
  const handleEndAssignment = (assignmentId: string) => {
    endAssignmentMutation.mutate(assignmentId);
  };

  // Verificar se veículo já está vinculado
  const isVehicleAssigned = (vehicleId: string) => {
    return activeAssignments?.some(a => a.vehicle_id === vehicleId);
  };

  // Verificar se motorista já está vinculado
  const isDriverAssigned = (driverId: string) => {
    return activeAssignments?.some(a => a.driver_id === driverId);
  };

  // Motoristas disponíveis (não vinculados)
  const availableDrivers = drivers?.filter(d => !isDriverAssigned(d.id) && d.status !== 'off');

  // Veículos disponíveis (não vinculados e ativos)
  const availableVehicles = vehicles?.filter(v => !isVehicleAssigned(v.id) && v.status === 'active');

  // Viagens pendentes
  const pendingTrips = trips?.filter(t => t.trip_type === 'escoamento' || t.trip_type === 'abastecimento');

  return (
    <div className="space-y-6">
      {/* Formulário de Vinculação */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Vincular Motorista a Veículo
          </CardTitle>
          <CardDescription>
            Crie uma vinculação para início de viagem. O motorista pode usar o código no tablet do rastreador.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Modo de Vinculação */}
          <div className="flex gap-2">
            <Button 
              variant={mode === 'manual' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMode('manual')}
            >
              <User className="h-4 w-4 mr-2" />
              Seleção Manual
            </Button>
            <Button 
              variant={mode === 'code' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMode('code')}
            >
              <QrCode className="h-4 w-4 mr-2" />
              Código de Identificação
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Seleção de Motorista */}
            <div className="space-y-2">
              <Label>Motorista</Label>
              <Select value={selectedDriver} onValueChange={setSelectedDriver}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o motorista" />
                </SelectTrigger>
                <SelectContent>
                  {availableDrivers?.map(driver => (
                    <SelectItem key={driver.id} value={driver.id}>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        {driver.name}
                        <Badge variant="outline" className="ml-2">
                          {driver.status === 'available' ? 'Disponível' : driver.status}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Seleção de Veículo */}
            <div className="space-y-2">
              <Label>Veículo</Label>
              <Select value={selectedVehicle} onValueChange={setSelectedVehicle}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o veículo" />
                </SelectTrigger>
                <SelectContent>
                  {availableVehicles?.map(vehicle => (
                    <SelectItem key={vehicle.id} value={vehicle.id}>
                      <div className="flex items-center gap-2">
                        <Truck className="h-4 w-4" />
                        {vehicle.plate} - {vehicle.model}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Seleção de Viagem (opcional) */}
            <div className="space-y-2">
              <Label>Viagem (opcional)</Label>
              <Select value={selectedTrip} onValueChange={setSelectedTrip}>
                <SelectTrigger>
                  <SelectValue placeholder="Vincular a uma viagem" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma viagem</SelectItem>
                  {pendingTrips?.map(trip => (
                    <SelectItem key={trip.id} value={trip.id}>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        {trip.vehicle_plate} - {trip.trip_type.toUpperCase()} 
                        ({format(new Date(trip.departure_date), 'dd/MM', { locale: ptBR })})
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Código de Identificação */}
            {mode === 'code' && (
              <div className="space-y-2">
                <Label>Código de Identificação</Label>
                <div className="flex gap-2">
                  <Input 
                    value={assignmentCode}
                    onChange={(e) => setAssignmentCode(e.target.value.toUpperCase())}
                    placeholder="Ex: ABC123"
                    maxLength={8}
                  />
                  <Button variant="outline" onClick={generateCode}>
                    Gerar
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  O motorista usará este código no tablet do rastreador para iniciar a viagem.
                </p>
              </div>
            )}
          </div>

          <Button 
            onClick={handleCreateAssignment}
            disabled={!selectedDriver || !selectedVehicle || createAssignmentMutation.isPending}
            className="w-full"
          >
            <Link2 className="h-4 w-4 mr-2" />
            {createAssignmentMutation.isPending ? 'Vinculando...' : 'Criar Vinculação'}
          </Button>
        </CardContent>
      </Card>

      {/* Vinculações Ativas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Vinculações Ativas
          </CardTitle>
          <CardDescription>
            Motoristas atualmente vinculados a veículos
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando vinculações...
            </div>
          ) : activeAssignments && activeAssignments.length > 0 ? (
            <div className="space-y-4">
              {activeAssignments.map(assignment => (
                <div 
                  key={assignment.id}
                  className="flex items-center justify-between p-4 border rounded-lg bg-card"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-primary" />
                        <span className="font-medium">{assignment.driver_name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Truck className="h-3 w-3" />
                        <span>{assignment.vehicle_plate}</span>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-start gap-1">
                      <Badge variant="secondary">
                        <Clock className="h-3 w-3 mr-1" />
                        Início: {format(new Date(assignment.start_time), 'dd/MM HH:mm', { locale: ptBR })}
                      </Badge>
                      {assignment.assignment_code && (
                        <Badge variant="outline">
                          <QrCode className="h-3 w-3 mr-1" />
                          Código: {assignment.assignment_code}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <Button 
                    variant="destructive"
                    size="sm"
                    onClick={() => handleEndAssignment(assignment.id)}
                    disabled={endAssignmentMutation.isPending}
                  >
                    <Unlink className="h-4 w-4 mr-2" />
                    Encerrar
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma vinculação ativa no momento
            </div>
          )}
        </CardContent>
      </Card>

      {/* Instruções */}
      <Card>
        <CardHeader>
          <CardTitle>📋 Instruções de Uso</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm dark:prose-invert max-w-none">
          <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
            <li>
              <strong>Modo Manual:</strong> Selecione o motorista e veículo diretamente no sistema para criar a vinculação.
            </li>
            <li>
              <strong>Código de Identificação:</strong> Gere um código único que o motorista pode digitar no tablet do rastreador para se identificar automaticamente.
            </li>
            <li>
              <strong>Vinculação a Viagem:</strong> Opcionalmente, vincule a uma viagem programada para rastrear todo o percurso.
            </li>
            <li>
              <strong>Encerramento:</strong> Ao final da viagem, encerre a vinculação para liberar motorista e veículo.
            </li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
