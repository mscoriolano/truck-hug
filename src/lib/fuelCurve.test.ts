/// <reference types="bun" />
import { test, expect } from 'bun:test';
import { buildFuelCurve } from './fuelCurve';
const r = (h: number, odometer: number, fuel_level: number, ignition_on = true) => ({ vehicle_plate: 'X', driver_name: 'Ana', data_timestamp: `2026-11-12T${String(h).padStart(2, '0')}:00:00-03:00`, odometer, fuel_level, ignition_on });

test('a rise of 30L or more is a refuel', () => {
  const { events } = buildFuelCurve([r(1, 100, 100), r(2, 100, 400)]);
  expect(events.map(e => e.kind)).toEqual(['refuel']);
});
test('a drop of 20L+ while parked is suspected theft', () => {
  const { events } = buildFuelCurve([r(1, 100, 400), r(2, 100, 340, false)]);
  expect(events[0].kind).toBe('theft');
  expect(events[0].deltaLiters).toBe(-60);
});
test('a 20L drop over 50km of driving is normal, not theft', () => {
  const { events } = buildFuelCurve([r(1, 100, 400), r(2, 150, 380)]);
  expect(events.filter(e => e.kind === 'theft')).toHaveLength(0);
});
test('a segment burning far above the average is high consumption', () => {
  const rows = [r(1, 0, 500), r(2, 100, 460), r(3, 200, 420), r(4, 300, 380), r(5, 310, 370)];
  const { events } = buildFuelCurve(rows);
  expect(events.map(e => e.kind)).toEqual(['high_consumption']);
});
