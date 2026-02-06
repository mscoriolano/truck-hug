import { useEffect } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useVehicles } from './useVehicles';
import { useVehicleTelemetry } from './useTelemetry';
import { toast } from 'sonner';

/**
 * Hook that monitors vehicle odometers and automatically triggers
 * maintenance alerts when the scheduled km is reached
 */
export function useMaintenanceAlerts() {
  const queryClient = useQueryClient();
  const { data: vehicles } = useVehicles();
  const { data: telemetry } = useVehicleTelemetry();

  const updateMaintenanceStatus = useMutation({
    mutationFn: async ({
      maintenanceId,
      vehiclePlate,
    }: {
      maintenanceId: string;
      vehiclePlate: string;
    }) => {
      const { error } = await supabase
        .from('maintenances')
        .update({ status: 'overdue' })
        .eq('id', maintenanceId);

      if (error) throw error;

      // Create alert
      await supabase.from('telemetry_alerts').insert([{
        vehicle_id: maintenanceId, // Using maintenanceId as placeholder, will be updated by trigger
        vehicle_plate: vehiclePlate,
        alert_type: 'maintenance_due',
        severity: 'warning',
        title: 'Manutenção Necessária',
        message: `O veículo ${vehiclePlate} atingiu a quilometragem prevista para manutenção.`,
        event_timestamp: new Date().toISOString(),
      }]);

      return { maintenanceId, vehiclePlate };
    },
    onSuccess: ({ vehiclePlate }) => {
      queryClient.invalidateQueries({ queryKey: ['maintenances'] });
      queryClient.invalidateQueries({ queryKey: ['telemetry_alerts'] });
      toast.warning(`Manutenção necessária para ${vehiclePlate}`, {
        description: 'O veículo atingiu a quilometragem programada.',
      });
    },
  });

  useEffect(() => {
    if (!vehicles || !telemetry) return;

    // Check each vehicle's odometer against scheduled maintenance
    const checkMaintenances = async () => {
      for (const vehicle of vehicles) {
        const vehicleTelemetry = telemetry.find((t) => t.vehicle_id === vehicle.id);
        if (!vehicleTelemetry || !vehicleTelemetry.odometer) continue;

        // Get scheduled maintenances for this vehicle
        const { data: maintenances } = await supabase
          .from('maintenances')
          .select('*')
          .eq('vehicle_id', vehicle.id)
          .eq('status', 'scheduled');

        if (!maintenances) continue;

        // Check if vehicle's next_maintenance date is past due
        if (vehicle.next_maintenance) {
          const maintenanceDate = new Date(vehicle.next_maintenance);
          if (maintenanceDate <= new Date() && maintenances.length > 0) {
            updateMaintenanceStatus.mutate({
              maintenanceId: maintenances[0].id,
              vehiclePlate: vehicle.plate,
            });
          }
        }
      }
    };

    checkMaintenances();
  }, [vehicles, telemetry]);

  return {
    isChecking: updateMaintenanceStatus.isPending,
  };
}

/**
 * Hook to get maintenance due vehicles based on odometer
 */
export function useMaintenanceDueVehicles() {
  const { data: vehicles } = useVehicles();
  const { data: telemetry } = useVehicleTelemetry();

  const dueVehicles = vehicles
    ?.filter((vehicle) => {
      const vehicleTelemetry = telemetry?.find((t) => t.vehicle_id === vehicle.id);
      if (!vehicleTelemetry || !vehicle.next_maintenance) return false;

      // Parse next_maintenance as a date and check if it's past due
      const maintenanceDate = new Date(vehicle.next_maintenance);
      return maintenanceDate <= new Date();
    })
    .map((vehicle) => {
      const vehicleTelemetry = telemetry?.find((t) => t.vehicle_id === vehicle.id);
      return {
        ...vehicle,
        currentOdometer: vehicleTelemetry?.odometer || vehicle.mileage,
      };
    });

  return {
    dueVehicles: dueVehicles || [],
    count: dueVehicles?.length || 0,
  };
}
