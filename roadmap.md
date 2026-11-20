# Telemetry adjustments
- [x] Apply automatic D-1 retries every 30 minutes after 05:00 BRT, with completion and overlap protection.
- [x] Replace Statistics goals/limits with percentage gauges and explicit target values; preserve unavailable data.
- [x] Test retry rules and percentage calculations and verify live screens.
- [ ] Confirm a completed unattended D-1 import: today's real request timed out at TrucksControl after 110 seconds; persisted as pending for retry.
- [x] Implement tracker catalog translation and repair existing generic titles during manual synchronization.
- [x] Show daily and period tank-derived km/L separately from onboard consumption; six calculation/parser tests passed.
- [x] Validate authenticated desktop/mobile consumption screen and preservation of onboard view.
- [ ] Confirm live catalog names: TrucksControl description request timed out after 28 seconds; no titles could be resolved.
- [ ] Confirm tank-derived values with vehicle readings: stored CAN data currently has no lt values; requires TrucksControl to return valid liters/odometer pairs.