import { useState } from 'react';
import { useUpdateDriver, DriverStatus } from '@/hooks/useDrivers';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Check, ChevronDown } from 'lucide-react';

interface DriverStatusDropdownProps {
  driverId: string;
  currentStatus: DriverStatus;
  size?: 'sm' | 'default';
}

const statusConfig: Record<DriverStatus, { label: string; color: string }> = {
  available: { label: 'Disponível', color: 'bg-success text-success-foreground hover:bg-success/90' },
  driving: { label: 'Dirigindo', color: 'bg-primary text-primary-foreground hover:bg-primary/90' },
  resting: { label: 'Descansando', color: 'bg-warning text-warning-foreground hover:bg-warning/90' },
  off: { label: 'Folga', color: 'bg-muted text-muted-foreground hover:bg-muted/90' },
  terminated: { label: 'Desligado', color: 'bg-destructive text-destructive-foreground hover:bg-destructive/90' },
  vacation: { label: 'Férias', color: 'bg-info text-info-foreground hover:bg-info/90' },
  leave: { label: 'Licença', color: 'bg-secondary text-secondary-foreground hover:bg-secondary/90' },
};

const statusOrder: DriverStatus[] = ['available', 'driving', 'resting', 'off', 'vacation', 'leave', 'terminated'];

export function DriverStatusDropdown({ driverId, currentStatus, size = 'default' }: DriverStatusDropdownProps) {
  const [open, setOpen] = useState(false);
  const updateDriver = useUpdateDriver();
  
  const current = statusConfig[currentStatus] || statusConfig.available;

  const handleStatusChange = (newStatus: DriverStatus) => {
    if (newStatus !== currentStatus) {
      updateDriver.mutate({ id: driverId, status: newStatus });
    }
    setOpen(false);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button 
          className={cn(
            "inline-flex items-center gap-1 rounded-md font-medium transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
            current.color,
            size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'
          )}
          disabled={updateDriver.isPending}
        >
          {current.label}
          <ChevronDown className={cn(
            "transition-transform",
            open && "rotate-180",
            size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'
          )} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        {statusOrder.map((status) => {
          const config = statusConfig[status];
          const isSelected = status === currentStatus;
          
          return (
            <DropdownMenuItem
              key={status}
              onClick={() => handleStatusChange(status)}
              className="flex items-center justify-between cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Badge className={cn("text-xs", config.color.split(' ').slice(0, 2).join(' '))}>
                  {config.label}
                </Badge>
              </div>
              {isSelected && <Check className="h-4 w-4 text-primary" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
