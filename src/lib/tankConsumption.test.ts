/// <reference types="bun" />
import { test, expect } from 'bun:test';
import { computeTankDaily, tankPeriodAverage, type TankReading } from './tankConsumption';
const row = (hour: number, odometer: number, fuel_level: number | null, ignition_on = true): TankReading => ({ vehicle_plate: 'SJU0H94', driver_name: 'Motorista', data_timestamp: `2026-11-12T${hour}:00:00-03:00`, odometer, fuel_level, ignition_on });
test('daily km/L uses lt decreases and odm distance including stationary fuel consumption', () => {
  const [day] = computeTankDaily([row(10, 1000, 100), row(11, 1060, 80), row(12, 1060, 78)]);
  expect(day.km).toBe(60); expect(day.liters).toBe(22); expect(day.kml).toBe(60 / 22);
});
test('refueling rise never becomes consumed fuel or includes unmeasured distance', () => {
  const [day] = computeTankDaily([row(10, 1000, 100), row(11, 1060, 80), row(12, 1070, 180), row(13, 1130, 160)]);
  expect(day.km).toBe(120); expect(day.liters).toBe(40); expect(day.excluded).toBe(1);
});
test('off ignition, missing tank readings and reset odometers produce no invented consumption', () => {
  expect(computeTankDaily([row(10, 1000, 100, false), row(11, 1060, 80)])[0].kml).toBeNull();
  expect(computeTankDaily([row(10, 1000, null), row(11, 1060, null)])[0].kml).toBeNull();
  expect(computeTankDaily([row(10, 1000, 100), row(11, 900, 80)])[0].kml).toBeNull();
});
test('period km/L is total measured km divided by total consumed liters', () => {
  const days = computeTankDaily([row(10, 1000, 100), row(11, 1060, 80)]);
  expect(tankPeriodAverage([...days, { ...days[0], km: 120, liters: 20 }])).toBe(4.5);
});
test('does not bridge driver changes or Sao Paulo day boundaries', () => {
  expect(computeTankDaily([row(10, 1000, 100), { ...row(11, 1060, 80), driver_name: 'Outro' }]).every(d => d.kml === null)).toBe(true);
  expect(computeTankDaily([row(23, 1000, 100), { ...row(10, 1060, 80), data_timestamp: '2026-11-13T01:00:00-03:00' }]).every(d => d.kml === null)).toBe(true);
});