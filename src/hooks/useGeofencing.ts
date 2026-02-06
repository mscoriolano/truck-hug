import { useState, useEffect, useCallback } from 'react';
import { useVehicleTelemetry } from './useTelemetry';
import { toast } from 'sonner';

interface GeolocationPosition {
  latitude: number;
  longitude: number;
  accuracy: number;
}

interface GeofenceResult {
  isWithinRange: boolean;
  distance: number;
  driverPosition: GeolocationPosition | null;
  vehiclePosition: { latitude: number; longitude: number } | null;
  error: string | null;
}

/**
 * Calculates the distance between two coordinates using the Haversine formula
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

/**
 * Hook to check if the driver is within a certain range of their assigned vehicle
 * @param vehicleId - The ID of the vehicle to check against
 * @param maxDistanceMeters - Maximum allowed distance in meters (default: 500)
 */
export function useGeofencing(
  vehicleId: string | undefined,
  maxDistanceMeters: number = 500
): GeofenceResult & { checkPosition: () => Promise<GeofenceResult> } {
  const [result, setResult] = useState<GeofenceResult>({
    isWithinRange: false,
    distance: Infinity,
    driverPosition: null,
    vehiclePosition: null,
    error: null,
  });

  const { data: telemetry } = useVehicleTelemetry();

  const vehicleTelemetry = vehicleId
    ? telemetry?.find((t) => t.vehicle_id === vehicleId)
    : null;

  const checkPosition = useCallback(async (): Promise<GeofenceResult> => {
    return new Promise((resolve) => {
      // Check if geolocation is available
      if (!navigator.geolocation) {
        const errorResult: GeofenceResult = {
          isWithinRange: false,
          distance: Infinity,
          driverPosition: null,
          vehiclePosition: null,
          error: 'Geolocalização não disponível neste dispositivo',
        };
        setResult(errorResult);
        resolve(errorResult);
        return;
      }

      // Check if vehicle has valid coordinates
      if (
        !vehicleTelemetry ||
        !vehicleTelemetry.latitude ||
        !vehicleTelemetry.longitude
      ) {
        const errorResult: GeofenceResult = {
          isWithinRange: false,
          distance: Infinity,
          driverPosition: null,
          vehiclePosition: null,
          error: 'Posição do veículo não disponível',
        };
        setResult(errorResult);
        resolve(errorResult);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const driverPos: GeolocationPosition = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          };

          const vehiclePos = {
            latitude: vehicleTelemetry.latitude!,
            longitude: vehicleTelemetry.longitude!,
          };

          const distance = calculateDistance(
            driverPos.latitude,
            driverPos.longitude,
            vehiclePos.latitude,
            vehiclePos.longitude
          );

          const isWithinRange = distance <= maxDistanceMeters;

          const newResult: GeofenceResult = {
            isWithinRange,
            distance: Math.round(distance),
            driverPosition: driverPos,
            vehiclePosition: vehiclePos,
            error: null,
          };

          setResult(newResult);
          resolve(newResult);
        },
        (error) => {
          let errorMessage = 'Erro ao obter localização';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Permissão de localização negada';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Posição indisponível';
              break;
            case error.TIMEOUT:
              errorMessage = 'Tempo limite para obter localização';
              break;
          }

          const errorResult: GeofenceResult = {
            isWithinRange: false,
            distance: Infinity,
            driverPosition: null,
            vehiclePosition: vehicleTelemetry
              ? {
                  latitude: vehicleTelemetry.latitude!,
                  longitude: vehicleTelemetry.longitude!,
                }
              : null,
            error: errorMessage,
          };

          setResult(errorResult);
          resolve(errorResult);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 30000,
        }
      );
    });
  }, [vehicleTelemetry, maxDistanceMeters]);

  // Auto-check when vehicle telemetry updates
  useEffect(() => {
    if (vehicleTelemetry) {
      checkPosition();
    }
  }, [vehicleTelemetry?.latitude, vehicleTelemetry?.longitude]);

  return { ...result, checkPosition };
}

/**
 * Hook to enforce geofencing before allowing journey start
 */
export function useGeofenceGuard(
  vehicleId: string | undefined,
  maxDistanceMeters: number = 500
) {
  const geofence = useGeofencing(vehicleId, maxDistanceMeters);
  const [isChecking, setIsChecking] = useState(false);

  const validatePosition = useCallback(async (): Promise<boolean> => {
    setIsChecking(true);

    try {
      const result = await geofence.checkPosition();

      if (result.error) {
        toast.error('Erro de Geolocalização', {
          description: result.error,
        });
        return false;
      }

      if (!result.isWithinRange) {
        toast.error('Fora da área permitida', {
          description: `Você está a ${result.distance}m do veículo. Máximo permitido: ${maxDistanceMeters}m.`,
        });
        return false;
      }

      toast.success('Localização validada', {
        description: `Você está a ${result.distance}m do veículo.`,
      });
      return true;
    } finally {
      setIsChecking(false);
    }
  }, [geofence, maxDistanceMeters]);

  return {
    ...geofence,
    isChecking,
    validatePosition,
  };
}
