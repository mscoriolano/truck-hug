export type DailyReport = {
  veiID: string; date: string | null;
  distanciaKm: number | null; mediaConsumo: number | null; consumoTotal: number | null;
  consHoraMotor: number | null; odmIni: number | null; odmFim: number | null;
  velMedia: number | null; velMax: number | null; rpmMedio: number | null; rpmMax: number | null;
  tempMax: number | null; tempMedia: number | null; utilizacao: number | null;
  totalMotorLig: number | null; totalMotorDeslig: number | null;
  totalMotorLigMov: number | null; totalMotorLigPar: number | null;
  qtdFreio: number | null; qtdEmbreagem: number | null;
};

function tag(xml: string, name: string): string | null {
  const m = new RegExp(`<${name}>([^<]*)</${name}>`, "i").exec(xml);
  return m && m[1].trim() !== "" ? m[1].trim() : null;
}
export function num(v: string | null): number | null {
  if (v == null) return null;
  let s = v.trim();
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}
/** dd/mm/yyyy -> yyyy-mm-dd */
export function parseDate(v: string | null): string | null {
  const m = v?.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
}

export function parseRelatorio(xml: string): DailyReport[] {
  const date = parseDate(tag(xml, "dtHr"));
  const out: DailyReport[] = [];
  for (const m of xml.matchAll(/<Relatorio>([\s\S]*?)<\/Relatorio>/gi)) {
    const r = m[1];
    const veiID = tag(r, "veiID");
    if (!veiID) continue;
    const dist = num(tag(r, "distancia"));
    out.push({
      veiID, date,
      // TrucksControl envia <distancia> já em km (confirmado por odmFim - odmIni)
      distanciaKm: dist,
      mediaConsumo: num(tag(r, "mediaConsumo")), consumoTotal: num(tag(r, "consumoTotal")),
      consHoraMotor: num(tag(r, "consHoraMotor")), odmIni: num(tag(r, "odmIni")), odmFim: num(tag(r, "odmFim")),
      velMedia: num(tag(r, "velMedia")), velMax: num(tag(r, "velMax")),
      rpmMedio: num(tag(r, "rpmMedio")), rpmMax: num(tag(r, "rpmMax")),
      tempMax: num(tag(r, "tempMax")), tempMedia: num(tag(r, "tempMedia") ?? tag(r, "tempMed")),
      utilizacao: num(tag(r, "utilizacao")),
      totalMotorLig: num(tag(r, "totalMotorLig")), totalMotorDeslig: num(tag(r, "totalMotorDeslig")),
      totalMotorLigMov: num(tag(r, "totalMotorLigMov")), totalMotorLigPar: num(tag(r, "totalMotorLigPar")),
      qtdFreio: num(tag(r, "qtdFreio")), qtdEmbreagem: num(tag(r, "qtdEmbreagem")),
    });
  }
  return out;
}
