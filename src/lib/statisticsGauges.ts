/** Targets are percentages on a fixed 0–100 scale, never normalization divisors. */
export const DEFAULT_PERCENT_TARGET = 0;
export const GOAL_LABELS = ['Inércia (Indicadores)', 'Faixa Extra Econômica', 'Faixa Verde 1', 'Faixa Verde 2', 'Turbo Ideal', 'Carga Motor Ideal'];
export const LIMIT_LABELS = ['Tempo Máximo de Veículo Parado com Motor Ligado', 'Excesso de RPM', 'Excesso de Velocidade na Chuva', 'Aceleração Brusca (RPM)', 'Chuva', 'Excesso de RPM com Freio Motor Desativado', 'Faixa Amarela', 'Excesso Carga Motor', 'Excesso de Pressionamento de Pedal Acelerador', 'Uso do Piloto Automático', 'Inércia - Sem Piloto Automático', 'Excesso de Velocidade', 'Frenagem Brusca'];
export function timePercentage(part: number | null, total: number | null): number | null {
  if (part == null || total == null || total <= 0 || part < 0 || part > total) return null;
  return part / total * 100;
}
export function gaugePosition(value: number): number { return Math.max(0, Math.min(100, value)); }