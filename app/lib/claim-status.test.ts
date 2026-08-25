import assert from 'node:assert/strict';
import test from 'node:test';
import { assessStatus, delayGrievance, delayRti, workingDaysBetween, type StatusInput } from './claim-status.ts';

const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
};

const base = (over: Partial<StatusInput> = {}): StatusInput => ({
  filedOn: daysAgo(5),
  claimType: '31',
  amount: 120000,
  stage: 'submitted',
  office: 'Regional Office, Bengaluru (Peenya)',
  grievanceRaised: false,
  ...over,
});

test('an advance inside the auto-settlement ceiling takes the auto route', () => {
  const v = assessStatus(base({ amount: 120000 }));
  assert.equal(v.route, 'auto');
  assert.equal(v.expectedDays, 3);
});

test('an advance above the ceiling falls back to manual processing', () => {
  const v = assessStatus(base({ amount: 800000 }));
  assert.equal(v.route, 'manual');
  assert.equal(v.expectedDays, 10);
});

test('a final settlement is never auto-routed', () => {
  const v = assessStatus(base({ claimType: '19', amount: 50000 }));
  assert.equal(v.route, 'manual');
});

test('inside the charter limit there is no penal interest and only the wait step', () => {
  const v = assessStatus(base({ filedOn: daysAgo(4) }));
  assert.equal(v.overdueBy, 0);
  assert.equal(v.penalInterest.applies, false);
  assert.deepEqual(v.unlocked.map((s) => s.id), ['wait']);
});

test('crossing the charter limit retires the wait advice', () => {
  // The bug this guards: telling someone to wait on the same screen that says
  // their claim is late.
  const v = assessStatus(base({ filedOn: daysAgo(27) }));
  assert.equal(v.overdueBy, 7);
  assert.ok(!v.unlocked.some((s) => s.id === 'wait'), 'wait must not survive the limit');
  assert.deepEqual(v.unlocked.map((s) => s.id), ['epfigms', 'rti']);
});

test('penal interest becomes citable only past the charter limit', () => {
  assert.equal(assessStatus(base({ filedOn: daysAgo(19) })).penalInterest.applies, false);
  const late = assessStatus(base({ filedOn: daysAgo(21) }));
  assert.equal(late.penalInterest.applies, true);
  assert.equal(late.penalInterest.ratePercent, 12);
});

test('a severely delayed claim unlocks the whole ladder', () => {
  const v = assessStatus(base({ filedOn: daysAgo(95) }));
  assert.equal(v.severity, 'severe');
  assert.deepEqual(v.unlocked.map((s) => s.id), ['epfigms', 'rti', 'penal', 'cpgrams']);
  assert.equal(v.locked.length, 0);
});

test('a settled claim is never reported as breached', () => {
  const v = assessStatus(base({ filedOn: daysAgo(120), stage: 'settled' }));
  assert.equal(v.severity, 'on-track');
  assert.equal(v.penalInterest.applies, false);
});

test('each stage names a different owner', () => {
  const roles = (['submitted', 'under-process', 'approved', 'settled'] as const).map(
    (stage) => assessStatus(base({ stage })).owner.role
  );
  assert.equal(new Set(roles).size, roles.length);
});

test('the migration window is flagged only for claims filed near it', () => {
  const near = assessStatus(base({ filedOn: '2026-06-28T00:00:00Z' }));
  assert.ok(near.migrationNote, 'a claim filed mid-migration should be flagged');
  const far = assessStatus(base({ filedOn: '2026-01-10T00:00:00Z' }));
  assert.equal(far.migrationNote, null);
});

test('working days exclude weekends', () => {
  // Mon 4 Aug 2026 to Mon 11 Aug 2026 is 7 calendar days, 5 working days.
  const from = new Date('2026-08-03T00:00:00');
  const to = new Date('2026-08-10T00:00:00');
  assert.equal(workingDaysBetween(from, to), 5);
});

test('the grievance cites the day count and the charter limit', () => {
  const input = base({ filedOn: daysAgo(34) });
  const v = assessStatus(input);
  const letter = delayGrievance(input, v, 'CLM-TEST-1');
  assert.match(letter, /34 days/);
  assert.match(letter, /20 days/);
  assert.match(letter, /12%/);
  assert.match(letter, /CLM-TEST-1/);
});

test('the grievance omits penal interest when the claim is not yet late', () => {
  const input = base({ filedOn: daysAgo(6) });
  const letter = delayGrievance(input, assessStatus(input), 'CLM-TEST-2');
  assert.ok(!letter.includes('12%'), 'must not threaten penal interest before it applies');
});

test('the RTI asks for the officer holding the file', () => {
  const rti = delayRti(base(), 'CLM-TEST-3');
  assert.match(rti, /designation of the official presently holding the file/);
  assert.match(rti, /Rs 10/);
  assert.match(rti, /CLM-TEST-3/);
});

test('no generated document contains an em dash', () => {
  const input = base({ filedOn: daysAgo(40) });
  const v = assessStatus(input);
  for (const doc of [delayGrievance(input, v, 'X'), delayRti(input, 'X')]) {
    assert.ok(!/[—–]/.test(doc), 'documents must not contain em or en dashes');
  }
});

test('switching to Hindi translates the advice, not just the labels', () => {
  const late = base({ filedOn: daysAgo(30) });
  const en = assessStatus({ ...late, lang: 'en' });
  const hi = assessStatus({ ...late, lang: 'hi' });

  // Devanagari must actually reach the parts a member reads to decide.
  const deva = /[ऀ-ॿ]/;
  assert.ok(deva.test(hi.summary), 'summary must be Hindi');
  assert.ok(deva.test(hi.owner.whatTheyDo), 'owner explanation must be Hindi');
  assert.ok(deva.test(hi.penalInterest.note), 'penal note must be Hindi');
  assert.ok(hi.unlocked.every((s) => deva.test(s.title) && deva.test(s.detail)), 'every ladder step must be Hindi');

  // and the numbers must not drift between languages
  assert.equal(en.daysElapsed, hi.daysElapsed);
  assert.equal(en.overdueBy, hi.overdueBy);
  assert.deepEqual(en.unlocked.map((s) => s.id), hi.unlocked.map((s) => s.id));
});
