import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUpdateDriver, Driver } from '@/hooks/useDrivers';

interface DriverEditFormProps {
  driver: Driver | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type DriverStatus = 'available' | 'driving' | 'resting' | 'off' | 'vacation' | 'leave' | 'terminated';

export const DriverEditForm = ({ driver, open, onOpenChange }: DriverEditFormProps) => {
  const [formData, setFormData] = useState<{
    name: string;
    phone: string;
    license: string;
    status: DriverStatus;
    cnh_expiry: string;
    cnh_category: string;
    r3: string;
    ac: string;
  }>({
    name: '',
    phone: '',
    license: '',
    status: 'available',
    cnh_expiry: '',
    cnh_category: '',
    r3: '',
    ac: '',
  });
  
  const updateDriver = useUpdateDriver();

  useEffect(() => {
    if (driver) {
      setFormData({
        name: driver.name || '',
        phone: driver.phone || '',
        license: driver.license || '',
        status: (driver.status as DriverStatus) || 'available',
        cnh_expiry: driver.cnh_expiry || '',
        cnh_category: driver.cnh_category || '',
        r3: driver.r3 || '',
        ac: driver.ac || '',
      });
    }
  }, [driver]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!driver) return;
    
    await updateDriver.mutateAsync({ 
      id: driver.id, 
      ...formData,
      cnh_expiry: formData.cnh_expiry || null,
    });
    onOpenChange(false);
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Editar Motorista</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Nome Completo</Label>
            <Input
              id="edit-name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="João da Silva"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-phone">Telefone</Label>
              <Input
                id="edit-phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="(11) 99999-9999"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-license">Número CNH</Label>
              <Input
                id="edit-license"
                value={formData.license}
                onChange={(e) => setFormData({ ...formData, license: e.target.value })}
                placeholder="12345678900"
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-cnh_expiry">Vencimento CNH</Label>
              <Input
                id="edit-cnh_expiry"
                type="date"
                value={formData.cnh_expiry}
                onChange={(e) => setFormData({ ...formData, cnh_expiry: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-cnh_category">Categoria CNH</Label>
              <Select
                value={formData.cnh_category}
                onValueChange={(value) => setFormData({ ...formData, cnh_category: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="A">A</SelectItem>
                  <SelectItem value="B">B</SelectItem>
                  <SelectItem value="AB">AB</SelectItem>
                  <SelectItem value="C">C</SelectItem>
                  <SelectItem value="D">D</SelectItem>
                  <SelectItem value="E">E</SelectItem>
                  <SelectItem value="AC">AC</SelectItem>
                  <SelectItem value="AD">AD</SelectItem>
                  <SelectItem value="AE">AE</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-r3">R3</Label>
              <Input
                id="edit-r3"
                value={formData.r3}
                onChange={(e) => setFormData({ ...formData, r3: e.target.value })}
                placeholder="Código R3"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-ac">AC</Label>
              <Input
                id="edit-ac"
                value={formData.ac}
                onChange={(e) => setFormData({ ...formData, ac: e.target.value })}
                placeholder="Código AC"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-status">Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value: DriverStatus) => setFormData({ ...formData, status: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="available">Disponível</SelectItem>
                <SelectItem value="driving">Dirigindo</SelectItem>
                <SelectItem value="resting">Descansando</SelectItem>
                <SelectItem value="off">Folga</SelectItem>
                <SelectItem value="vacation">Férias</SelectItem>
                <SelectItem value="leave">Licença</SelectItem>
                <SelectItem value="terminated">Desligado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" className="w-full" disabled={updateDriver.isPending}>
            {updateDriver.isPending ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
