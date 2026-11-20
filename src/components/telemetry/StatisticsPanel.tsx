import { useMemo, useState } from "react";
import { format, subDays } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Gauge as GaugeIcon, Route, Fuel, Clock, Hash, X } from "lucide-react";
import { useReportDays } from "@/hooks/useReportDays";
import { aggregate, rankScore } from "@/lib/fleetStats";
import { PanelFilters } from "./PanelFilters";
import {
  DEFAULT_PERCENT_TARGET,
  GOAL_LABELS,
  LIMIT_LABELS,
  gaugePosition,
  timePercentage,
} from "@/lib/statisticsGauges";

const fmt = (v: number | null | undefined, d = 2) =>
  v == null ? "—" : v.toLocaleString("pt-BR", { maximumFractionDigits: d });

function Gauge({
  label,
  value,
  target = DEFAULT_PERCENT_TARGET,
  kind,
}: {
  label: string;
  value: number | null;
  target?: number;
  kind: "meta" | "limite";
}) {
  const c = Math.PI * 40;
  const dash = (gaugePosition(value ?? 0) / 100) * c;
  const angle = Math.PI * (1 - gaugePosition(target) / 100);
  const x = 50 + 40 * Math.cos(angle),
    y = 50 - 40 * Math.sin(angle);
  return (
    <div className="flex flex-col items-center text-center p-2 min-w-0">
      <p className="text-xs font-medium min-h-12">{label}</p>
      <p className="text-[10px] text-muted-foreground mb-2">
        {kind === "meta" ? "Meta" : "Limite"}: {fmt(target)}% | Valor:{" "}
        {value == null ? "Indisponível" : `${fmt(value)}%`}
      </p>
      <svg
        viewBox="0 0 100 68"
        className="w-full max-w-36"
        role="img"
        aria-label={`${label}: ${value == null ? "indisponível" : `${fmt(value)}%`}`}
      >
        <path d="M10 50 A40 40 0 0 1 90 50" fill="none" className="stroke-muted" strokeWidth="10" />
        {value != null && (
          <path
            d="M10 50 A40 40 0 0 1 90 50"
            fill="none"
            className={kind === "limite" && value > target ? "stroke-destructive" : "stroke-primary"}
            strokeWidth="10"
            strokeDasharray={`${dash} ${c}`}
          />
        )}
        <circle cx={x} cy={y} r="3" className="fill-foreground" />
        <text x="50" y="48" textAnchor="middle" className="fill-foreground" fontSize="13" fontWeight="700">
          {value == null ? "—" : `${fmt(value)}%`}
        </text>
        <text x="7" y="65" className="fill-muted-foreground" fontSize="9">
          0%
        </text>
        <text x="75" y="65" className="fill-muted-foreground" fontSize="9">
          100%
        </text>
      </svg>
    </div>
  );
}

