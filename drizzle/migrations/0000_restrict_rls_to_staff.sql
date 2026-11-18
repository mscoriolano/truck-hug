CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin','manager','viewer'))
$$;
REVOKE EXECUTE ON FUNCTION public.is_staff(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.is_staff(uuid) TO authenticated;

-- Existing users keep access
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'admin' FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = u.id);

-- New signups no longer get automatic access
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN new;
END;
$$;

DO $$
DECLARE p record; t text;
  tbls text[] := ARRAY['alerts','driver_goals','driver_journey','driver_journey_compliance','driver_journey_events','driver_scores','driver_vehicle_assignments','drivers','driving_behavior_events','expense_categories','fuel_entries','geofence_zones','journey_entries','journey_legal_settings','maintenance_costs','maintenances','monthly_costs','monthly_performance','operational_phases','telemetry_alerts','telemetry_history','telemetry_settings','tire_management','tires','trip_statistics','trips','vehicle_can_data','vehicle_telemetry','vehicle_types','vehicles'];
BEGIN
  FOR p IN SELECT tablename, policyname, cmd FROM pg_policies
    WHERE schemaname='public' AND tablename = ANY(tbls) AND (qual='true' OR with_check='true')
  LOOP
    EXECUTE format('DROP POLICY %I ON public.%I', p.policyname, p.tablename);
    IF p.cmd = 'SELECT' OR p.cmd = 'DELETE' THEN
      EXECUTE format('CREATE POLICY %I ON public.%I FOR %s TO authenticated USING (public.is_staff(auth.uid()))', p.policyname, p.tablename, p.cmd);
    ELSIF p.cmd = 'INSERT' THEN
      EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()))', p.policyname, p.tablename);
    ELSE
      EXECUTE format('CREATE POLICY %I ON public.%I FOR %s TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()))', p.policyname, p.tablename, p.cmd);
    END IF;
  END LOOP;
END $$;

DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
CREATE POLICY "Users can view own or staff all profiles" ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_staff(auth.uid()));