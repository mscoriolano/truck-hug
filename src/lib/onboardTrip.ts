/** Pure helpers for official D-1 onboard report rows (TrucksControl RequestTelemetriaRelatorio). */
export type ReportDay = {
  plate: string; driver: string; day: string;
  odmIni: number | null; odmFim: number | null; distancia: number | null;
  kml: number | null; velMedia: number | null;
  minutesMoving: number | null; minutesIdle: number | null;
  brakes: number | null; clutch: number | null;
};

/** Km of a day: odometer difference wins; falls back to reported distance (already km). */
export function dayKm(d: Pick<ReportDay, 'odmIni' | 'odmFim' | 'distancia'>): number | null {
  if (d.odmIni != null && d.odmFim != null && d.odmFim >= d.odmIni) return d.odmFim - d.odmIni;
  return d.distancia ?? null;
}

export function dayLiters(d: Pick<ReportDay, 'odmIni' | 'odmFim' | 'distancia' | 'kml'>): number | null {
  const km = dayKm(d);
  return km != null && d.kml && d.kml > 0 ? km / d.kml : null;
}

export type TripSummary = {
  days: number; km: number | null; liters: number | null; kml: number | null;
  avgSpeed: number | null; movingMinutes: number; idleMinutes: number;
  brakes: number; clutch: number; missingDays: number;
};

/** Consolidate days of one vehicle. Km = last odmFim - first odmIni (exact even if a day report is missing). */
export function summarizeTrip(days: ReportDay[], periodDays?: number): TripSummary {
  const list = [...days].sort((a, b) => a.day.localeCompare(b.day));
  const ini = list.map(d => d.odmIni).filter((v): v is number => v != null);
  const fim = list.map(d => d.odmFim).filter((v): v is number => v != null);
  const odoKm = ini.length && fim.length ? Math.max(...fim) - Math.min(...ini) : null;
  const sumKm = list.reduce((a, d) => a + (dayKm(d) ?? 0), 0);
  const km = odoKm != null && odoKm >= 0 ? odoKm : (sumKm || null);
  let lit = 0, kmWithKml = 0;
  for (const d of list) { const l = dayLiters(d); if (l != null) { lit += l; kmWithKml += dayKm(d) ?? 0; } }
  const kml = lit > 0 ? kmWithKml / lit : null;
  const liters = kml && km != null ? km / kml : null;
  const movingMinutes = list.reduce((a, d) => a + (d.minutesMoving ?? 0), 0);
  let wSpeed = 0, wMin = 0;
  for (const d of list) if (d.velMedia != null && d.minutesMoving) { wSpeed += d.velMedia * d.minutesMoving; wMin += d.minutesMoving; }
  const sp = list.map(d => d.velMedia).filter((v): v is number => v != null);
  const avgSpeed = wMin > 0 ? wSpeed / wMin : sp.length ? sp.reduce((a, b) => a + b, 0) / sp.length : null;
  return {
    days: list.length, km, liters, kml, avgSpeed, movingMinutes,
    idleMinutes: list.reduce((a, d) => a + (d.minutesIdle ?? 0), 0),
    brakes: list.reduce((a, d) => a + (d.brakes ?? 0), 0),
    clutch: list.reduce((a, d) => a + (d.clutch ?? 0), 0),
    missingDays: periodDays != null ? Math.max(0, periodDays - new Set(list.map(d => d.day)).size) : 0,
  };
}
