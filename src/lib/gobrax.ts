// Índice de Condução Econômica (ICE) — inspirado na metodologia Gobrax.
// Pilares: Faixa Verde/RPM 30%, Marcha Lenta 25%, Inércia/Banguela 20%, Segurança 25%.

export const ICE_WEIGHTS = { rpm: 0.3, idle: 0.25, inertia: 0.2, safety: 0.25 } as const;

/** Litros/hora estimados para caminhão pesado parado com motor ligado. */
export const IDLE_LITERS_PER_HOUR = 2;

export interface IceInput {
  km: number;               // distância no período (km)
  highRpmEvents: number;    // excesso de RPM / fora da faixa verde
  idleMinutes: number;      // minutos parado com motor ligado
  neutralEvents: number;    // banguela / inércia sem marcha
  speedingEvents: number;   // excesso de velocidade
  harshEvents: number;      // frenagem / aceleração brusca
}

export interface IcePillar {
  key: keyof typeof ICE_WEIGHTS;
  label: string;
  score: number;      // 0-100
  lostPoints: number; // pontos perdidos na nota final
}

export interface IceResult {
  score: number;
  pillars: IcePillar[];
  idleLiters: number;
  tier: 'ouro' | 'prata' | 'bronze' | 'reciclagem';
}

const clamp = (v: number) => Math.max(0, Math.min(100, v));
/** Eventos por 100 km (mínimo 100 km para não punir trajetos curtos). */
const per100 = (events: number, km: number) => (events / Math.max(km, 100)) * 100;

export function computeIce(i: IceInput): IceResult {
  const rpm = clamp(100 - per100(i.highRpmEvents, i.km) * 10);
  // cada 10 min de marcha lenta por 100 km tira 10 pontos do pilar
  const idle = clamp(100 - per100(i.idleMinutes, i.km));
  const inertia = clamp(100 - per100(i.neutralEvents, i.km) * 20);
  const safety = clamp(100 - per100(i.speedingEvents, i.km) * 10 - per100(i.harshEvents, i.km) * 10);

  const raw = { rpm, idle, inertia, safety };
  const labels = { rpm: 'Faixa Verde / RPM', idle: 'Marcha Lenta', inertia: 'Inércia / Banguela', safety: 'Condução Segura' };
  const pillars = (Object.keys(ICE_WEIGHTS) as (keyof typeof ICE_WEIGHTS)[]).map((key) => ({
    key,
    label: labels[key],
    score: Math.round(raw[key]),
    lostPoints: Math.round((100 - raw[key]) * ICE_WEIGHTS[key] * 10) / 10,
  }));
  const score = Math.round(pillars.reduce((a, p) => a + raw[p.key] * ICE_WEIGHTS[p.key], 0));
  return {
    score,
    pillars,
    idleLiters: Math.round((i.idleMinutes / 60) * IDLE_LITERS_PER_HOUR * 10) / 10,
    tier: iceTier(score),
  };
}

/** Régua de premiação: Ouro >= 90, Prata 80-89, Bronze 70-79, abaixo disso reciclagem. */
export function iceTier(score: number): IceResult['tier'] {
  if (score >= 90) return 'ouro';
  if (score >= 80) return 'prata';
  if (score >= 70) return 'bronze';
  return 'reciclagem';
}

/** Percentual do diesel economizado que vira bônus em cada faixa. */
export const TIER_BONUS_SHARE: Record<IceResult['tier'], number> = {
  ouro: 0.3, prata: 0.2, bronze: 0.1, reciclagem: 0,
};

/** Classifica evento/alerta (behavior ou rastreador) em um pilar. */
export function classifyEvent(type: string, title = ''): keyof Omit<IceInput, 'km' | 'idleMinutes'> | 'idle' | null {
  const t = `${type} ${title}`.toLowerCase();
  if (/banguela|in[eé]rcia|neutro|coast/.test(t)) return 'neutralEvents';
  if (/idle|parado|marcha lenta|ocioso/.test(t)) return 'idle';
  if (/rpm/.test(t)) return 'highRpmEvents';
  if (/speed|velocidade/.test(t)) return 'speedingEvents';
  if (/brusc|harsh|brake|frenag|accel|acelera/.test(t)) return 'harshEvents';
  return null;
}
