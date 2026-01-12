import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, CheckCircle, XCircle, Clock, Truck, MapPin, Fuel } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface SyncResult {
  success: boolean;
  timestamp: string;
  vehiclesReceived: number;
  vehiclesUpdated: number;
  journeyEventsReceived: number;
  journeyEntriesCreated: number;
  message: string;
}

export function TrucksControlSync() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<SyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSync = async () => {
    setIsSyncing(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('truckscontrol-sync');

      if (fnError) {
        throw fnError;
      }

      setLastSync(data as SyncResult);
      toast.success('Sincronização concluída!', {
        description: `${data.vehiclesUpdated} veículos atualizados, ${data.journeyEntriesCreated} eventos de jornada criados`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(message);
      toast.error('Erro na sincronização', {
        description: message,
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              TrucksControl
            </CardTitle>
            <CardDescription>
              Integração com sistema de rastreamento
            </CardDescription>
          </div>
          <Badge variant={lastSync?.success ? 'default' : 'secondary'}>
            {lastSync?.success ? 'Conectado' : 'Aguardando'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span>Localização</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>Jornada</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Fuel className="h-4 w-4 text-muted-foreground" />
            <span>Telemetria</span>
          </div>
        </div>

        {lastSync && (
          <div className="rounded-lg bg-muted p-3 text-sm space-y-1">
            <div className="flex items-center gap-2">
              {lastSync.success ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
              <span className="font-medium">Última sincronização</span>
            </div>
            <p className="text-muted-foreground">
              {new Date(lastSync.timestamp).toLocaleString('pt-BR')}
            </p>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div>
                <span className="text-muted-foreground">Veículos:</span>{' '}
                <span className="font-medium">{lastSync.vehiclesUpdated}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Eventos:</span>{' '}
                <span className="font-medium">{lastSync.journeyEntriesCreated}</span>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4" />
              <span className="font-medium">Erro na sincronização</span>
            </div>
            <p className="mt-1">{error}</p>
          </div>
        )}

        <Button 
          onClick={handleSync} 
          disabled={isSyncing}
          className="w-full"
        >
          {isSyncing ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Sincronizando...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Sincronizar Agora
            </>
          )}
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          A sincronização automática ocorre a cada 5 minutos
        </p>
      </CardContent>
    </Card>
  );
}
