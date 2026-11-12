export type TankReading = {
  vehicle_plate: string;
  driver_name: string | null;
  data_timestamp: string;
  odometer: number | null;
  fuel_level: number | null;
  ignition_on: boolean | null;
};

export type TankDay = { plate: string; driver: string; day: string; km: number | null; liters: number | null; kml: number | null; excluded: number };

const dayOf = (timestamp: string) => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(new Date(timestamp));

/** Tank-derived consumption only. Rising tank levels and invalid intervals are excluded, never treated as consumption. */
export function computeTankDaily(rows: TankReading[]): TankDay[] {
  const byPlate = new Map<string, TankReading[]>();
  const days = new Map<string, TankDay>();
  for (const row of rows) {
    if (!Number.isFinite(Date.parse(row.data_timestamp))) continue;
    const list = byPlate.get(row.vehicle_plate) || [];
    list.push(row);
    byPlate.set(row.vehicle_plate, list);
    const day = dayOf(row.data_timestamp);
    const driver = row.driver_name || 'Sem motorista';
    const key = JSON.stringify([row.vehicle_plate, driver, day]);
    if (!days.has(key)) days.set(key, { plate: row.vehicle_plate, driver, day, km: null, liters: null, kml: null, excluded: 0 });
  }
  for (const list of byPlate.values()) {
    list.sort((a, b) => Date.parse(a.data_timestamp) - Date.parse(b.data_timestamp));
    for (let i = 1; i < list.length; i++) {
      const a = list[i - 1], b = list[i];
      if (a.data_timestamp === b.data_timestamp) continue;
      const day = dayOf(b.data_timestamp), driver = b.driver_name || 'Sem motorista';
      const result = days.get(JSON.stringify([b.vehicle_plate, driver, day]));
      if (!result) continue;
      if (dayOf(a.data_timestamp) !== day || (a.driver_name || 'Sem motorista') !== driver) continue;
      if (a.ignition_on !== true || b.ignition_on !== true) continue;
      if (a.fuel_level == null || b.fuel_level == null || a.odometer == null || b.odometer == null ||
          ![a.fuel_level, b.fuel_level, a.odometer, b.odometer].every(Number.isFinite) ||
          a.fuel_level < 0 || b.fuel_level < 0 || a.odometer < 0 || b.odometer < a.odometer || b.fuel_level > a.fuel_level) {
        result.excluded++;
        continue;
      }
      result.km = (result.km ?? 0) + b.odometer - a.odometer;
      result.liters = (result.liters ?? 0) + a.fuel_level - b.fuel_level;
    }
  }
  return [...days.values()].map(d => ({ ...d, kml: d.liters != null && d.liters > 0 ? (d.km ?? 0) / d.liters : null }))
    .sort((a, b) => b.day.localeCompare(a.day) || a.plate.localeCompare(b.plate));
}

export function tankPeriodAverage(days: TankDay[]): number | null {
  const valid = days.filter(d => d.km != null && d.liters != null && d.liters > 0);
  const liters = valid.reduce((sum, d) => sum + (d.liters ?? 0), 0);
  return liters > 0 ? valid.reduce((sum, d) => sum + (d.km ?? 0), 0) / liters : null;
}