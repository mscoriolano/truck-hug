import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, CheckCircle, XCircle, Clock, Truck, MapPin, Fuel, AlertTriangle, Download } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface SyncResult {
  success: boolean;
  timestamp: string;
  vehiclesReceived: number;
  vehiclesUpdated: number;
  vehiclesCreated?: number;
  vehiclesMileageUpdated?: number;
  journeyEventsReceived: number;
  journeyEntriesCreated: number;
  message: string;
  error?: string;
  debug?: {
    urlUsed?: string;
    attempts?: Array<{
      url: string;
      status: number;
      ok: boolean;
      contentType: string | null;
      wasZip: boolean;
      preview: string;
      truncated?: boolean;
      error?: string;
    }>;
    xml?: {
      requestXml?: string;
      requestXmlMasked?: string;
      responses?: Array<{
        url: string;
        status: number;
        ok: boolean;
        contentType: string | null;
        wasZip: boolean;
        truncated: boolean;
        bodyPreview: string;
      }>;
    };
  };
}

interface TelemetryResult {
  success: boolean;
  timestamp: string;
  error?: string;
  messagesReceived?: number;
  telemetryUpdated?: number;
  alertsCreated?: number;
  journeyEventsCreated?: number;
  debug?: {
    publicIp?: string | null;
    rawError?: string;
    networkType?: string;
    requestXmlMasked?: string;
  };
}

type DebugBundleRequestName = 'veiculo' | 'motoristas' | 'acessorios' | 'mensagemcb';

type DebugBundle = {
  urlUsed: string;
  publicIp?: string | null;
  requests: Array<{
    name: DebugBundleRequestName;
    requestXml?: string;
    requestXmlMasked: string;
    response: {
      url: string;
      status: number;
      ok: boolean;
      contentType: string | null;
      wasZip: boolean;
      truncated: boolean;
      bodyPreview: string;
      bodyLengthBytes: number;
    };
    apiError?: string | null;
  }>;
};

type DebugBundleResult = {
  success: boolean;
  timestamp: string;
  message?: string;
  error?: string;
  debugBundle?: DebugBundle;
};

