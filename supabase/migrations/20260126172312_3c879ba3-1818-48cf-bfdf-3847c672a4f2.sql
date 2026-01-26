-- Adicionar coluna last_mld na tabela vehicle_telemetry para persistir o ID da última mensagem processada
ALTER TABLE public.vehicle_telemetry 
ADD COLUMN IF NOT EXISTS last_mld bigint DEFAULT 1;

-- Criar índice para busca rápida do maior mld por veículo
CREATE INDEX IF NOT EXISTS idx_vehicle_telemetry_last_mld ON public.vehicle_telemetry(vehicle_id, last_mld DESC);

-- Comentário explicativo
COMMENT ON COLUMN public.vehicle_telemetry.last_mld IS 'ID da última mensagem processada do TrucksControl (mld) para uso na próxima requisição RequestMensagemCB';