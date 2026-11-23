import { createClient } from "npm:@supabase/supabase-js@2";
import { strFromU8 } from "npm:fflate@0.8.2";
import pako from "npm:pako@2.1.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { parseRelatorio } from "./parse.ts";
import { authenticateCronRequest } from "../_shared/cron-auth.ts";
import { authenticateSync } from "../_shared/request-auth.ts";
import { reportDay, reportComplete, reportDue } from "../_shared/syncPolicy.ts";

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
    } catch (e) {
      console.error("[telemetria-relatorio] unzip failed", String(e));
    }
    return "";
  }
  return strFromU8(bytes);
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const expectedDay = reportDay(new Date());
  let claimed = false;
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return json({ success: false, error: "Configuração ausente" }, 500);
  const supabase = createClient(url, key);
  try {
    const { data: lock, error: lockError } = await supabase.rpc("claim_telemetry_report", {
      p_day: expectedDay,
      p_force: true,
    });
    if (lockError) throw lockError;
    if (!lock) return json({ success: true, skipped: true, report_day: expectedDay });
    claimed = true;
    const user = Deno.env.get("TRUCKSCONTROL_USER");
    const pass = Deno.env.get("TRUCKSCONTROL_PASSWORD");
    if (!user || !pass) throw new Error("Credenciais não configuradas");

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
          method: "POST",
          headers: { "Content-Type": "text/xml", "User-Agent": "Mozilla/5.0" },
          body: xmlReq,
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`TrucksControl HTTP ${res.status}`);
        return decode(new Uint8Array(await res.arrayBuffer()));
      })(),
      new Promise<never>((_, rej) => {
        timer = setTimeout(() => {
          controller.abort();
          rej(new Error("TrucksControl não respondeu em 110s"));
        }, 110_000);
      }),
    ]).finally(() => clearTimeout(timer));

    const reports = parseRelatorio(text);
    if (/<codigo>\s*7\s*<\/codigo>/i.test(text))
      throw new Error("TrucksControl código 7: aguardar bloqueio de 60 minutos");
    console.log("[telemetria-relatorio] relatórios:", reports.length);
    if (!reports.length) throw new Error("Nenhum relatório D-1 disponível; nova tentativa em 30 minutos");

    const { data: tel, error: telError } = await supabase
      .from("vehicle_telemetry")
      .select("vehicle_id, vehicle_plate, truckscontrol_id");
    if (telError) throw telError;
    const byVei = new Map<string, any>();
    for (const t of tel || []) if (t.truckscontrol_id) byVei.set(String(t.truckscontrol_id), t);

    const fallbackDate = expectedDay;
    let imported = 0,
      notFound = 0;
    for (const r of reports) {
      const v = byVei.get(r.veiID);
      if (!v?.vehicle_id) {
        notFound++;
        continue;
      }
      const day = r.date || fallbackDate;
      if (day !== expectedDay) {
        notFound++;
        continue;
      }
      const ts = `${day}T12:00:00-03:00`;

      const { data: drv } = await supabase
        .from("vehicle_can_data")
        .select("driver_name")
        .eq("vehicle_id", v.vehicle_id)
        .gte("data_timestamp", `${day}T00:00:00-03:00`)
        .lte("data_timestamp", `${day}T23:59:59-03:00`)
        .not("driver_name", "is", null)
        .limit(1000);
      const counts = new Map<string, number>();
      for (const d of drv || []) counts.set(d.driver_name, (counts.get(d.driver_name) || 0) + 1);
      const driverName = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
      const kml = r.mediaConsumo ?? (r.distanciaKm && r.consumoTotal ? r.distanciaKm / r.consumoTotal : null);
      const row = {
        vehicle_id: v.vehicle_id,
        vehicle_plate: v.vehicle_plate,
        driver_name: driverName,
        data_timestamp: ts,
        ignition_on: true,
        odometer: r.odmFim,
        fuel_used_total: r.consumoTotal,
        onboard_consumption_kml: kml,
        rpm: r.rpmMedio,
        speed: r.velMedia,
        total_time_minutes: r.totalMotorLig ?? r.utilizacao,
        raw_data: { source: "telemetria_relatorio", report_date: day, ...r },
      };

      const { data: existing, error: lookupError } = await supabase
        .from("vehicle_can_data")
        .select("id")
        .eq("vehicle_id", v.vehicle_id)
        .eq("data_timestamp", ts)
        .contains("raw_data", { source: "telemetria_relatorio" })
        .maybeSingle();
      if (lookupError) throw lookupError;
      const { error } = existing
        ? await supabase.from("vehicle_can_data").update(row).eq("id", existing.id)
        : await supabase.from("vehicle_can_data").insert(row);
      if (error) console.error("[telemetria-relatorio] insert", error.message);
      else imported++;
    }
    const complete = reportComplete(reports.length, imported, notFound);
    const { error: stateError } = await supabase
      .from("telemetry_report_sync")
      .update({
        status: complete ? "completed" : "pending",
        imported,
        completed_at: complete ? new Date().toISOString() : null,
        last_error: complete
          ? null
          : `Importação incompleta: ${imported}/${reports.length}; não vinculados: ${notFound}`,
      })
      .eq("report_day", expectedDay);
    if (stateError) throw stateError;
    return json({ success: complete, imported, notFound, total: reports.length, report_day: expectedDay });
  } catch (e) {
    console.error("[telemetria-relatorio] error", String(e));
    if (claimed)
      await supabase
        .from("telemetry_report_sync")
        .update({ status: "pending", last_error: String(e instanceof Error ? e.message : e) })
        .eq("report_day", expectedDay);
    return json({ success: false, error: String(e instanceof Error ? e.message : e) }, 200);
  }
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método inválido" }, 405);

  const body = await req
    .clone()
    .json()
    .catch(() => ({}));

  if (body?.source === "cron") {
    const failure = authenticateCronRequest(req);
    if (failure) return failure;
    if (!reportDue(new Date())) return json({ accepted: false, reason: "antes das 05:00 BRT" }, 200);

    // Responde ao pg_net em < 50ms para evitar o timeout de 5 segundos
    // e executa o processamento em segundo plano
    // @ts-ignore EdgeRuntime está presente no ambiente de execução da Cloud
    if (typeof EdgeRuntime !== "undefined" && EdgeRuntime.waitUntil) {
      // @ts-ignore
      EdgeRuntime.waitUntil(
        handler(req)
          .then((res) => res.text())
          .then((t) => console.log("[telemetria-relatorio cron concluído]", t.slice(0, 200)))
          .catch((e) => console.error("[telemetria-relatorio cron erro]", String(e))),
      );
    } else {
      handler(req).catch((e) => console.error("[telemetria-relatorio cron erro]", String(e)));
    }

    return json({ accepted: true, mode: "background" }, 202);
  }

  // Chamada manual do botão no painel continua síncrona
  const failure = await authenticateSync(req);
  if (failure) return json({ error: "Acesso não autorizado" }, failure.status);
  return await handler(req);
});