function downloadTextFile(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function TrucksControlSync() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<SyncResult | null>(null);
  const [lastTelemetry, setLastTelemetry] = useState<TelemetryResult | null>(null);
  const [lastDebugBundle, setLastDebugBundle] = useState<DebugBundle | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [debugMode, setDebugMode] = useState(false);
  const [includeSensitive, setIncludeSensitive] = useState(false);

  const handleDebugComplete = async () => {
    setIsSyncing(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('truckscontrol-sync', {
        body: {
          debug: true,
          includeSensitive,
          debugAllRequests: true,
          onlyDebugRequests: true,
          debugRequests: ['veiculo', 'mensagemcb', 'motoristas', 'acessorios'],
        },
      });
      if (fnError) throw fnError;

      const res = data as DebugBundleResult;
      if (!res?.success || !res?.debugBundle) {
        throw new Error(res?.error || 'Não foi possível gerar o Debug Bundle');
      }
      setLastDebugBundle(res.debugBundle);
      toast.success('Debug completo gerado', {
        description: 'Agora o pacote inclui Veículo + Telemetria (MensagemCB) + Motoristas + Acessórios.',
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(message);
      toast.error('Erro ao gerar debug completo', { description: message });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    setError(null);

    try {
      const calls = [
        supabase.functions.invoke('truckscontrol-sync', {
          body: {
            debug: debugMode,
            includeSensitive,
          },
        }),
        supabase.functions.invoke('truckscontrol-telemetry', {
          body: {
            debug: debugMode,
          },
        }),
      ] as const;

      // Em modo debug, dispara também as demais requisições para você ver request/response em logs
      const extraDebugCalls = debugMode
        ? [
            supabase.functions.invoke('truckscontrol-motoristas', {
              body: { debug: true, includeSensitive },
            }),
            supabase.functions.invoke('truckscontrol-acessorios', {
              body: { debug: true, includeSensitive },
            }),
          ]
        : [];

      const results = await Promise.all([...calls, ...extraDebugCalls]);

      const syncRes = results[0];
      const telemetryRes = results[1];

      if (syncRes.error) {
        throw syncRes.error;
      }

      setLastSync(syncRes.data as SyncResult);
      if (!telemetryRes.error) {
        setLastTelemetry(telemetryRes.data as TelemetryResult);
      } else {
        // Mantém o erro de telemetria dentro do card (sem quebrar toda a sincronização)
        setLastTelemetry({
          success: false,
          timestamp: new Date().toISOString(),
          error: telemetryRes.error.message,
        });
      }

      const telemetryFirewallError =
        (telemetryRes.data as TelemetryResult | null)?.error?.includes('Erro de Firewall') ||
        telemetryRes.error?.message?.includes('Failed to fetch');

      if (telemetryFirewallError) {
        toast.error('Telemetria bloqueada', {
          description: 'Erro de Firewall (Conexão Recusada). Veja logs para IP de saída.',
        });
        return;
      }

      if (syncRes.data?.success) {
        if (syncRes.data.vehiclesReceived === 0 && syncRes.data.journeyEventsReceived === 0) {
          toast.warning('Sincronização concluída', {
            description: 'Nenhum dado foi recebido da API. Verifique a URL base e endpoints.',
          });
        } else {
          toast.success('Sincronização concluída!', {
            description: `${syncRes.data.vehiclesUpdated} veículos atualizados, ${syncRes.data.journeyEntriesCreated} eventos criados`,
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

  // Detecta se é erro de rate limit (código 7)
  const isRateLimitError = lastSync?.error?.includes('código 7') || lastSync?.error?.includes('tempo minimo');

  const isTelemetryFirewallError =
    lastTelemetry?.error?.includes('Erro de Firewall (Conexão Recusada)') ||
    lastTelemetry?.error?.includes('Failed to fetch') ||
    lastTelemetry?.debug?.networkType === 'FAILED_TO_FETCH' ||
    lastTelemetry?.debug?.networkType === 'CONNECTION_REFUSED' ||
    lastTelemetry?.debug?.networkType === 'TLS_HANDSHAKE_FAILED';

  const getStatusBadge = () => {
    if (!lastSync) return <Badge variant="secondary">Aguardando</Badge>;
    if (isTelemetryFirewallError) return <Badge variant="destructive">Erro de Firewall</Badge>;
    if (isRateLimitError) {
      return (
        <Badge variant="outline" className="border-amber-500 text-amber-600">
          Aguarde
        </Badge>
      );
    }
    if (!lastSync.success) return <Badge variant="destructive">Erro</Badge>;
    if (lastSync.vehiclesReceived === 0)
      return (
        <Badge variant="outline" className="border-yellow-500 text-yellow-600">
          Sem dados
        </Badge>
      );
    return (
      <Badge variant="default" className="bg-green-600">
        Conectado
      </Badge>
    );
  };

  const canDownload = useMemo(() => {
    if (lastDebugBundle?.requests?.length) return true;
    return Boolean(lastSync?.debug?.xml?.requestXmlMasked || lastSync?.debug?.xml?.responses?.length);
  }, [lastDebugBundle, lastSync]);

  const buildSupportBundle = () => {
    if (lastDebugBundle?.requests?.length) {
      const ts = new Date().toISOString().replace(/:/g, '-');
      const content = [
        `# TrucksControl - Debug Bundle (Completo)`,
        `timestamp: ${new Date().toISOString()}`,
        `urlUsed: ${lastDebugBundle.urlUsed}`,
        `publicIp: ${lastDebugBundle.publicIp ?? '—'}`,
        '',
        ...lastDebugBundle.requests.flatMap((r) => {
          const titleMap: Record<DebugBundleRequestName, string> = {
            veiculo: 'Veículo (RequestVeiculo)',
            mensagemcb: 'Telemetria (RequestMensagemCB)',
            motoristas: 'Motoristas (RequestMotorista)',
            acessorios: 'Acessórios (RequestAcessorio)',
          };
          return [
            `## ${titleMap[r.name]}`,
            r.apiError ? `apiError: ${r.apiError}` : 'apiError: —',
            '',
            '### REQUEST XML',
            includeSensitive ? (r.requestXml || r.requestXmlMasked) : r.requestXmlMasked,
            '',
            '### RESPONSE (preview)',
            `url: ${r.response.url}`,
            `status: ${r.response.status}`,
            `ok: ${String(r.response.ok)}`,
            `content-type: ${r.response.contentType ?? '—'}`,
            `zip: ${String(r.response.wasZip)}`,
            `truncated: ${String(r.response.truncated)}`,
            `bytes: ${String(r.response.bodyLengthBytes)}`,
            '',
            r.response.bodyPreview,
            '',
          ];
        }),
      ].join('\n');

      downloadTextFile(`truckscontrol-debug-completo-${ts}.txt`, content);
      return;
    }

    const ts = lastSync?.timestamp
      ? new Date(lastSync.timestamp).toISOString().replace(/:/g, '-')
      : new Date().toISOString().replace(/:/g, '-');
    const request = includeSensitive
      ? lastSync?.debug?.xml?.requestXml
      : lastSync?.debug?.xml?.requestXmlMasked;

    const responses = lastSync?.debug?.xml?.responses ?? [];

    const content = [
      `# TrucksControl - Debug Bundle`,
      `timestamp: ${lastSync?.timestamp ?? '—'}`,
      `success: ${String(lastSync?.success)}`,
      `message: ${lastSync?.message ?? '—'}`,
      `error: ${lastSync?.error ?? '—'}`,
      `urlUsed: ${lastSync?.debug?.urlUsed ?? '—'}`,
      '',
      '## REQUEST XML',
      request ?? '(não coletado - ative Modo Debug e sincronize novamente)',
      '',
      '## RESPONSES (preview)',
      responses.length
        ? responses
            .map((r, i) =>
              [
                `--- Response ${i + 1} ---`,
                `url: ${r.url}`,
                `status: ${r.status}`,
                `ok: ${String(r.ok)}`,
                `content-type: ${r.contentType ?? '—'}`,
                `zip: ${String(r.wasZip)}`,
                `truncated: ${String(r.truncated)}`,
                '',
                r.bodyPreview,
                '',
              ].join('\n'),
            )
            .join('\n')
        : '(nenhuma resposta coletada)',
      '',
      '## ATTEMPTS (resumo)',
      (lastSync?.debug?.attempts ?? []).length
        ? (lastSync?.debug?.attempts ?? [])
            .map((a) =>
              `${a.url} | status=${a.status} | ok=${a.ok} | zip=${a.wasZip} | truncated=${String(a.truncated ?? false)} | content-type=${a.contentType ?? '—'} | error=${a.error ?? ''}`,
            )
            .join('\n')
        : '(sem tentativas)',
      '',
    ].join('\n');

    downloadTextFile(`truckscontrol-debug-${ts}.txt`, content);
  };

  const downloadRequestXml = () => {
    const ts = lastSync?.timestamp
      ? new Date(lastSync.timestamp).toISOString().replace(/:/g, '-')
      : new Date().toISOString().replace(/:/g, '-');
    const xml = includeSensitive
      ? lastSync?.debug?.xml?.requestXml
      : lastSync?.debug?.xml?.requestXmlMasked;

    downloadTextFile(`truckscontrol-request-${ts}.xml`, xml || '');
  };

  const downloadFirstResponse = () => {
    const ts = lastSync?.timestamp
      ? new Date(lastSync.timestamp).toISOString().replace(/:/g, '-')
      : new Date().toISOString().replace(/:/g, '-');
    const r = lastSync?.debug?.xml?.responses?.[0];
    downloadTextFile(`truckscontrol-response-${ts}.xml`, r?.bodyPreview || '');
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
            <CardDescription>Integração com sistema de rastreamento</CardDescription>
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

        <div className="rounded-lg border border-border p-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Switch checked={debugMode} onCheckedChange={setDebugMode} id="tc-debug" />
                <Label htmlFor="tc-debug">Modo Debug</Label>
              </div>
              <p className="text-xs text-muted-foreground">
                Coleta e permite baixar o XML bruto (requisição/resposta) para enviar ao suporte.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={includeSensitive}
                onCheckedChange={setIncludeSensitive}
                id="tc-sensitive"
                disabled={!debugMode}
              />
              <Label htmlFor="tc-sensitive" className={!debugMode ? 'text-muted-foreground' : ''}>
                Incluir credenciais
              </Label>
            </div>
          </div>

          {debugMode && canDownload ? (
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <Button
                variant="default"
                onClick={handleDebugComplete}
                className="w-full sm:w-auto"
                disabled={isSyncing}
              >
                <RefreshCw className={isSyncing ? 'mr-2 h-4 w-4 animate-spin' : 'mr-2 h-4 w-4'} />
                Executar Debug Completo
              </Button>
              <Button variant="secondary" onClick={buildSupportBundle} className="w-full sm:w-auto">
                <Download className="mr-2 h-4 w-4" />
                Baixar pacote p/ suporte
              </Button>
              <Button variant="outline" onClick={downloadRequestXml} className="w-full sm:w-auto">
                Baixar XML requisição
              </Button>
              <Button variant="outline" onClick={downloadFirstResponse} className="w-full sm:w-auto">
                Baixar XML resposta
              </Button>
            </div>
          ) : null}
        </div>

        {lastSync && (
          <div className="space-y-2 rounded-lg bg-muted p-3 text-sm">
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

            <p className="text-muted-foreground">{new Date(lastSync.timestamp).toLocaleString('pt-BR')}</p>

            {isRateLimitError ? (
              <div className="rounded-lg bg-amber-500/10 p-3 text-amber-700 dark:text-amber-400">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span className="font-medium">Limite de requisições atingido</span>
                </div>
                <p className="mt-1 text-sm">
                  A API do TrucksControl possui um intervalo mínimo entre requisições. 
                  Aguarde alguns minutos e tente novamente. A sincronização automática continuará funcionando normalmente.
                </p>
              </div>
            ) : (
              <p className={lastSync.success ? 'text-muted-foreground' : 'text-destructive'}>{lastSync.message}</p>
            )}

            {!lastSync.success && !isRateLimitError && lastSync.debug?.attempts?.length ? (
              <div className="mt-2 rounded bg-background p-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Detalhes do erro (API)</span>
                  <span className="text-muted-foreground">URL usada: {lastSync.debug?.urlUsed ?? '—'}</span>
                </div>
                <div className="mt-2 space-y-2">
                  {lastSync.debug.attempts.map((a, idx) => (
                    <div key={idx} className="rounded border border-border p-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="break-all font-medium">{a.url}</span>
                        <span className="text-muted-foreground">
                          status {a.status} • {a.ok ? 'ok' : 'falha'} • {a.wasZip ? 'zip' : 'texto'}
                          {a.truncated ? ' • truncado' : ''}
                        </span>
                      </div>
                      <div className="mt-1 text-muted-foreground">content-type: {a.contentType ?? '—'}</div>
                      {a.error ? (
                        <pre className="mt-1 whitespace-pre-wrap text-destructive">{a.error}</pre>
                      ) : (
                        <pre className="mt-1 whitespace-pre-wrap">{a.preview}</pre>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="mt-2 grid grid-cols-2 gap-2">
              <div className="rounded bg-background p-2 text-center">
                <div className="text-lg font-bold">{lastSync.vehiclesReceived}</div>
                <div className="text-xs text-muted-foreground">Veículos Recebidos</div>
              </div>
              <div className="rounded bg-background p-2 text-center">
                <div className="text-lg font-bold">{lastSync.journeyEventsReceived}</div>
                <div className="text-xs text-muted-foreground">Eventos Recebidos</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded bg-primary/10 p-2 text-center">
                <div className="text-lg font-bold text-primary">{lastSync.vehiclesUpdated}</div>
                <div className="text-xs text-muted-foreground">Já Cadastrados</div>
              </div>
              <div className="rounded bg-green-500/10 p-2 text-center">
                <div className="text-lg font-bold text-green-600">{lastSync.vehiclesCreated || 0}</div>
                <div className="text-xs text-muted-foreground">Novos Criados</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded bg-blue-500/10 p-2 text-center">
                <div className="text-lg font-bold text-blue-600">{lastSync.vehiclesMileageUpdated || 0}</div>
                <div className="text-xs text-muted-foreground">KM Atualizados</div>
              </div>
              <div className="rounded bg-primary/10 p-2 text-center">
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

        <Button onClick={handleSync} disabled={isSyncing} className="w-full">
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

        <p className="text-center text-xs text-muted-foreground">A sincronização automática ocorre a cada 5 minutos</p>
      </CardContent>
    </Card>
  );
}

