import { MainLayout } from '@/components/layout/MainLayout';
import { useDrivers, useDeleteDriver } from '@/hooks/useDrivers';
import { DriverForm } from '@/components/forms/DriverForm';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { User, Phone, CreditCard, Truck, MoreVertical, Trash2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const statusConfig = {
  available: { label: 'Disponível', color: 'bg-success text-success-foreground' },
  driving: { label: 'Dirigindo', color: 'bg-primary text-primary-foreground' },
  resting: { label: 'Descansando', color: 'bg-warning text-warning-foreground' },
  off: { label: 'Folga', color: 'bg-muted text-muted-foreground' },
};

const Motoristas = () => {
  const { data: drivers, isLoading } = useDrivers();
  const deleteDriver = useDeleteDriver();

  if (isLoading) {
    return (
      <MainLayout title="Motoristas" subtitle="Gerencie sua equipe de motoristas">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout 
      title="Motoristas" 
      subtitle="Gerencie sua equipe de motoristas"
    >
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground">
            {drivers?.length || 0} motoristas cadastrados
          </p>
          <DriverForm />
        </div>

        {drivers && drivers.length > 0 ? (
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full">
              <thead className="bg-secondary">
                <tr>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Motorista</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Contato</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">CNH</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Veículo Atual</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Status</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Jornada Hoje</th>
                  <th className="p-4"></th>
                </tr>
              </thead>
              <tbody>
                {drivers.map((driver) => {
                  const status = statusConfig[driver.status];
                  const progressPercent = ((driver.total_hours_today || 0) / 8) * 100;
                  
                  return (
                    <tr 
                      key={driver.id} 
                      className="border-t border-border hover:bg-secondary/50 transition-colors"
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center">
                              <User className="w-5 h-5 text-primary-foreground" />
                            </div>
                            <div className={cn(
                              "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card",
                              driver.status === 'driving' && "bg-primary",
                              driver.status === 'available' && "bg-success",
                              driver.status === 'resting' && "bg-warning",
                              driver.status === 'off' && "bg-muted",
                            )} />
                          </div>
                          <span className="font-medium text-foreground">{driver.name}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Phone className="w-3.5 h-3.5" />
                          <span>{driver.phone}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>{driver.license}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        {driver.current_vehicle ? (
                          <div className="flex items-center gap-1 text-sm text-foreground">
                            <Truck className="w-3.5 h-3.5 text-primary" />
                            <span>{driver.current_vehicle}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="p-4">
                        <Badge className={cn("text-xs", status.color)}>
                          {status.label}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <div className="w-32">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-muted-foreground">
                              {Math.floor(driver.total_hours_today || 0)}h
                            </span>
                            <span className="text-muted-foreground">8h</span>
                          </div>
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div 
                              className={cn(
                                "h-full rounded-full transition-all",
                                progressPercent >= 90 ? "bg-destructive" :
                                progressPercent >= 70 ? "bg-warning" : "bg-primary"
                              )}
                              style={{ width: `${Math.min(progressPercent, 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem 
                              className="text-destructive"
                              onClick={() => deleteDriver.mutate(driver.id)}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 rounded-xl border border-border bg-card">
            <User className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">Nenhum motorista cadastrado</p>
            <DriverForm />
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Motoristas;
