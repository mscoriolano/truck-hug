import { createClient } from "npm:@supabase/supabase-js@2";
import { strFromU8 } from "npm:fflate@0.8.2";
import pako from "npm:pako@2.1.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { parseRelatorio } from "./parse.ts";
import { authenticateCronRequest } from "../_shared/cron-auth.ts";
import { authenticateSync } from "../_shared/request-auth.ts";
import { reportDay, reportDue } from "../_shared/syncPolicy.ts";

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

const handler = async (req: Request, options: { force?: boolean } = {}): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const expectedDay = reportDay(new Date());
  let claimed = false;
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return json({ success: false, error: "Configuração ausente" }, 500);
  const supabase = createClient(url, key);
  try {
    const force = options.force ?? false;
    const { data: lock, error: lockError } = await supabase.rpc("claim_telemetry_report", {
      p_day: expectedDay,
      p_force: force,
    });
    if (lockError) throw lockError;
    if (!lock) {
      console.log(`[telemetria-relatorio] ignorado (dia ${expectedDay} já concluído ou bloqueado temporariamente)`);
      return json({ success: true, skipped: true, report_day: expectedDay });
    }
    claimed = true;
    const user = Deno.env.get("TRUCKSCONTROL_USER");
    const pass = Deno.env.get("TRUCKSCONTROL_PASSWORD");
    if (!user || !pass) throw new Error("Credenciais não configuradas");

    const xmlReq = `<?xml version="1.0" encoding="UTF-8"?>
<RequestTelemetriaRelatorio>
  <login>${esc(user)}</login>
  <senha>${esc(pass)}</senha>
  <tID>1</tID>
  <dataRelatorio>${esc(expectedDay)}</dataRelatorio>
</RequestTelemetriaRelatorio>`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 110_000);
    const tcRes = await fetch("https://webservice.newrastreamentoonline.com.br", {
      method: "POST",
      headers: {
        "Content-Type": "text/xml",
        "User-Agent": "Mozilla/5.0",
      },
      body: xmlReq,
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));

    if (!tcRes.ok) throw new Error(`HTTP ${tcRes.status}`);
    const bytes = new Uint8Array(await tcRes.arrayBuffer());
    const xml = decode(bytes);

    if (xml.includes("<codigo>7</codigo>")) {
      const waitMinutes = 60;
      const retryAt = new Date(Date.now() + waitMinutes * 60_000).toISOString();
      await supabase
        .from("telemetry_report_sync")
        .update({
          status: "pending",
          last_error: "Código 7 da TrucksControl: aguardando 60 minutos",
        })
        .eq("report_day", expectedDay);
      return json({ success: false, code: 7, waitMinutes });
    }

    if (xml.includes("<codigo>3</codigo>")) {
      await supabase
        .from("telemetry_report_sync")
        .update({ status: "pending", last_error: "Código 3: relatório ainda não disponível" })
        .eq("report_day", expectedDay);
      return json({ success: false, code: 3, message: "Relatório ainda não disponível" });
    }

    const { rows, errorMsg } = parseRelatorio(xml);
    if (errorMsg) throw new Error(errorMsg);
    if (!rows.length) {
      await supabase
        .from("telemetry_report_sync")
        .update({ status: "pending", last_error: "XML sem linhas de consumo" })
        .eq("report_day", expectedDay);
      return json({ success: false, message: "Nenhum registro encontrado no relatório" });
    }

    const { data: vList } = await supabase.from("vehicles").select("id, plate");
    const vMap = new Map((vList || []).map((v: { plate: string; id: string }) => [v.plate.toUpperCase(), v.id]));

    const upserts = rows.map((r) => {
      const p = r.placa.toUpperCase();
      return {
        vehicle_id: vMap.get(p) || null,
        plate: p,
        report_date: r.data,
        driver_name: r.motorista || null,
        km_rodado: r.kmRodado,
        combustivel_total_litros: r.combustivelTotal,
        media_km_l: r.mediaKmL,
        tempo_rodando_horas: r.tempoRodandoHoras,
        tempo_marcha_lenta_horas: r.tempoMarchaLentaHoras,
        consumo_marcha_lenta_litros: r.consumoMarchaLentaLitros,
        odometro_inicial_km: r.odometroInicial,
        odometro_final_km: r.odometroFinal,
        raw_payload: r.raw,
        updated_at: new Date().toISOString(),
      };
    });

    const { error: upErr } = await supabase
      .from("onboard_consumption_daily")
      .upsert(upserts, { onConflict: "plate,report_date" });
    if (upErr) throw upErr;

    const { data: compResult, error: compError } = await supabase.rpc("complete_telemetry_report", {
      p_day: expectedDay,
      p_vehicles_count: rows.length,
    });
    if (compError) throw compError;
    if (!compResult) {
      console.warn(`[telemetria-relatorio] complete_telemetry_report não encontrou linha pendente para ${expectedDay}`);
    }

    return json({ success: true, report_day: expectedDay, vehicles_imported: rows.length });
  } catch (e) {
    console.error("[telemetria-relatorio] falha:", e);
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

    return await handler(req, { force: false });
  }

  const failure = await authenticateSync(req);
  if (failure) return json({ error: "Acesso não autorizado" }, failure.status);
  return await handler(req, { force: true });
});
