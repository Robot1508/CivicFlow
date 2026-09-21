import assert from 'node:assert';
import test, { describe } from 'node:test';
import { executeTool } from '../tools.js';
import { createCallSession } from '../callAgent.js';
import { store } from '../data/store.js';

describe('Municipal Telephony Tools & Call Agent (Native Tests)', () => {
  test('executeTool: update_resolution_eta updates complaint state and callSession', () => {
    const session = {
      id: 'CALL-TEST-1',
      complaintId: 'CP-2001',
      toolsTriggered: [],
      extractedData: {}
    };

    const result = executeTool('update_resolution_eta', {
      complaintId: 'CP-2001',
      etaHoursOrDescription: '4 hours'
    }, session);

    assert.strictEqual(result.success, true);
    assert.strictEqual(session.extractedData.eta, '4 hours');
    assert.ok(session.toolsTriggered.includes('update_resolution_eta'));
  });

  test('executeTool: request_materials adds requisition to callSession', () => {
    const session = {
      id: 'CALL-TEST-2',
      complaintId: 'CP-2001',
      toolsTriggered: [],
      extractedData: {}
    };

    const result = executeTool('request_materials', {
      complaintId: 'CP-2001',
      materialsList: ['Relay CP-9', 'PVC Pipe 2m']
    }, session);

    assert.strictEqual(result.success, true);
    assert.deepStrictEqual(session.extractedData.materialsNeeded, ['Relay CP-9', 'PVC Pipe 2m']);
    assert.ok(session.toolsTriggered.includes('request_materials'));
  });

  test('createCallSession: creates an active call session in DEMO_MODE', () => {
    const session = createCallSession({
      complaintId: 'CP-2001',
      officerPhone: '+919876543210',
      officerName: 'Dnyaneshwar Jadhav',
      department: 'Infrastructure',
      ward: 'Ward 3',
      demoMode: true
    });

    assert.ok(session.id);
    assert.strictEqual(session.status, 'RINGING');
    assert.ok(store.activeCalls[session.id]);
  });
});
