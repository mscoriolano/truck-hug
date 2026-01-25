 # Integração TrucksControl - Documentação Completa
 
 ## 📡 Requisições XML Implementadas
 
 ### 1. RequestVeiculo (Sincronização de Veículos)
 
 **Função:** `truckscontrol-sync`  
 **Intervalo recomendado:** 5 minutos  
 **Arquivo:** `supabase/functions/truckscontrol-sync/index.ts`
 
 ```xml
 <?xml version="1.0" encoding="UTF-8"?>
 <RequestVeiculo>
   <login>SEU_USUARIO</login>
   <senha>SUA_SENHA</senha>
   <!-- Opcional: <alterados>1</alterados> para buscar apenas veículos alterados -->
 </RequestVeiculo>
 ```
 
 **O que faz:**
 - Busca todos os veículos espelhados
 - Atualiza odômetro (km) dos veículos
 - Cria automaticamente veículos novos detectados na API
 - Atualiza latitude, longitude, velocidade, ignição
 
 ---
 
 ### 2. RequestMensagemCB (Telemetria em Tempo Real)
 
 **Função:** `truckscontrol-telemetry`  
 **Intervalo recomendado:** 30 segundos  
 **Arquivo:** `supabase/functions/truckscontrol-telemetry/index.ts`
 
 ```xml
 <?xml version="1.0" encoding="UTF-8"?>
 <RequestMensagemCB>
   <login>SEU_USUARIO</login>
   <senha>SUA_SENHA</senha>
   <!-- Opcional: <veiID>499133</veiID> para buscar apenas 1 veículo -->
   <!-- Opcional: <atributos>all</atributos> ou atributos específicos -->
 </RequestMensagemCB>
 ```
 
 **O que faz:**
 - Busca mensagens de telemetria (GPS, velocidade, G-force)
 - Processa macros de jornada (M1, M2, M3, M4)
 - Cria eventos de jornada automaticamente
 - Atualiza status dos motoristas
 - Gera alertas de velocidade, freada brusca, curva brusca
 
 **Variantes testadas (fallback automático):**
 1. Sem atributos
 2. `<atributos>all</atributos>`
 3. `<atributos>veiID,placa,latitude,longitude,velocidade,ignicao,odometro,dataHora</atributos>`
 
 ---
 
 ## 🔍 Como Consultar os Logs (SEM gastar créditos)
 
 ### Opção 1: Pelo Painel Lovable
 
 1. **Acesse:** Settings → Backend → Edge Functions
 2. **Selecione a função:**
    - `truckscontrol-sync` - para logs de sincronização de veículos
    - `truckscontrol-telemetry` - para logs de telemetria
 3. **Clique em "View Logs"**
 4. **Você verá:**
    - `[truckscontrol-sync] start` - início da requisição
    - `[truckscontrol-sync] response bytes preview` - preview dos bytes recebidos
    - `[truckscontrol-sync] XML completo do primeiro veículo` - XML completo do primeiro veículo
    - `[truckscontrol-sync] finished` - resultado final
 
 ### Opção 2: Pelo Supabase (logs mais detalhados)
 
 1. **Acesse:** https://supabase.com/dashboard/project/eghqbrqyyszaubuwkrsb
 2. **Vá em:** Edge Functions → Logs
 3. **Filtre por função** e veja os logs em tempo real
 
 ### Opção 3: Via SQL (logs do PostgreSQL)
 
 ```sql
 -- Logs de autenticação e conexões
 SELECT * FROM postgres_logs 
 ORDER BY timestamp DESC 
 LIMIT 100;
 
 -- Logs das Edge Functions
 SELECT * FROM auth_logs 
 ORDER BY timestamp DESC 
 LIMIT 100;
 ```
 
 ---
 
 ## ⚠️ Problema Atual: Timeout da API TrucksControl
 
 **Sintoma:** Logs mostram `AbortError: The signal has been aborted` após 45-60 segundos
 
 **Causa:** A API TrucksControl está demorando mais de 45 segundos para responder
 
 **Evidências nos logs:**
 ```
 [truckscontrol-telemetry] unhandled error: AbortError: The signal has been aborted
     at AbortSignal.[[[signalAbort]]] (ext:deno_web/03_abort_signal.js:147:14)
     at AbortController.abort (ext:deno_web/03_abort_signal.js:304:30)
     at file:///var/tmp/sb-compile-edge-runtime/truckscontrol-telemetry/index.ts:280:49
 ```
 
 **Soluções implementadas:**
 - ✅ Timeout de 60 segundos (era 45s, aumentamos para 60s)
 - ✅ Multi-variant fallback (tenta 3 formatos de XML diferentes)
 - ✅ Descompactação ZIP/GZIP automática
 - ✅ Leitura de resposta limitada a 5MB
 
 **Próximos passos sugeridos:**
 1. Aumentar timeout para 90 segundos
 2. Contatar suporte TrucksControl sobre lentidão
 3. Implementar retry automático com backoff exponencial
 
 ---
 
 ## 📋 Requisições XML Disponíveis (Documentação TrucksControl)
 
 ### ✅ Implementadas (2/14)
 
 1. ✅ **RequestVeiculo** - Sincronização de veículos
 2. ✅ **RequestMensagemCB** - Telemetria em tempo real
 
 ### ❌ Não Implementadas (12/14)
 
 3. ❌ **RequestAlertasSoftware** - Alertas de software
 4. ❌ **RequestAcessorio** - Lista de acessórios disponíveis
 5. ❌ **RequestAcessorioVeiculo** - Acessórios instalados por veículo
 6. ❌ **RequestComando** - Envio de comandos aos veículos
 7. ❌ **RequestEspelhamento** - Gestão de espelhamento (aceitar/rejeitar)
 8. ❌ **RequestMacro** - Gestão de macros
 9. ❌ **RequestSpy** - Informações de equipamentos Spy
 10. ❌ **RequestMensagemSpy** - Mensagens de equipamentos Spy
 11. ❌ **RequestReferenciaEntrega** - Referências de entrega
 12. ❌ **RequestStatuscmie** - Status de comandos I.E.
 13. ❌ **RequestInteligenciaEmbarcada** - Gestão de I.E.
 14. ❌ **RequestSmartVisionCam** - Integração com câmeras MDVR
 15. ❌ **RequestTelemetria** - Relatórios de telemetria
 16. ❌ **RequestHorarioServidor** - Horário do servidor TrucksControl
 17. ❌ **RequestMotorista** - Informações de motoristas
 
 ---
 
 ## 🔧 Debug Mode
 
 ### Como ativar o modo debug:
 
 **Via API (teste manual):**
 ```bash
 curl -X POST https://sua-url.supabase.co/functions/v1/truckscontrol-sync \
   -H "Content-Type: application/json" \
   -d '{"debug": true, "includeSensitive": false}'
 ```
 
 **O que o debug mode retorna:**
 - XML da requisição (com senha mascarada)
 - Status HTTP da resposta
 - Content-Type da resposta
 - Preview do XML de resposta (até 50.000 caracteres)
 - Tamanho da resposta em bytes
 - Se a resposta foi descompactada (ZIP/GZIP)
 
 ---
 
 ## 📊 Sincronização Automática (pg_cron)
 
 **Configuração atual:**
 ```sql
 -- Roda a cada 5 minutos
 SELECT cron.schedule(
   'sync-truckscontrol',
   '*/5 * * * *',
   $$
   SELECT net.http_post(
     url := 'https://sua-url.supabase.co/functions/v1/truckscontrol-sync',
     headers := '{"Content-Type": "application/json"}'::jsonb,
     body := '{}'::jsonb
   );
   $$
 );
 ```
 
 **Como verificar se está rodando:**
 ```sql
 SELECT * FROM cron.job ORDER BY jobid DESC;
 SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
 ```
 
 ---
 
 ## 🎯 Próximas Implementações Prioritárias
 
 ### 1. RequestMotorista (Alta prioridade)
 ```xml
 <RequestMotorista>
   <login>?</login>
   <senha>?</senha>
 </RequestMotorista>
 ```
 **Por quê:** Sincronizar motoristas do rastreador com o sistema
 
 ### 2. RequestComando (Alta prioridade)
 ```xml
 <RequestComando>
   <login>?</login>
   <senha>?</senha>
   <veiID>?</veiID>
   <comando>?</comando>
 </RequestComando>
 ```
 **Por quê:** Enviar comandos aos veículos (bloqueio, desbloqueio, etc.)
 
 ### 3. RequestTelemetria (Média prioridade)
 ```xml
 <RequestTelemetria>
   <login>?</login>
   <senha>?</senha>
   <dtInicio>?</dtInicio>
   <dtFim>?</dtFim>
 </RequestTelemetria>
 ```
 **Por quê:** Relatórios históricos de telemetria
 
 ---
 
 ## 📞 Suporte TrucksControl
 
 **Contato:** suporte@truckscontrol.com.br  
 **Documentação completa:** Arquivo `HelpIntegracao6.7-3.pdf` (páginas 16-165)  
 **URL do WebService:** https://webservice.newrastreamentoonline.com.br
 
 ---
 
 ## 📝 Notas Importantes
 
 1. **Sempre use HTTPS** - HTTP não é mais aceito desde 04/09/2023
 2. **Respeite os intervalos** - Cada requisição tem um intervalo mínimo (ver tabela página 12 do PDF)
 3. **Máximo 30 mensagens por requisição** - API limita a quantidade de mensagens
 4. **Respostas são zipadas** - Sistema descompacta automaticamente (ZIP/GZIP)
 5. **Novos campos podem aparecer** - XML é extensível, não quebre se houver campos novos
 
 ---
 
 *Última atualização: 25/01/2026*