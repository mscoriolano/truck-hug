import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Bell, BellOff, BellRing, AlertTriangle } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { cn } from '@/lib/utils';

interface NotificationSettingsProps {
  className?: string;
}

export function NotificationSettings({ className }: NotificationSettingsProps) {
  const {
    permission,
    settings,
    requestPermission,
    disableNotifications,
    toggleCriticalOnly,
    isSupported,
  } = useNotifications();

  if (!isSupported) {
    return null;
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" className={cn("relative", className)}>
          {settings.enabled ? (
            <BellRing className="h-4 w-4" />
          ) : (
            <Bell className="h-4 w-4" />
          )}
          {settings.enabled && (
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-success rounded-full" />
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notificações Push
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Status */}
          <div className="rounded-lg bg-secondary p-4">
            <div className="flex items-center gap-3">
              {permission === 'granted' ? (
                <div className="p-2 rounded-full bg-success/20">
                  <BellRing className="w-5 h-5 text-success" />
                </div>
              ) : permission === 'denied' ? (
                <div className="p-2 rounded-full bg-destructive/20">
                  <BellOff className="w-5 h-5 text-destructive" />
                </div>
              ) : (
                <div className="p-2 rounded-full bg-warning/20">
                  <AlertTriangle className="w-5 h-5 text-warning" />
                </div>
              )}
              <div>
                <p className="font-medium text-foreground">
                  {permission === 'granted'
                    ? 'Notificações permitidas'
                    : permission === 'denied'
                    ? 'Notificações bloqueadas'
                    : 'Permissão não solicitada'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {permission === 'denied'
                    ? 'Habilite nas configurações do navegador'
                    : settings.enabled
                    ? 'Você receberá alertas críticos'
                    : 'Ative para receber alertas em tempo real'}
                </p>
              </div>
            </div>
          </div>

          {/* Enable/Disable */}
          {permission !== 'denied' && (
            <div className="space-y-4">
              {!settings.enabled ? (
                <Button onClick={requestPermission} className="w-full">
                  <BellRing className="w-4 h-4 mr-2" />
                  Ativar Notificações
                </Button>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="enabled" className="flex flex-col">
                      <span>Notificações ativas</span>
                      <span className="text-sm text-muted-foreground font-normal">
                        Receba alertas de telemetria
                      </span>
                    </Label>
                    <Switch
                      id="enabled"
                      checked={settings.enabled}
                      onCheckedChange={(checked) => {
                        if (!checked) disableNotifications();
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="critical-only" className="flex flex-col">
                      <span>Apenas alertas críticos</span>
                      <span className="text-sm text-muted-foreground font-normal">
                        Filtra avisos e informativos
                      </span>
                    </Label>
                    <Switch
                      id="critical-only"
                      checked={settings.criticalAlertsOnly}
                      onCheckedChange={toggleCriticalOnly}
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {/* Info */}
          <div className="rounded-lg border border-border p-3 text-sm text-muted-foreground">
            <p className="font-medium text-foreground mb-1">Tipos de alerta:</p>
            <ul className="space-y-1 list-disc list-inside">
              <li>Excesso de velocidade</li>
              <li>Frenagem/aceleração brusca</li>
              <li>Ociosidade prolongada</li>
              <li>Eventos de G-Force</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
