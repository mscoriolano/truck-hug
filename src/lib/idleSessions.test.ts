import { describe, it, expect } from 'bun:test';
import { groupIdleSessions, idleSince, type IdleEvent } from './idleSessions';
const e = (at: string, plate = 'SJU5I48', rpm = 600): IdleEvent => ({ plate, driver: 'M', at, location: 'Timóteo', lat: null, lng: null, rpm });

describe('idleSessions', () => {
  it('joins events up to 30 min apart: 14:00→14:50 = 50 min', () => {
    const s = groupIdleSessions([e('2026-11-20T14:00:00Z'), e('2026-11-20T14:25:00Z'), e('2026-11-20T14:50:00Z')]);
    expect(s.length).toBe(1);
    expect(s[0].minutes).toBe(50);
  });
  it('a gap over 30 min starts a new session', () => {
    expect(groupIdleSessions([e('2026-11-20T10:00:00Z'), e('2026-11-20T10:31:00Z')]).length).toBe(2);
  });
  it('ongoing idle starts at the session start', () => {
    const s = groupIdleSessions([e('2026-11-20T14:00:00Z'), e('2026-11-20T14:20:00Z')]);
    expect(idleSince(s, 'SJU5I48', '2026-11-20T14:28:00Z')).toBe('2026-11-20T14:00:00Z');
  });
});
