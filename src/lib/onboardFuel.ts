export interface FuelSignal {
  vehicle_plate: string;
  driver_id: string | null;
  driver_name: string | null;
  data_timestamp: string;
}

// Tank levels, refuelled litres and odometer snapshots are not onboard consumption.
export function onboardConsumptionAvailability(signals: FuelSignal[]) {
  const days = new Map<string, { day: string; plate: string; driver: string; readings: number }>();
  for (const signal of signals) {
    const timestamp = new Date(signal.data_timestamp);
    if (!Number.isFinite(timestamp.getTime())) continue;
    const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(timestamp);
    const key = `${day}|${signal.vehicle_plate}|${signal.driver_id ?? 'unknown'}`;
    const entry = days.get(key) ?? { day, plate: signal.vehicle_plate, driver: signal.driver_name ?? 'Não identificado', readings: 0 };
    entry.readings += 1;
    days.set(key, entry);
  }
  return [...days.values()].sort((a, b) => b.day.localeCompare(a.day) || a.plate.localeCompare(b.plate));
}

export function measuredFuelEfficiency(distanceKm: number | null, consumedLiters: number | null): number | null {
  if (distanceKm === null || consumedLiters === null || !Number.isFinite(distanceKm) || !Number.isFinite(consumedLiters) || distanceKm < 0 || consumedLiters <= 0) return null;
  return distanceKm / consumedLiters;
}