import { executeTool } from '../tools.js';
import { createCallSession } from '../callAgent.js';
import { store } from '../data/store.js';
import request from 'supertest';
import app from '../server.js';

describe('Municipal Telephony Tools & Call Agent', () => {
  beforeEach(() => {
    store.activeCalls = {};
  });

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

    expect(result.success).toBe(true);
    expect(session.extractedData.eta).toBe('4 hours');
    expect(session.toolsTriggered).toContain('update_resolution_eta');
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

    expect(result.success).toBe(true);
    expect(session.extractedData.materialsNeeded).toEqual(['Relay CP-9', 'PVC Pipe 2m']);
    expect(session.toolsTriggered).toContain('request_materials');
  });

  test('createCallSession: creates a active call session in DEMO_MODE', () => {
    const session = createCallSession({
      complaintId: 'CP-2001',
      officerPhone: '+919876543210',
      officerName: 'Dnyaneshwar Jadhav',
      department: 'Infrastructure',
      ward: 'Ward 3',
      demoMode: true
    });

    expect(session.id).toBeDefined();
    expect(session.status).toBe('RINGING');
    expect(store.activeCalls[session.id]).toBeDefined();
  });

  test('Express API: GET /api/health returns online status', async () => {
    const response = await request(app).get('/api/health');
    expect(response.statusCode).toBe(200);
    expect(response.body.status).toBe('online');
  });

  test('Express API: POST /api/call/start starts call', async () => {
    const response = await request(app)
      .post('/api/call/start')
      .send({
        complaintId: 'CP-2001',
        officerPhone: '+919876543210',
        officerName: 'Dnyaneshwar Jadhav',
        department: 'Infrastructure',
        ward: 'Ward 3',
        demoMode: true
      });

    expect(response.statusCode).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.call.id).toBeDefined();
  });
});
