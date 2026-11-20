import { reportDue, reportDay, reportComplete } from '../_shared/syncPolicy.ts';
const assert = (v: boolean) => { if (!v) throw new Error('Policy assertion failed'); };
Deno.test('D-1 starts at 05:00 BRT', () => { assert(!reportDue(new Date('2026-11-20T07:30:00Z'))); assert(reportDue(new Date('2026-11-20T08:00:00Z'))); });
Deno.test('D-1 is previous Brazilian calendar date', () => { assert(reportDay(new Date('2026-11-20T01:00:00Z')) === '2026-11-18'); });
Deno.test('empty or partial imports keep retries active', () => { assert(!reportComplete(0, 0, 0)); assert(!reportComplete(8, 7, 0)); assert(!reportComplete(8, 7, 1)); assert(reportComplete(8, 8, 0)); });