export function StatisticsPanel() {
  const [f, setF] = useState({
    from: format(subDays(new Date(), 30), "yyyy-MM-dd"),
    to: format(new Date(), "yyyy-MM-dd"),
    plate: "all",
    driver: "all",
  });
  const { data: days = [], isLoading } = useReportDays(f.from, f.to);
  const plates = useMemo(() => [...new Set(days.map((d) => d.plate))].sort(), [days]);
  const drivers = useMemo(
    () => [...new Set(days.filter((d) => f.plate === "all" || d.plate === f.plate).map((d) => d.driver))].sort(),
    [days, f.plate],
  );
  const byDriver = days.filter((d) => f.driver === "all" || d.driver === f.driver);
  const sel = byDriver.filter((d) => f.plate === "all" || d.plate === f.plate);
  const total = aggregate(sel);

  const ranking = useMemo(() => {
    const rows = [...new Set(byDriver.map((d) => d.plate))].map((p) => {
      const a = aggregate(byDriver.filter((d) => d.plate === p));
      return { plate: p, a, score: rankScore(a) };
    });
    return rows.sort((x, y) => (y.score ?? -1) - (x.score ?? -1) || (y.a.kml ?? -1) - (x.a.kml ?? -1));
  }, [byDriver]);

  // Pontuação oficial da visão selecionada (frota total ou veículo individual)
  const score = rankScore(total);

  const cards: [string, string, any][] = [
    ["Km rodado", fmt(total.km, 0), Route],
    ["Velocidade média", fmt(total.avgSpeed, 1), GaugeIcon],
    ["Odômetro", fmt(total.odometer, 0), Hash],
    ["Consumo total (L)", fmt(total.liters, 1), Fuel],
    ["Média km/L", fmt(total.kml), Fuel],
    ["Consumo hora-motor (L/h)", fmt(total.consHora, 1), Clock],
  ];

  return (
    <div className="space-y-4">
      <Card className="bg-card border-border">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
          <CardTitle>Painel de Estatísticas</CardTitle>
          <PanelFilters
            {...f}
            plates={plates}
            drivers={drivers}
            onChange={(p) => setF((s) => ({ ...s, ...p, ...(p.plate ? { driver: "all" } : {}) }))}
          />
        </CardHeader>
      </Card>
      {isLoading ? (
        <p className="text-muted-foreground text-center py-10">Carregando…</p>
      ) : (
        <div className="grid lg:grid-cols-2 gap-4">
          <div className="space-y-4">
            <Card className="bg-card border-border">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Veículo</p>
                    <p className="text-xl font-bold text-foreground">{f.plate === "all" ? "Todos" : f.plate}</p>
                    {f.plate !== "all" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="px-0 h-6"
                        onClick={() => setF((s) => ({ ...s, plate: "all" }))}
                      >
                        <X className="w-3 h-3 mr-1" />
                        Ver todos
                      </Button>
                    )}
                  </div>
                  <div className="flex gap-6 text-right">
                    <div>
                      <p className="text-xs text-muted-foreground">Pontuação (0–100)</p>
                      <p className="text-3xl font-bold text-primary">{fmt(score)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Pontos a melhorar</p>
                      <p className="text-3xl font-bold text-destructive">{score == null ? "—" : fmt(100 - score)}</p>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {cards.map(([l, v, I]) => (
                    <div key={l} className="rounded-lg border border-border bg-background p-3">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <I className="w-3 h-3" />
                        {l}
                      </p>
                      <p className="text-xl font-bold text-foreground text-right">{v}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="pt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-muted-foreground text-xs text-right">
                      <th className="text-left">#</th>
                      <th className="text-left">Placa</th>
                      <th>Vel. média</th>
                      <th>Odômetro</th>
                      <th>L/h</th>
                      <th>Km</th>
                      <th>Litros</th>
                      <th>Km/L</th>
                      <th>Nota</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ranking.map((r, i) => (
                      <tr
                        key={r.plate}
                        onClick={() => setF((s) => ({ ...s, plate: s.plate === r.plate ? "all" : r.plate }))}
                        className={`cursor-pointer text-right border-t border-border hover:bg-muted ${f.plate === r.plate ? "bg-muted" : ""}`}
                      >
                        <td className="text-left py-2">{i + 1}</td>
                        <td className="text-left font-medium">{r.plate}</td>
                        <td>{fmt(r.a.avgSpeed, 0)}</td>
                        <td>{fmt(r.a.odometer, 0)}</td>
                        <td>{fmt(r.a.consHora, 0)}</td>
                        <td>{fmt(r.a.km, 0)}</td>
                        <td>{fmt(r.a.liters, 1)}</td>
                        <td>{fmt(r.a.kml)}</td>
                        <td className="font-semibold">{fmt(r.score)}</td>
                      </tr>
                    ))}
                    {!ranking.length && (
                      <tr>
                        <td colSpan={9} className="text-center text-muted-foreground py-6">
                          Sem relatórios no período.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
                <p className="text-[10px] text-muted-foreground mt-2">
                  Clique na linha para analisar só o veículo. Ordenado por nota e km/L. Pontuação na escala 0–100 (Grupo
                  Padrão): soma de Pontuação + Pontos a Melhorar = 100.
                </p>
              </CardContent>
            </Card>
          </div>
          <div className="space-y-4">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-base">Metas</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 md:grid-cols-3">
                {GOAL_LABELS.map((label) => (
                  <Gauge key={label} kind="meta" label={label} value={null} />
                ))}
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-base">Limites</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 md:grid-cols-3">
                {LIMIT_LABELS.map((label, i) => (
                  <Gauge
                    key={label}
                    kind="limite"
                    label={label}
                    value={
                      i === 0 && sel.length && sel.every((d) => d.minutesIdle != null && d.minutesOn != null)
                        ? timePercentage(total.minutesIdle, total.minutesOn)
                        : null
                    }
                  />
                ))}
              </CardContent>
            </Card>
            <p className="text-xs text-muted-foreground">
              Percentuais indisponíveis: a TrucksControl ainda não fornece as durações dessas métricas na integração.
              Contagens de eventos não equivalem a tempo de infração.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
