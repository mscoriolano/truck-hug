import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface OfflineJourneyEvent {
  id: string;
  driver_id: string;
  event_type: string;
  event_timestamp: string;
  vehicle_id?: string;
  vehicle_plate?: string;
  latitude?: number;
  longitude?: number;
  location_name?: string;
  mileage?: number;
  synced: boolean;
  sync_error?: string;
  created_at: string;
}

const STORAGE_KEY = 'truckhug_offline_journey_events';

/**
 * Hook to manage offline journey events with local storage fallback
 */
export function useOfflineJourney(driverId: string | undefined) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingEvents, setPendingEvents] = useState<OfflineJourneyEvent[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  // Load pending events from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const events = JSON.parse(stored) as OfflineJourneyEvent[];
        setPendingEvents(events.filter((e) => !e.synced && e.driver_id === driverId));
      } catch (e) {
        console.error('Error parsing offline events:', e);
      }
    }
  }, [driverId]);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('Conexão restaurada', {
        description: 'Sincronizando eventos pendentes...',
      });
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.warning('Sem conexão', {
        description: 'Os eventos serão salvos localmente e sincronizados quando a conexão for restaurada.',
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Auto-sync when coming online
  useEffect(() => {
    if (isOnline && pendingEvents.length > 0) {
      syncPendingEvents();
    }
  }, [isOnline]);

  /**
   * Save event locally (for offline use)
   */
  const saveEventLocally = useCallback(
    (event: Omit<OfflineJourneyEvent, 'id' | 'synced' | 'created_at'>) => {
      const newEvent: OfflineJourneyEvent = {
        ...event,
        id: crypto.randomUUID(),
        synced: false,
        created_at: new Date().toISOString(),
      };

      const stored = localStorage.getItem(STORAGE_KEY);
      const events: OfflineJourneyEvent[] = stored ? JSON.parse(stored) : [];
      events.push(newEvent);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(events));

      setPendingEvents((prev) => [...prev, newEvent]);

      return newEvent;
    },
    []
  );

  /**
   * Create a journey event (works offline and online)
   */
  const createJourneyEvent = useCallback(
    async (eventData: {
      event_type: string;
      event_timestamp?: string;
      vehicle_id?: string;
      vehicle_plate?: string;
      latitude?: number;
      longitude?: number;
      location_name?: string;
      mileage?: number;
    }) => {
      if (!driverId) {
        toast.error('Motorista não identificado');
        return null;
      }

      const event = {
        driver_id: driverId,
        event_type: eventData.event_type,
        event_timestamp: eventData.event_timestamp || new Date().toISOString(),
        vehicle_id: eventData.vehicle_id,
        vehicle_plate: eventData.vehicle_plate,
        latitude: eventData.latitude,
        longitude: eventData.longitude,
        location_name: eventData.location_name,
        mileage: eventData.mileage,
      };

      // If online, try to save directly to database
      if (isOnline) {
        try {
          const { data, error } = await supabase.from('driver_journey_events').insert({
            driver_id: event.driver_id,
            driver_name: '', // Will be filled by trigger or lookup
            event_type: event.event_type,
            event_timestamp: event.event_timestamp,
            vehicle_id: event.vehicle_id,
            vehicle_plate: event.vehicle_plate,
            location_name: event.location_name,
            mileage: event.mileage,
            source: 'driver_portal_pwa',
          });

          if (error) throw error;

          toast.success('Evento registrado!');
          return data;
        } catch (error) {
          console.error('Error saving event online:', error);
          // Fall back to offline storage
          const localEvent = saveEventLocally(event);
          toast.warning('Salvo localmente', {
            description: 'Será sincronizado quando possível.',
          });
          return localEvent;
        }
      } else {
        // Save locally
        const localEvent = saveEventLocally(event);
        toast.success('Salvo localmente', {
          description: 'Será sincronizado quando houver conexão.',
        });
        return localEvent;
      }
    },
    [driverId, isOnline, saveEventLocally]
  );

  /**
   * Sync all pending events to the database
   */
  const syncPendingEvents = useCallback(async () => {
    if (pendingEvents.length === 0 || isSyncing) return;

    setIsSyncing(true);
    let syncedCount = 0;
    let errorCount = 0;

    const stored = localStorage.getItem(STORAGE_KEY);
    const allEvents: OfflineJourneyEvent[] = stored ? JSON.parse(stored) : [];

    for (const event of pendingEvents) {
      try {
        const { error } = await supabase.from('driver_journey_events').insert({
          driver_id: event.driver_id,
          driver_name: '',
          event_type: event.event_type,
          event_timestamp: event.event_timestamp,
          vehicle_id: event.vehicle_id,
          vehicle_plate: event.vehicle_plate,
          location_name: event.location_name,
          mileage: event.mileage,
          source: 'driver_portal_pwa_synced',
        });

        if (error) throw error;

        // Mark as synced in localStorage
        const eventIndex = allEvents.findIndex((e) => e.id === event.id);
        if (eventIndex >= 0) {
          allEvents[eventIndex].synced = true;
          allEvents[eventIndex].sync_error = undefined;
        }
        syncedCount++;
      } catch (error) {
        console.error('Error syncing event:', error);
        // Mark sync error
        const eventIndex = allEvents.findIndex((e) => e.id === event.id);
        if (eventIndex >= 0) {
          allEvents[eventIndex].sync_error = (error as Error).message;
        }
        errorCount++;
      }
    }

    // Update localStorage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allEvents));

    // Update pending events
    setPendingEvents(allEvents.filter((e) => !e.synced && e.driver_id === driverId));

    setIsSyncing(false);

    if (syncedCount > 0) {
      toast.success(`${syncedCount} evento(s) sincronizado(s)!`);
    }
    if (errorCount > 0) {
      toast.error(`${errorCount} evento(s) com erro de sincronização`);
    }
  }, [pendingEvents, isSyncing, driverId]);

  /**
   * Clear synced events from localStorage (cleanup)
   */
  const clearSyncedEvents = useCallback(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const events: OfflineJourneyEvent[] = JSON.parse(stored);
      const pending = events.filter((e) => !e.synced);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(pending));
    }
  }, []);

  return {
    isOnline,
    isSyncing,
    pendingEvents,
    pendingCount: pendingEvents.length,
    createJourneyEvent,
    syncPendingEvents,
    clearSyncedEvents,
  };
}
