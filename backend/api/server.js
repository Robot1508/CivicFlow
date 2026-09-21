import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { store } from './data/store.js';
import { createCallSession } from './callAgent.js';
import { executeTool, TOOL_DEFINITIONS } from './tools.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Healthcheck
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    service: 'CivicFlow AI Telephony Backend',
    activeCalls: Object.keys(store.activeCalls).length,
    timestamp: new Date().toISOString()
  });
});

// Start AI Call
app.post('/api/call/start', (req, res) => {
  const { complaintId, officerPhone, officerName, department, ward, demoMode } = req.body;

  try {
    const session = createCallSession({
      complaintId,
      officerPhone,
      officerName,
      department,
      ward,
      demoMode: demoMode !== undefined ? demoMode : true
    });

    res.status(201).json({
      success: true,
      message: 'AI Voice Call initiated successfully',
      call: session
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get Call Status
app.get('/api/call/status/:callId', (req, res) => {
  const { callId } = req.params;
  const activeCall = store.activeCalls[callId];
  if (activeCall) {
    return res.json({ success: true, call: activeCall });
  }

  const completedCall = store.callHistory.find(c => c.id === callId);
  if (completedCall) {
    return res.json({ success: true, call: completedCall });
  }

  res.status(404).json({ success: false, error: 'Call session not found' });
});

// Get Call History
app.get('/api/call/history', (req, res) => {
  res.json({
    success: true,
    history: store.callHistory,
    active: Object.values(store.activeCalls)
  });
});

// Terminate Active Call
app.post('/api/call/terminate/:callId', (req, res) => {
  const { callId } = req.params;
  const activeCall = store.activeCalls[callId];

  if (!activeCall) {
    return res.status(404).json({ success: false, error: 'Call not active or not found' });
  }

  executeTool("end_call", { callId, summary: "Terminated manually by Admin" }, activeCall);
  delete store.activeCalls[callId];
  store.callHistory.unshift({ ...activeCall, status: 'COMPLETED' });

  res.json({ success: true, message: 'Call terminated' });
});

// Complaints endpoints
app.get('/api/complaints', (req, res) => {
  res.json({ success: true, complaints: store.complaints });
});

app.patch('/api/complaints/:id', (req, res) => {
  const { id } = req.params;
  const complaint = store.complaints.find(c => c.id === id);
  if (!complaint) {
    return res.status(404).json({ success: false, error: 'Complaint not found' });
  }

  Object.assign(complaint, req.body);
  res.json({ success: true, complaint });
});

// Workers endpoint
app.get('/api/workers', (req, res) => {
  res.json({ success: true, workers: store.workers });
});

// Registered Tools endpoint
app.get('/api/tools', (req, res) => {
  res.json({ success: true, tools: TOOL_DEFINITIONS });
});

// Telephony Webhooks (Dual-port compatibility for tunnel)
app.all('/api/voice/call-dialogue', (req, res) => {
  const ticketId = req.query?.ticketId || req.body?.ticketId || '101';
  const landmark = req.query?.landmark || req.body?.landmark || 'Ward 11';
  const issueType = req.query?.issueType || req.body?.issueType || 'Pipeline Burst';

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather action="/api/voice/call-response?ticketId=${encodeURIComponent(ticketId)}" input="speech dtmf" language="en-IN" numDigits="1" timeout="5">
    <Say voice="Polly.Aditi">Attention, urgent civic alert from CivicFlow dispatch. A critical ${issueType} has been logged near ${landmark}. Press 1 or say Accept to acknowledge dispatch. Press 2 or say Escalate to request municipal supervisor backup.</Say>
  </Gather>
  <Say voice="Polly.Aditi">No response received. Escalating alert to municipal leads. Goodbye.</Say>
  <Hangup/>
</Response>`;

  res.set('Content-Type', 'text/xml');
  res.type('text/xml');
  res.send(twiml);
});

app.all('/api/voice/call-response', (req, res) => {
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Aditi">Response confirmed. Thank you.</Say>
  <Hangup/>
</Response>`;

  res.set('Content-Type', 'text/xml');
  res.type('text/xml');
  res.send(twiml);
});


if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`CivicFlow Telephony Backend listening on http://localhost:${PORT}`);
  });
}

export default app;
