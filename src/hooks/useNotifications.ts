import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface NotificationSettings {
  enabled: boolean;
  criticalAlertsOnly: boolean;
}

const NOTIFICATION_STORAGE_KEY = 'notification_settings';

export const useNotifications = () => {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [settings, setSettings] = useState<NotificationSettings>({
    enabled: false,
    criticalAlertsOnly: true,
  });

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }

    const stored = localStorage.getItem(NOTIFICATION_STORAGE_KEY);
    if (stored) {
      setSettings(JSON.parse(stored));
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      toast.error('Seu navegador não suporta notificações');
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      
      if (result === 'granted') {
        const newSettings = { ...settings, enabled: true };
        setSettings(newSettings);
        localStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(newSettings));
        toast.success('Notificações ativadas!');
        return true;
      } else {
        toast.error('Permissão para notificações negada');
        return false;
      }
    } catch {
      toast.error('Erro ao solicitar permissão');
      return false;
    }
  }, [settings]);

  const disableNotifications = useCallback(() => {
    const newSettings = { ...settings, enabled: false };
    setSettings(newSettings);
    localStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(newSettings));
    toast.info('Notificações desativadas');
  }, [settings]);

  const toggleCriticalOnly = useCallback((value: boolean) => {
    const newSettings = { ...settings, criticalAlertsOnly: value };
    setSettings(newSettings);
    localStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(newSettings));
  }, [settings]);

  const showNotification = useCallback((title: string, body: string, severity: 'info' | 'warning' | 'critical') => {
    if (!settings.enabled || permission !== 'granted') return;
    if (settings.criticalAlertsOnly && severity !== 'critical') return;

    try {
      const notification = new Notification(title, {
        body,
        icon: '/favicon.ico',
        tag: `telemetry-${Date.now()}`,
        requireInteraction: severity === 'critical',
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      // Auto-close non-critical after 10 seconds
      if (severity !== 'critical') {
        setTimeout(() => notification.close(), 10000);
      }
    } catch {
      console.error('Failed to show notification');
    }
  }, [settings, permission]);

  // Subscribe to realtime telemetry alerts
  useEffect(() => {
    if (!settings.enabled || permission !== 'granted') return;

    const channel = supabase
      .channel('telemetry-alerts-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'telemetry_alerts',
        },
        (payload) => {
          const alert = payload.new as {
            title: string;
            message: string;
            severity: string;
            vehicle_plate: string;
          };
          
          const severity = alert.severity as 'info' | 'warning' | 'critical';
          
          if (settings.criticalAlertsOnly && severity !== 'critical') return;

          showNotification(
            `🚨 ${alert.title}`,
            `${alert.vehicle_plate}: ${alert.message}`,
            severity
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [settings, permission, showNotification]);

  return {
    permission,
    settings,
    requestPermission,
    disableNotifications,
    toggleCriticalOnly,
    showNotification,
    isSupported: 'Notification' in window,
  };
};
