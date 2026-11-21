import { useMemo } from "react";
import { subDays } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { LiveIdleList, useIdleSessions } from "./IdlePanel";

type V = {
  vehicle_plate: string;
  latitude?: number;
  longitude?: number;
  rpm?: number;
  speed: number;
  ignition_on: boolean;
  gps_timestamp?: string;
  received_at: string;
  model?: string;
};
const TITLES = {
  all: "Total de veículos",
  ignition_on: "Ignição ligada",
  moving: "Em movimento",
  idle: "Ociosidade (parado com motor ligado)",
} as const;
export type FleetStatus = keyof typeof TITLES;

export function FleetStatusDialog({
  status,
  onClose,
  vehicles,
  onViewOnMap,
}: {
  status: FleetStatus | null;
  onClose: () => void;
  vehicles: V[];
  onViewOnMap?: (plate: string) => void;
}) {
  const range = useMemo(() => ({ f: subDays(new Date(), 2), t: new Date() }), []);
  const { sessions } = useIdleSessions(range.f, range.t);
  const list = vehicles.filter((v) =>
    status === "all"
      ? true
      : status === "ignition_on"
        ? v.ignition_on
        : status === "moving"
          ? v.ignition_on && v.speed > 0
          : v.ignition_on && v.speed === 0,
  );
  const label = (v: V) => (!v.ignition_on ? "Desligado" : v.speed > 0 ? "Em movimento" : "Ocioso");

  return (
    <Dialog open={!!status} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {status ? TITLES[status] : ""} ({list.length})
          </DialogTitle>
        </DialogHeader>
        {status === "idle" ? (
          <LiveIdleList vehicles={vehicles} sessions={sessions} />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-muted-foreground text-left">
                <th>Placa</th>
                <th>Situação</th>
                <th>Velocidade</th>
                <th>RPM</th>
                <th>Última posição</th>
                <th>Mapa</th>
              </tr>
            </thead>
            <tbody>
              {list.map((v) => (
                <tr key={v.vehicle_plate} className="border-t border-border">
                  <td className="py-2 font-medium">{v.vehicle_plate}</td>
                  <td>
                    <Badge variant="secondary">{label(v)}</Badge>
                  </td>
                  <td>{v.speed ?? 0} km/h</td>
                  <td>{v.rpm ?? "—"}</td>
                  <td>{new Date(v.gps_timestamp || v.received_at).toLocaleString("pt-BR")}</td>
                  <td>
                    {v.latitude != null && v.longitude != null ? (
                      <button
                        type="button"
                        onClick={() => onViewOnMap?.(v.vehicle_plate)}
                        className="underline text-primary hover:text-primary/80 font-medium cursor-pointer"
                      >
                        ver
                      </button>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
              {!list.length && (
                <tr>
                  <td colSpan={6} className="text-center text-muted-foreground py-6">
                    Nenhum veículo nesta situação.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </DialogContent>
    </Dialog>
  );
}
