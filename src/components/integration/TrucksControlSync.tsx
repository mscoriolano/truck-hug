import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, CheckCircle, XCircle, Clock, Truck, MapPin, Fuel, AlertTriangle } from 'lucide-react';
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
  error?: string;
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
      
      if (data.success) {
        if (data.vehiclesReceived === 0 && data.journeyEventsReceived === 0) {
          toast.warning('Sincronização concluída', {
            description: 'Nenhum dado foi recebido da API. Verifique a URL base e endpoints.',
          });
        } else {
          toast.success('Sincronização concluída!', {
            description: `${data.vehiclesUpdated} veículos atualizados, ${data.journeyEntriesCreated} eventos criados`,
          });
        }
      }
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

  const getStatusBadge = () => {
    if (!lastSync) return <Badge variant="secondary">Aguardando</Badge>;
    if (!lastSync.success) return <Badge variant="destructive">Erro</Badge>;
    if (lastSync.vehiclesReceived === 0) return <Badge variant="outline" className="border-yellow-500 text-yellow-600">Sem dados</Badge>;
    return <Badge variant="default" className="bg-green-600">Conectado</Badge>;
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
          {getStatusBadge()}
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
          <div className="rounded-lg bg-muted p-3 text-sm space-y-2">
            <div className="flex items-center gap-2">
              {lastSync.success ? (
                lastSync.vehiclesReceived === 0 ? (
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                ) : (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                )
              ) : (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
              <span className="font-medium">Última sincronização</span>
            </div>
            <p className="text-muted-foreground">
              {new Date(lastSync.timestamp).toLocaleString('pt-BR')}
            </p>
            
            {lastSync.vehiclesReceived === 0 && lastSync.success && (
              <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded text-yellow-700 dark:text-yellow-400 text-xs">
                <p className="font-medium">⚠️ API respondeu sem dados</p>
                <p className="mt-1">Possíveis causas:</p>
                <ul className="list-disc ml-4 mt-1 space-y-0.5">
                  <li>URL base incorreta para sua conta</li>
                  <li>Endpoints da API diferentes</li>
                  <li>Credenciais válidas mas sem permissão</li>
                </ul>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div className="text-center p-2 bg-background rounded">
                <div className="text-lg font-bold">{lastSync.vehiclesReceived}</div>
                <div className="text-xs text-muted-foreground">Veículos Recebidos</div>
              </div>
              <div className="text-center p-2 bg-background rounded">
                <div className="text-lg font-bold">{lastSync.journeyEventsReceived}</div>
                <div className="text-xs text-muted-foreground">Eventos Recebidos</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="text-center p-2 bg-primary/10 rounded">
                <div className="text-lg font-bold text-primary">{lastSync.vehiclesUpdated}</div>
                <div className="text-xs text-muted-foreground">Atualizados no Sistema</div>
              </div>
              <div className="text-center p-2 bg-primary/10 rounded">
                <div className="text-lg font-bold text-primary">{lastSync.journeyEntriesCreated}</div>
                <div className="text-xs text-muted-foreground">Eventos Criados</div>
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
