import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

/**
 * Hook que escuta alterações em tempo real nas tabelas de telemetria e veículos
 * e invalida os caches do React Query automaticamente.
 */
export function useRealtimeTelemetry() {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Canal para atualizações em tempo real
    const channel = supabase
      .channel('realtime-telemetry')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'vehicle_telemetry' },
        (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          console.log('[Realtime] vehicle_telemetry changed:', payload.eventType);
          queryClient.invalidateQueries({ queryKey: ['vehicle_telemetry'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'vehicles' },
        (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          console.log('[Realtime] vehicles changed:', payload.eventType);
          queryClient.invalidateQueries({ queryKey: ['vehicles'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'telemetry_alerts' },
        (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          console.log('[Realtime] telemetry_alerts changed:', payload.eventType);
          queryClient.invalidateQueries({ queryKey: ['telemetry_alerts'] });
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'telemetry_history' },
        (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          console.log('[Realtime] telemetry_history INSERT:', payload.new);
          queryClient.invalidateQueries({ queryKey: ['telemetry_history'] });
        }
      )
      .subscribe((status) => {
        console.log('[Realtime] subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
