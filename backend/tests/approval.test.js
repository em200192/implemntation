import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPlanApproval } from '../src/services/workflow.js';

test('buildPlanApproval approves plan', () => {
  const result = buildPlanApproval({ action: 'approve' });
  assert.deepEqual(result, { status: 'Approved', manager_notes: null });
});

test('buildPlanApproval rejects plan with reason', () => {
  const result = buildPlanApproval({ action: 'reject', reason: 'Need more detail' });
  assert.deepEqual(result, { status: 'Rejected', manager_notes: 'Need more detail' });
});
