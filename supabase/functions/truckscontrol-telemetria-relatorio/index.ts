import { createClient } from "npm:@supabase/supabase-js@2";
import { strFromU8 } from "npm:fflate@0.8.2";
import pako from "npm:pako@2.1.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { parseRelatorio } from "./parse.ts";

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const esc = (v: string) => v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function decode(bytes: Uint8Array): string {
  if (bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b) {
    try {
      const nameLen = bytes[26] | (bytes[27] << 8);
      const extraLen = bytes[28] | (bytes[29] << 8);
      const dataStart = 30 + nameLen + extraLen;
      const compression = bytes[8] | (bytes[9] << 8);
      if (compression === 8) return strFromU8(pako.inflateRaw(bytes.slice(dataStart)) as Uint8Array);
      if (compression === 0) return strFromU8(bytes.slice(dataStart));
    } catch (e) { console.error("[telemetria-relatorio] unzip failed", String(e)); }
    return "";
  }
  return strFromU8(bytes);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const user = Deno.env.get("TRUCKSCONTROL_USER");
    const pass = Deno.env.get("TRUCKSCONTROL_PASSWORD");
    if (!user || !pass) return json({ success: false, error: "Credenciais não configuradas" }, 500);
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const xmlReq = `<?xml version="1.0" encoding="UTF-8"?>
<RequestTelemetriaRelatorio>
  <login>${esc(user)}</login>
  <senha>${esc(pass)}</senha>
  <tID>1</tID>
</RequestTelemetriaRelatorio>`;
    console.log("[telemetria-relatorio] start");
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const text = await Promise.race([
      (async () => {
        const res = await fetch("https://webservice.newrastreamentoonline.com.br", {
          method: "POST", headers: { "Content-Type": "text/xml", "User-Agent": "Mozilla/5.0" }, body: xmlReq, signal: controller.signal,
        });
        if (!res.ok) throw new Error(`TrucksControl HTTP ${res.status}`);
        return decode(new Uint8Array(await res.arrayBuffer()));
      })(),
      new Promise<never>((_, rej) => { timer = setTimeout(() => { controller.abort(); rej(new Error("TrucksControl não respondeu em 45s")); }, 45_000); }),
    ]).finally(() => clearTimeout(timer));

    const reports = parseRelatorio(text);
    console.log("[telemetria-relatorio] relatórios:", reports.length, "preview:", text.slice(0, 300).replace(/<senha>.*?<\/senha>/g, ""));
    if (!reports.length) return json({ success: true, imported: 0, message: "Nenhum relatório disponível (D-1)", raw: text.slice(0, 500) });

    const { data: tel } = await supabase.from("vehicle_telemetry").select("vehicle_id, vehicle_plate, truckscontrol_id");
    const byVei = new Map<string, any>();
    for (const t of tel || []) if (t.truckscontrol_id) byVei.set(String(t.truckscontrol_id), t);

    const fallbackDate = new Date(Date.now() - 86400_000 - 3 * 3600_000).toISOString().slice(0, 10);
    let imported = 0, notFound = 0;
    for (const r of reports) {
      const v = byVei.get(r.veiID);
      if (!v?.vehicle_id) { notFound++; continue; }
      const day = r.date || fallbackDate;
      const ts = `${day}T12:00:00-03:00`;
      // Motorista predominante do dia (das leituras do rastreador)
      const { data: drv } = await supabase.from("vehicle_can_data").select("driver_name")
        .eq("vehicle_id", v.vehicle_id).gte("data_timestamp", `${day}T00:00:00-03:00`).lte("data_timestamp", `${day}T23:59:59-03:00`)
        .not("driver_name", "is", null).limit(1000);
      const counts = new Map<string, number>();
      for (const d of drv || []) counts.set(d.driver_name, (counts.get(d.driver_name) || 0) + 1);
      const driverName = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
      const kml = r.mediaConsumo ?? (r.distanciaKm && r.consumoTotal ? r.distanciaKm / r.consumoTotal : null);
      const row = {
        vehicle_id: v.vehicle_id, vehicle_plate: v.vehicle_plate, driver_name: driverName,
        data_timestamp: ts, ignition_on: true,
        odometer: r.odmFim, fuel_used_total: r.consumoTotal, onboard_consumption_kml: kml,
        rpm: r.rpmMedio, speed: r.velMedia, total_time_minutes: r.totalMotorLig ?? r.utilizacao,
        raw_data: { source: "telemetria_relatorio", report_date: day, ...r },
      };
      // Idempotente: remove relatório do mesmo dia/veículo antes de inserir
      await supabase.from("vehicle_can_data").delete()
        .eq("vehicle_id", v.vehicle_id).eq("data_timestamp", ts).contains("raw_data", { source: "telemetria_relatorio" });
      const { error } = await supabase.from("vehicle_can_data").insert(row);
      if (error) console.error("[telemetria-relatorio] insert", error.message); else imported++;
    }
    return json({ success: true, imported, notFound, total: reports.length });
  } catch (e) {
    console.error("[telemetria-relatorio] error", String(e));
    return json({ success: false, error: String(e instanceof Error ? e.message : e) }, 200);
  }
});
