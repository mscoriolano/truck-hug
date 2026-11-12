import type { TankReading } from './tankConsumption';

export type CurvePoint = { t: number; ts: string; liters: number; odometer: number | null; driver: string; ignition: boolean | null };
export type CurveEventKind = 'refuel' | 'theft' | 'high_consumption';
export type CurveEvent = { kind: CurveEventKind; ts: string; driver: string; odometer: number | null; deltaLiters: number; km: number | null; liters: number };

export const REFUEL_MIN_LITERS = 30;
export const THEFT_MIN_LITERS = 20;
/** A drop larger than this many liters per km driven is not explained by driving. */
export const THEFT_MAX_L_PER_KM = 2;
export const HIGH_CONSUMPTION_MIN_KM = 5;

/** Tank level curve and anomalies from <lt>/<odm> readings. Tank level is not an onboard consumption counter. */
export function buildFuelCurve(rows: TankReading[], highFactor = 1.6) {
  const points: CurvePoint[] = rows
    .filter(r => r.fuel_level != null && Number.isFinite(r.fuel_level) && r.fuel_level >= 0 && Number.isFinite(Date.parse(r.data_timestamp)))
    .map(r => ({ t: Date.parse(r.data_timestamp), ts: r.data_timestamp, liters: Number(r.fuel_level), odometer: r.odometer, driver: r.driver_name || 'Sem motorista', ignition: r.ignition_on }))
    .sort((a, b) => a.t - b.t);
  const events: CurveEvent[] = [];
  const segs: { i: number; lpk: number; km: number; l: number }[] = [];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i];
    const delta = b.liters - a.liters;
    const km = a.odometer != null && b.odometer != null && b.odometer >= a.odometer ? b.odometer - a.odometer : null;
    if (delta >= REFUEL_MIN_LITERS) {
      events.push({ kind: 'refuel', ts: b.ts, driver: b.driver, odometer: b.odometer, deltaLiters: delta, km, liters: b.liters });
    } else if (-delta >= THEFT_MIN_LITERS && (km == null || -delta / Math.max(km, 0.1) > THEFT_MAX_L_PER_KM)) {
      events.push({ kind: 'theft', ts: b.ts, driver: b.driver, odometer: b.odometer, deltaLiters: delta, km, liters: b.liters });
    } else if (delta < 0 && km != null && km > 0) {
      segs.push({ i, lpk: -delta / km, km, l: -delta });
    }
  }
  const totKm = segs.reduce((s, x) => s + x.km, 0), totL = segs.reduce((s, x) => s + x.l, 0);
  const avg = totKm > 0 ? totL / totKm : 0;
  if (avg > 0) for (const s of segs) {
    if (s.km >= HIGH_CONSUMPTION_MIN_KM && s.lpk > avg * highFactor) {
      const b = points[s.i];
      events.push({ kind: 'high_consumption', ts: b.ts, driver: b.driver, odometer: b.odometer, deltaLiters: -s.l, km: s.km, liters: b.liters });
    }
  }
  events.sort((x, y) => Date.parse(x.ts) - Date.parse(y.ts));
  return { points, events, avgKmPerLiter: avg > 0 ? 1 / avg : null };
}
