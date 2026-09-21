import express from 'express';
import cors from 'cors';
import { onRequest } from 'firebase-functions/v2/https';
import {
  initiateOutboundCall,
  handleCallDialogue,
  handleCallResponse
} from './twilioVoiceService.js';
import {
  handleStreamConnect,
  setupRealtimeVoiceStreamServer
} from './realtimeVoiceStream.js';
import {
  handleInboundIntake,
  processCitizenReport
} from './inboundVoicePipeline.js';
import {
  triggerClosureVerification,
  handleClosureDialogue,
  handleClosureResponse
} from './verificationVoiceAgent.js';
import {
  handleCallStatusCallback
} from './voiceFailoverService.js';
import {
  onIssueCreated,
  onIssueUpdated
} from './autoCallTrigger.js';
import { analyzeIssue } from './analyzeIssue.js';

/**
 * CivicFlow Cloud Functions & Express Voice API Router
 */
const app = express();

// Enable CORS for API requests including /api/voice/trigger-call
app.use(cors({ origin: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 1. Telephony Outbound Trigger Route (with CORS enabled)
app.post('/api/voice/trigger-call', cors({ origin: true }), initiateOutboundCall);

// 2. Telephony TwiML Gather Dialogue Route (supports GET & POST)
app.all('/api/voice/call-dialogue', handleCallDialogue);

// 3. Telephony TwiML Response & Firestore Logging Route (supports GET & POST)
app.all('/api/voice/call-response', handleCallResponse);

// 4. Real-time WebSocket Stream Connect TwiML Route
app.all('/api/voice/stream-connect', handleStreamConnect);

// 5. Inbound Citizen Voice Hotline Routes (Speech-to-Ticket Pipeline)
app.all('/api/voice/inbound-intake', handleInboundIntake);
app.all('/api/voice/process-citizen-report', processCitizenReport);

// 6. Autonomous Worker Follow-Up & Closure Verification Routes
app.post('/api/voice/trigger-closure-verification', cors({ origin: true }), triggerClosureVerification);
app.all('/api/voice/closure-dialogue', handleClosureDialogue);
app.all('/api/voice/closure-response', handleClosureResponse);

// 7. Voice Failover Status Callback (SMS/WhatsApp Fallback)
app.post('/api/voice/call-status', handleCallStatusCallback);
app.all('/api/voice/call-status', handleCallStatusCallback);

// 8. Issue Analysis Endpoint
app.post('/api/issues/analyze', async (req, res) => {
  try {
    const result = await analyzeIssue(req.body);
    res.json({ success: true, analysis: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Export Cloud Functions HTTPS endpoint
export const api = onRequest(app);

// Export Firestore Background Triggers
export { onIssueCreated, onIssueUpdated };

// Export Services and Utilities for direct Node.js / Express imports
export {
  initiateOutboundCall,
  handleCallDialogue,
  handleCallResponse,
  handleStreamConnect,
  setupRealtimeVoiceStreamServer,
  handleInboundIntake,
  processCitizenReport,
  triggerClosureVerification,
  handleClosureDialogue,
  handleClosureResponse,
  handleCallStatusCallback,
  analyzeIssue
};

export default app;
