import { expect, test } from 'bun:test';
import { DEFAULT_PERCENT_TARGET, gaugePosition, timePercentage } from './statisticsGauges';
test('Trucks default target is 0% on a 100% scale', () => { expect(DEFAULT_PERCENT_TARGET).toBe(0); expect(gaugePosition(DEFAULT_PERCENT_TARGET)).toBe(0); });
test('5% stays 5% of 100%, not 100% attainment', () => { expect(gaugePosition(5)).toBe(5); });
test('duration share is a percentage, not events per km', () => { expect(timePercentage(5, 100)).toBe(5); });
test('missing duration is unavailable, not zero', () => { expect(timePercentage(null, 100)).toBeNull(); expect(timePercentage(0, 100)).toBe(0); });