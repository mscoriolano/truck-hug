import { describe, it, expect } from 'vitest';
import { dayKm, dayLiters, summarizeTrip, type ReportDay } from './onboardTrip';

const base = { plate: 'TDY9E99', driver: 'X', velMedia: null, minutesMoving: null, minutesIdle: null, brakes: null, clutch: null } as const;

describe('onboardTrip', () => {
  it('day km uses odometer difference, not distance divided by 1000', () => {
    expect(dayKm({ odmIni: 182772, odmFim: 183132, distancia: 0.36 })).toBe(360);
  });
  it('liters = km / official km/L', () => {
    expect(dayLiters({ odmIni: 79103, odmFim: 79567, distancia: null, kml: 2.32 })).toBeCloseTo(200, 0);
  });
  it('trip km spans first odmIni to last odmFim even with a missing day', () => {
    const days: ReportDay[] = [
      { ...base, day: '2026-11-12', odmIni: 79103, odmFim: 79567, distancia: 464, kml: 2.17, velMedia: 49, minutesMoving: 537, brakes: 526 },
      { ...base, day: '2026-11-14', odmIni: 80013, odmFim: 80291, distancia: 278, kml: 2.31, velMedia: 50, minutesMoving: 321, brakes: 355 },
    ];
    const s = summarizeTrip(days, 3);
    expect(s.km).toBe(1188);
    expect(s.missingDays).toBe(1);
    expect(s.brakes).toBe(881);
    expect(s.movingMinutes).toBe(858);
    expect(s.kml!).toBeGreaterThan(2.17);
    expect(s.kml!).toBeLessThan(2.31);
  });
});
