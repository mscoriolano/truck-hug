CREATE TABLE public.telemetry_report_sync (report_day date PRIMARY KEY, status text NOT NULL DEFAULT 'pending', attempts integer NOT NULL DEFAULT 0, started_at timestamptz, completed_at timestamptz, imported integer NOT NULL DEFAULT 0, last_error text);
GRANT SELECT ON public.telemetry_report_sync TO authenticated;
GRANT ALL ON public.telemetry_report_sync TO service_role;
ALTER TABLE public.telemetry_report_sync ENABLE ROW LEVEL SECURITY;
CREATE POLICY staff_read ON public.telemetry_report_sync FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE FUNCTION public.claim_telemetry_report(p_day date, p_force boolean DEFAULT false) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE claimed date;
BEGIN
 INSERT INTO public.telemetry_report_sync(report_day, status, attempts, started_at) VALUES(p_day, 'running', 1, now())
 ON CONFLICT (report_day) DO UPDATE SET status='running', attempts=telemetry_report_sync.attempts+1, started_at=now(), last_error=null
 WHERE (p_force OR telemetry_report_sync.status <> 'completed') AND (telemetry_report_sync.status <> 'running' OR telemetry_report_sync.started_at < now()-interval '10 minutes')
 RETURNING report_day INTO claimed;
 RETURN claimed IS NOT NULL;
END; $$;
REVOKE ALL ON FUNCTION public.claim_telemetry_report(date, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_telemetry_report(date, boolean) TO service_role;
CREATE UNIQUE INDEX telemetry_daily_report_vehicle ON public.vehicle_can_data(vehicle_id, data_timestamp) WHERE raw_data->>'source' = 'telemetria_relatorio';