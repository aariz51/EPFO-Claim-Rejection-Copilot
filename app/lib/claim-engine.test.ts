import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildGrievance,
  decodeRejection,
  evaluateClaim,
  sampleRecord,
  sampleRejections,
} from './claim-engine.ts';

test('housing pre-check exposes the exact service gap', () => {
  const report = evaluateClaim(sampleRecord, '31', 'housing', 300_000);
  const service = report.checks.find((check) => check.id === 'service');
  const sync = report.checks.find((check) => check.id === 'sync');

  assert.equal(report.status, 'needs-fix');
  assert.equal(service?.required, '60 months');
  assert.equal(service?.actual, '56 months');
  assert.equal(service?.gap, '4 months short');
  assert.equal(sync?.gap, '38 months missing');
});

test('medical advance can pass while preserving the service-sync warning', () => {
  const report = evaluateClaim(sampleRecord, '31', 'illness', 150_000);
  const service = report.checks.find((check) => check.id === 'service');
  const sync = report.checks.find((check) => check.id === 'sync');

  assert.equal(report.status, 'ready');
  assert.equal(report.maximumEligibleAmount, 168_000);
  assert.equal(service?.status, 'pass');
  assert.equal(sync?.status, 'warning');
  assert.equal(report.readiness, 90);
});

test('amount ceiling is a blocker when a medical advance exceeds six months wages', () => {
  const report = evaluateClaim(sampleRecord, '31', 'illness', 300_000);
  const amount = report.checks.find((check) => check.id === 'amount');

  assert.equal(report.status, 'needs-fix');
  assert.equal(amount?.status, 'blocker');
  assert.equal(amount?.required, 'At most ₹1,68,000');
  assert.equal(amount?.gap, '₹1,32,000 over the limit');
});

test('final settlement blocks an actively employed record', () => {
  const report = evaluateClaim(sampleRecord, '19', 'housing', 300_000);
  const exit = report.checks.find((check) => check.id === 'exit');

  assert.equal(report.status, 'needs-fix');
  assert.equal(exit?.actual, 'Currently employed');
  assert.equal(exit?.ruleId, 'EPF-2026-PROLONGED-EXIT');
});

test('EPS withdrawal preserves eligible service but blocks an active employment', () => {
  const report = evaluateClaim(sampleRecord, '10C', 'housing', 0);
  const service = report.checks.find((check) => check.id === 'eps-service');
  const exit = report.checks.find((check) => check.id === 'eps-exit');

  assert.equal(service?.status, 'pass');
  assert.equal(service?.actual, '7y 10m');
  assert.equal(exit?.status, 'blocker');
});

test('decoder maps every sample rejection to a specific remedy', () => {
  assert.deepEqual(
    sampleRejections.map((message) => decodeRejection(message).remedyCode),
    [
      'LEDGER_RECONCILIATION',
      'SYNC_EPS_SERVICE',
      'VERIFY_EXIT_RULE_VERSION',
      'MANUAL_MIGRATION_REVIEW',
    ],
  );
});

test('decoder falls back without inventing a diagnosis', () => {
  const decoded = decodeRejection('Rejected. Contact office.');

  assert.equal(decoded.code, 'NEEDS-MANUAL-REVIEW');
  assert.equal(decoded.remedyCode, 'REQUEST_STRUCTURED_REASON');
});

test('grievance asks for a structured response and includes the claim reference', () => {
  const decoded = decodeRejection(sampleRejections[1]);
  const grievance = buildGrievance(sampleRecord, decoded, 'CLAIM-DEMO-1042');

  assert.match(grievance, /CLAIM-DEMO-1042/);
  assert.match(grievance, /required value, actual value and remedy code/);
  assert.match(grievance, /38 months/);
  assert.match(grievance, /synthetic data/);
});
