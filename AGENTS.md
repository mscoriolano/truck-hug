# Architecture rules
- Keep tank-curve calculations in a pure tested module and separate from onboard fuel metrics; tank level is not an onboard consumption counter.
- Resolve tracker alert descriptions during manual alert synchronization and repair generic historical titles using the returned catalog; never guess code meanings.- Trip consumption consolidation uses pure src/lib/onboardTrip.ts; trip km = last odmFim - first odmIni so missing report days stay exact.
