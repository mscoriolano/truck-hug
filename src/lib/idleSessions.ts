/** Pure grouping of idle events (ignition on, stopped) into continuous sessions. */
export type IdleEvent = { plate: string; driver: string | null; at: string; location: string | null; lat: number | null; lng: number | null; rpm: number | null };
export type IdleSession = { plate: string; driver: string | null; start: string; end: string; minutes: number; location: string | null; lat: number | null; lng: number | null; maxRpm: number | null; events: number };

/** Events of the same plate closer than gapMin minutes belong to the same session. */
export function groupIdleSessions(events: IdleEvent[], gapMin = 30): IdleSession[] {
  const sorted = [...events].sort((a, b) => a.plate.localeCompare(b.plate) || a.at.localeCompare(b.at));
  const out: IdleSession[] = [];
  let cur: IdleSession | null = null;
  for (const e of sorted) {
    const t = new Date(e.at).getTime();
    if (cur && cur.plate === e.plate && t - new Date(cur.end).getTime() <= gapMin * 60000) {
      cur.end = e.at; cur.events++;
      if (e.rpm != null) cur.maxRpm = Math.max(cur.maxRpm ?? 0, e.rpm);
      cur.driver = cur.driver ?? e.driver;
      cur.minutes = Math.round((t - new Date(cur.start).getTime()) / 60000);
    } else {
      cur = { plate: e.plate, driver: e.driver, start: e.at, end: e.at, minutes: 0, location: e.location, lat: e.lat, lng: e.lng, maxRpm: e.rpm, events: 1 };
      out.push(cur);
    }
  }
  return out.sort((a, b) => b.start.localeCompare(a.start));
}

/** Start of the ongoing idle for a vehicle: latest session start if it reaches lastSeen within gapMin, else lastSeen. */
export function idleSince(sessions: IdleSession[], plate: string, lastSeen: string, gapMin = 30): string {
  const s = sessions.filter(x => x.plate === plate).sort((a, b) => b.end.localeCompare(a.end))[0];
  if (s && new Date(lastSeen).getTime() - new Date(s.end).getTime() <= gapMin * 60000 && s.start < lastSeen) return s.start;
  return lastSeen;
}
