CREATE OR REPLACE FUNCTION public.claim_telemetry_report(p_day date, p_force boolean DEFAULT false) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE claimed date;
BEGIN
 INSERT INTO public.telemetry_report_sync(report_day, status, attempts, started_at) VALUES(p_day, 'running', 1, now())
 ON CONFLICT (report_day) DO UPDATE SET status='running', attempts=telemetry_report_sync.attempts+1, started_at=now(), last_error=null
 WHERE (p_force OR telemetry_report_sync.status <> 'completed') AND (telemetry_report_sync.status <> 'running' OR telemetry_report_sync.started_at < now()-interval '10 minutes') AND (telemetry_report_sync.last_error IS NULL OR telemetry_report_sync.last_error NOT LIKE '%código 7:%' OR telemetry_report_sync.started_at < now()-interval '60 minutes')
 RETURNING report_day INTO claimed;
 RETURN claimed IS NOT NULL;
END; $$;
REVOKE ALL ON FUNCTION public.claim_telemetry_report(date, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_telemetry_report(date, boolean) TO service_role;