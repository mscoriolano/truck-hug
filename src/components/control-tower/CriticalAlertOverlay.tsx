import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, XCircle, Gauge, Battery, Eye, Clock, Volume2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CriticalAlert {
  id: string;
  vehicle_plate: string;
  driver_name?: string;
  alert_type: string;
  severity: string;
  title: string;
  message: string;
  event_timestamp: string;
  acknowledged?: boolean;
}

const alertConfig: Record<string, { icon: React.ElementType; color: string; bgColor: string }> = {
  high_rpm: { icon: Gauge, color: 'text-orange-500', bgColor: 'bg-orange-500/20' },
  excessive_rpm: { icon: Gauge, color: 'text-orange-500', bgColor: 'bg-orange-500/20' },
  battery_violation: { icon: Battery, color: 'text-red-500', bgColor: 'bg-red-500/20' },
  fatigue: { icon: Eye, color: 'text-purple-500', bgColor: 'bg-purple-500/20' },
  distraction: { icon: Eye, color: 'text-purple-500', bgColor: 'bg-purple-500/20' },
  journey_violation: { icon: Clock, color: 'text-yellow-500', bgColor: 'bg-yellow-500/20' },
  speeding: { icon: Gauge, color: 'text-red-500', bgColor: 'bg-red-500/20' },
};

export function CriticalAlertOverlay() {
  const [alerts, setAlerts] = useState<CriticalAlert[]>([]);
  const [currentAlert, setCurrentAlert] = useState<CriticalAlert | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    // Subscribe to realtime alerts
    const channel = supabase
      .channel('critical-alerts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'telemetry_alerts',
          filter: 'severity=eq.critical',
        },
        (payload) => {
          const alert = payload.new as CriticalAlert;
          setAlerts((prev) => [alert, ...prev]);
          setCurrentAlert(alert);
          setIsOpen(true);

          // Play sound if not muted
          if (!isMuted) {
            try {
              const audio = new Audio('/alert-sound.mp3');
              audio.volume = 0.7;
              audio.play().catch(() => {});
            } catch {}
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isMuted]);

  const handleAcknowledge = async () => {
    if (!currentAlert) return;

    await supabase
      .from('telemetry_alerts')
      .update({
        acknowledged: true,
        acknowledged_at: new Date().toISOString(),
      })
      .eq('id', currentAlert.id);

    setIsOpen(false);
    setCurrentAlert(null);
  };

  const config = currentAlert ? alertConfig[currentAlert.alert_type] || alertConfig.speeding : alertConfig.speeding;
  const Icon = config.icon;

  return (
    <>
      {/* Floating alert count badge */}
      {alerts.filter((a) => !a.acknowledged).length > 0 && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMuted(!isMuted)}
            className="bg-background/80 backdrop-blur-sm"
          >
            <Volume2 className={cn('h-4 w-4', isMuted && 'text-muted-foreground line-through')} />
          </Button>
          <Badge
            variant="destructive"
            className="animate-pulse text-lg px-4 py-2 cursor-pointer"
            onClick={() => {
              if (alerts[0]) {
                setCurrentAlert(alerts[0]);
                setIsOpen(true);
              }
            }}
          >
            <AlertTriangle className="h-5 w-5 mr-2" />
            {alerts.filter((a) => !a.acknowledged).length} Alertas Críticos
          </Badge>
        </div>
      )}

      {/* Critical Alert Modal */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl border-4 border-destructive bg-background p-0 overflow-hidden">
          {/* Pulsing header */}
          <div
            className={cn(
              'p-6 flex items-center gap-4',
              config.bgColor,
              'animate-pulse-neon'
            )}
          >
            <div className={cn('p-4 rounded-full', config.bgColor)}>
              <Icon className={cn('h-12 w-12', config.color)} />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-foreground">
                {currentAlert?.title || 'ALERTA CRÍTICO'}
              </h2>
              <p className="text-xl text-muted-foreground">
                {currentAlert?.vehicle_plate}
                {currentAlert?.driver_name && ` • ${currentAlert.driver_name}`}
              </p>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            <p className="text-xl">{currentAlert?.message}</p>

            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-5 w-5" />
              <span>
                {currentAlert?.event_timestamp &&
                  format(new Date(currentAlert.event_timestamp), "dd/MM/yyyy 'às' HH:mm:ss", {
                    locale: ptBR,
                  })}
              </span>
            </div>

            <div className="flex gap-4 pt-4">
              <Button onClick={handleAcknowledge} size="lg" className="flex-1 text-lg py-6">
                <XCircle className="h-6 w-6 mr-2" />
                Reconhecer Alerta
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* CSS for neon pulse animation */}
      <style>{`
        @keyframes pulse-neon {
          0%, 100% {
            box-shadow: 0 0 5px currentColor, 0 0 10px currentColor, 0 0 15px currentColor;
          }
          50% {
            box-shadow: 0 0 10px currentColor, 0 0 20px currentColor, 0 0 30px currentColor;
          }
        }
        .animate-pulse-neon {
          animation: pulse-neon 1s ease-in-out infinite;
        }
      `}</style>
    </>
  );
}
