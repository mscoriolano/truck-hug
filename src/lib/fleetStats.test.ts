import { describe, it, expect } from 'bun:test';
import { aggregate, avgPricePerLiter, monthlyKml, CO2_KG_PER_LITER, type StatDay } from './fleetStats';

const d = (p: Partial<StatDay>): StatDay => ({ plate: 'A', driver: 'X', day: '2026-11-12', km: null, kml: null, velMedia: null, odmFim: null, consHoraMotor: null, minutesOn: null, minutesMoving: null, minutesIdle: null, ...p });

describe('fleetStats', () => {
  it('weights km/L by km and liters (464 km @2.17 + 278 km @2.31 = 2.22)', () => {
    const a = aggregate([d({ km: 464, kml: 2.17 }), d({ km: 278, kml: 2.31 })]);
    expect(a.km).toBe(742);
    expect(a.kml!).toBeCloseTo(2.22, 2);
  });
  it('CO2 = liters x 2.5824 kg (23449.5 L ≈ 60555 kg)', () => {
    const a = aggregate([d({ km: 23449.5 * 2, kml: 2 })]);
    expect(a.co2Kg).toBeCloseTo(23449.5 * CO2_KG_PER_LITER, 3);
    expect(Math.round(a.co2Kg)).toBe(60556);
  });
  it('idle % = idle / (moving + idle)', () => {
    expect(aggregate([d({ minutesMoving: 300, minutesIdle: 100 })]).idlePct).toBe(25);
  });
  it('average price is weighted by liters', () => {
    expect(avgPricePerLiter([{ liters: 100, total_cost: 600 }, { liters: 300, total_cost: 1500 }])).toBe(5.25);
  });
  it('groups km/L by month', () => {
    const m = monthlyKml([d({ day: '2026-10-01', km: 200, kml: 2 }), d({ day: '2026-11-01', km: 250, kml: 2.5 })]);
    expect(m.map(x => x.month)).toEqual(['2026-10', '2026-11']);
    expect(m[1].kml).toBe(2.5);
  });
});
