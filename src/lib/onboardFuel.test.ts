import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { onboardConsumptionAvailability, measuredFuelEfficiency } from './onboardFuel';

describe('Onboard consumption source requirements', () => {
  test('missing measured fuel remains unavailable, never an estimate or zero', () => {
    assert.equal(measuredFuelEfficiency(400, null), null);
    assert.equal(measuredFuelEfficiency(null, 200), null);
    assert.equal(measuredFuelEfficiency(400, 0), null);
  });
  test('daily observations use Sao Paulo dates, including UTC midnight', () => {
    const daily = onboardConsumptionAvailability([{ vehicle_plate: 'SJU0H94', driver_id: null, driver_name: null, data_timestamp: '2026-11-09T01:30:00Z' }]);
    assert.equal(daily[0].day, '2026-11-08');
  });
  test('driver changes and plates remain separate in the daily report', () => {
    const signals = ['driver-a', 'driver-b'].map(driver_id => ({ vehicle_plate: 'SJU0H94', driver_id, driver_name: driver_id, data_timestamp: '2026-11-08T15:00:00Z' }));
    assert.equal(onboardConsumptionAvailability(signals).length, 2);
  });
});