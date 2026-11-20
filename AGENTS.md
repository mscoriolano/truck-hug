# Architecture rules
- Keep tank-curve calculations in a pure tested module and separate from onboard fuel metrics; tank level is not an onboard consumption counter.
- Resolve tracker alert descriptions during manual alert synchronization and repair generic historical titles using the returned catalog; never guess code meanings.- Trip consumption consolidation uses pure src/lib/onboardTrip.ts; trip km = last odmFim - first odmIni so missing report days stay exact.

- Fleet data RLS uses public.is_staff(auth.uid()) (admin/manager/viewer in user_roles); signups get no role automatically so access must be granted explicitly.
- Statistics/Fuel Summary aggregation lives in pure src/lib/fleetStats.ts (weighted km/L by liters, CO2 factor constant); panels only filter and render.
- Percentage gauges use a fixed 0–100 scale with a separate target marker; absent duration metrics stay unavailable, never inferred from event counts.
- Automatic sync uses one managed half-hour dispatcher; D-1 claims are persisted atomically by Brazilian report date and only complete after every returned report is saved. Partial failures retry without deleting prior rows.
