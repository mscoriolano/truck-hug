import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { parseRelatorio } from "./parse.ts";

Deno.test("parses multi-vehicle D-1 report with meters->km and comma decimals", () => {
  const xml = `<ResponseTelemetriaRelatorio><DataHoraRelatorio><dtHr>12/11/2026</dtHr></DataHoraRelatorio>
  <Relatorio><veiID>10</veiID><distancia>250000</distancia><mediaConsumo>2,85</mediaConsumo><consumoTotal>87,7</consumoTotal><totalMotorLigPar>42</totalMotorLigPar></Relatorio>
  <Relatorio><veiID>11</veiID><distancia></distancia></Relatorio></ResponseTelemetriaRelatorio>`;
  const r = parseRelatorio(xml);
  assertEquals(r.length, 2);
  assertEquals(r[0].date, "2026-11-12");
  assertEquals(r[0].distanciaKm, 250);
  assertEquals(r[0].mediaConsumo, 2.85);
  assertEquals(r[0].consumoTotal, 87.7);
  assertEquals(r[0].totalMotorLigPar, 42);
  assertEquals(r[1].distanciaKm, null);
});
