-- Habilitar extensões necessárias para cron job
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Comentário: O cron job abaixo será configurado via SQL INSERT separado
-- pois precisa das credenciais específicas do projeto