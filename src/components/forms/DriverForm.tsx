import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus } from 'lucide-react';
import { useCreateDriver } from '@/hooks/useDrivers';

export const DriverForm = () => {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState<{
    name: string;
    phone: string;
    license: string;
    status: 'available' | 'driving' | 'resting' | 'off';
  }>({
    name: '',
    phone: '',
    license: '',
    status: 'available',
  });
  
  const createDriver = useCreateDriver();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createDriver.mutateAsync(formData);
    setFormData({ name: '', phone: '', license: '', status: 'available' });
    setOpen(false);
  };
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Novo Motorista
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Cadastrar Motorista</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome Completo</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="João da Silva"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Telefone</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="(11) 99999-9999"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="license">CNH</Label>
            <Input
              id="license"
              value={formData.license}
              onChange={(e) => setFormData({ ...formData, license: e.target.value })}
              placeholder="12345678900"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value: 'available' | 'driving' | 'resting' | 'off') => 
                setFormData({ ...formData, status: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="available">Disponível</SelectItem>
                <SelectItem value="driving">Dirigindo</SelectItem>
                <SelectItem value="resting">Descansando</SelectItem>
                <SelectItem value="off">Folga</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" className="w-full" disabled={createDriver.isPending}>
            {createDriver.isPending ? 'Salvando...' : 'Cadastrar'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
