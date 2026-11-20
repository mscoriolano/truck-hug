/** Pure aggregation for Statistics and Fuel Summary panels (official D-1 report rows). */
export type StatDay = {
  plate: string;
  driver: string;
  day: string; // yyyy-mm-dd
  km: number | null;
  kml: number | null;
  velMedia: number | null;
  odmFim: number | null;
  consHoraMotor: number | null;
  minutesOn: number | null;
  minutesMoving: number | null;
  minutesIdle: number | null;
};

/** kg of CO2 per liter of diesel (TrucksControl panel uses the same factor). */
export const CO2_KG_PER_LITER = 2.5824;

export const dayLitersOf = (d: Pick<StatDay, "km" | "kml">) =>
  d.km != null && d.kml && d.kml > 0 ? d.km / d.kml : null;

export type Agg = {
  km: number;
  liters: number;
  kml: number | null;
  avgSpeed: number | null;
  odometer: number | null;
  consHora: number | null;
  minutesOn: number;
  minutesMoving: number;
  minutesIdle: number;
  idlePct: number | null;
  movingPct: number | null;
  co2Kg: number;
};

export function aggregate(days: StatDay[]): Agg {
  let km = 0,
    liters = 0,
    kmL = 0,
    wS = 0,
    wM = 0,
    on = 0,
    mov = 0,
    idle = 0,
    ch = 0,
    chN = 0;
  let odo: number | null = null;
  for (const d of days) {
    km += d.km ?? 0;
    const l = dayLitersOf(d);
    if (l != null) {
      liters += l;
      kmL += d.km ?? 0;
    }
    if (d.velMedia != null && d.minutesMoving) {
      wS += d.velMedia * d.minutesMoving;
      wM += d.minutesMoving;
    }
    on += d.minutesOn ?? 0;
    mov += d.minutesMoving ?? 0;
    idle += d.minutesIdle ?? 0;
    if (d.consHoraMotor != null) {
      ch += d.consHoraMotor;
      chN++;
    }
    if (d.odmFim != null && (odo == null || d.odmFim > odo)) odo = d.odmFim;
  }
  const base = mov + idle;
  return {
    km,
    liters,
    kml: liters > 0 ? kmL / liters : null,
    avgSpeed: wM > 0 ? wS / wM : null,
    odometer: odo,
    consHora: chN ? ch / chN : null,
    minutesOn: on,
    minutesMoving: mov,
    minutesIdle: idle,
    idlePct: base > 0 ? (idle / base) * 100 : null,
    movingPct: base > 0 ? (mov / base) * 100 : null,
    co2Kg: liters * CO2_KG_PER_LITER,
  };
}

/** Weighted average price per liter from fuel entries. */
export function avgPricePerLiter(entries: { liters: number; total_cost: number }[]): number | null {
  const l = entries.reduce((a, e) => a + Number(e.liters || 0), 0);
  const c = entries.reduce((a, e) => a + Number(e.total_cost || 0), 0);
  return l > 0 ? c / l : null;
}

/** Monthly weighted km/L, ordered by month key yyyy-mm. */
export function monthlyKml(days: StatDay[]): { month: string; km: number; liters: number; kml: number | null }[] {
  const m = new Map<string, StatDay[]>();
  for (const d of days) {
    const k = d.day.slice(0, 7);
    m.set(k, [...(m.get(k) || []), d]);
  }
  return [...m.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, list]) => {
      const a = aggregate(list);
      return { month, km: a.km, liters: a.liters, kml: a.kml };
    });
}

/**
 * Score 0–100 (alinhado à escala do Grupo Padrão TrucksControl).
 * Pondera a eficiência de consumo (meta km/L) com penalização pelo percentual de ociosidade.
 * O saldo restante (100 - Pontuação) compõe os "Pontos a Melhorar".
 */
export function rankScore(a: Agg, targetKml: number = 2.2): number | null {
  if (a.kml == null || a.km === 0) return null;
  const effRatio = a.kml / targetKml;
  const baseKmlPoints = effRatio * 7.5;
  const idleShare = a.idlePct != null ? Math.min(1, Math.max(0, a.idlePct / 100)) : 0.15;
  const idlePenalty = idleShare * 2.5;
  const score = Math.max(0.5, Math.min(100, baseKmlPoints - idlePenalty));
  return Math.round(score * 100) / 100;
}
