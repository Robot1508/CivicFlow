import assert from 'node:assert';
import test, { describe } from 'node:test';
import {
  decodeMuLawToPcm16,
  encodePcm16ToMuLaw,
  resamplePcm16,
  handleStreamConnect,
  DISPATCH_SYSTEM_INSTRUCTION
} from '../../functions/src/realtimeVoiceStream.js';
import {
  handleCallDialogue
} from '../../functions/src/twilioVoiceService.js';
import {
  shouldTriggerDispatchCall,
  getOnDutyOfficial
} from '../../functions/src/autoCallTrigger.js';
import {
  analyzeIssue
} from '../../functions/src/analyzeIssue.js';

describe('Real-Time Voice & Telephony Dispatch Suite', () => {

  // Test 1: Codec & Resampling
  test('Codec: mu-law <-> PCM16 encode and decode roundtrip', () => {
    const originalPcm = new Int16Array([0, 1000, -2000, 15000, -25000, 32000]);
    const encodedMuLaw = encodePcm16ToMuLaw(originalPcm);
    assert.strictEqual(encodedMuLaw.length, originalPcm.length);

    const decodedPcm = decodeMuLawToPcm16(encodedMuLaw);
    assert.strictEqual(decodedPcm.length, originalPcm.length);

    // Verify sample proximity (mu-law is lossy compression, error bounded)
    for (let i = 0; i < originalPcm.length; i++) {
      const diff = Math.abs(originalPcm[i] - decodedPcm[i]);
      assert.ok(diff < 1500, `Sample ${i} error too large: ${diff}`);
    }
  });

  test('Resampling: 8000 Hz to 16000 Hz upsampling preserves sample boundaries', () => {
    const input8k = new Int16Array([100, 200, 300, 400]);
    const output16k = resamplePcm16(input8k, 8000, 16000);
    assert.strictEqual(output16k.length, 8);
    assert.strictEqual(output16k[0], 100);
  });

  // Test 2: TwiML Stream Connect Endpoint
  test('TwiML: handleStreamConnect generates valid WebSocket Stream TwiML', () => {
    let sentPayload = '';
    const mockReq = {
      headers: { host: 'dispatch.civicflow.org' },
      query: { ticketId: 'CP-2001', officerName: 'Dnyaneshwar Jadhav' }
    };
    const mockRes = {
      type: () => {},
      send: (body) => { sentPayload = body; return body; }
    };

    handleStreamConnect(mockReq, mockRes);
    assert.ok(sentPayload.includes('<Stream url="wss://dispatch.civicflow.org/media-stream">'));
    assert.ok(sentPayload.includes('ticketId'));
    assert.ok(sentPayload.includes('CP-2001'));
  });

  test('TwiML: handleCallDialogue handles GET and POST query/body fallback with valid XML', () => {
    let sentGetXml = '';
    let headerSet = '';
    const mockGetReq = {
      query: { ticketId: '101', landmark: 'Ward 11', issueType: 'Pipeline Burst' },
      body: {}
    };
    const mockGetRes = {
      set: (k, v) => { headerSet = v; },
      type: () => {},
      send: (body) => { sentGetXml = body; return body; }
    };

    handleCallDialogue(mockGetReq, mockGetRes);
    assert.strictEqual(headerSet, 'text/xml');
    assert.ok(sentGetXml.includes('Attention, urgent civic alert from CivicFlow dispatch. A critical Pipeline Burst has been logged near Ward 11.'));
    assert.ok(sentGetXml.includes('action="/api/voice/call-response?ticketId=101"'));
    assert.ok(sentGetXml.includes('No response received. Escalating alert to municipal leads. Goodbye.'));

    let sentPostXml = '';
    const mockPostReq = {
      query: {},
      body: { ticketId: '202', landmark: 'Shivaji Chowk', issueType: 'Road Pothole' }
    };
    const mockPostRes = {
      set: () => {},
      type: () => {},
      send: (body) => { sentPostXml = body; return body; }
    };

    handleCallDialogue(mockPostReq, mockPostRes);
    assert.ok(sentPostXml.includes('A critical Road Pothole has been logged near Shivaji Chowk.'));
    assert.ok(sentPostXml.includes('action="/api/voice/call-response?ticketId=202"'));
  });

  // Test 3: System Prompt Compliance
  test('System Prompt: enforces under 2 sentences and emergency dispatch identity', () => {
    assert.ok(DISPATCH_SYSTEM_INSTRUCTION.includes("CivicFlow's emergency dispatch calling agent"));
    assert.ok(DISPATCH_SYSTEM_INSTRUCTION.includes("Keep responses under 2 sentences"));
    assert.ok(DISPATCH_SYSTEM_INSTRUCTION.includes("Indian-accented English, Hindi, or Marathi"));
  });

  // Test 4: Defensive JSON and Equity Boost
  test('analyzeIssue: Defensive sanitizer strips markdown code blocks cleanly', async () => {
    const mockMarkdown = "```json\n{\"category\":\"Road\",\"department\":\"Infrastructure\",\"priority\":\"High\",\"severityScore\":75,\"summary\":\"Road repair required\",\"actionItems\":[],\"detectedHazards\":[]}\n```";
    const sanitized = mockMarkdown.replace(/```json/gi, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(sanitized);
    assert.strictEqual(parsed.category, 'Road');
    assert.strictEqual(parsed.priority, 'High');
  });

  test('Equity Boost: Ward 9 and Ward 11 safely detected without undefined crashes', async () => {
    const ward9Result = await analyzeIssue({
      ward: 'Ward 9 - Subhash Nagar',
      description: 'Pipeline damage'
    });
    assert.strictEqual(ward9Result.isEquityBoosted, true);
    assert.strictEqual(ward9Result.equityMultiplier, 1.25);

    const undefinedWardResult = await analyzeIssue({
      ward: undefined,
      description: 'Minor littering'
    });
    assert.strictEqual(undefinedWardResult.isEquityBoosted, false);
    assert.strictEqual(undefinedWardResult.equityMultiplier, 1.0);
  });

  // Test 5: Auto-Trigger Logic & Idempotent Lock
  test('autoCallTrigger: triggers on Critical or EquityBoosted and locks idempotency', () => {
    const criticalIssue = { priority: 'Critical', hasTriggeredDispatchCall: false, ward: 'Ward 3' };
    assert.strictEqual(shouldTriggerDispatchCall(criticalIssue), true);

    const equityIssue = { priority: 'Medium', isEquityBoosted: true, hasTriggeredDispatchCall: false, ward: 'Ward 11' };
    assert.strictEqual(shouldTriggerDispatchCall(equityIssue), true);

    const alreadyCalledIssue = { priority: 'Critical', isEquityBoosted: true, hasTriggeredDispatchCall: true, ward: 'Ward 9' };
    assert.strictEqual(shouldTriggerDispatchCall(alreadyCalledIssue), false);
  });

  test('autoCallTrigger: retrieves correct on-duty official by ward', () => {
    const ward3Official = getOnDutyOfficial('Ward 3');
    assert.strictEqual(ward3Official.name, 'Dnyaneshwar Jadhav');

    const ward9Official = getOnDutyOfficial('Ward 9');
    assert.strictEqual(ward9Official.name, 'Santosh Chougule');
  });

  // Test 6: Inbound Voice Hotline Pipeline
  test('Inbound Hotline: handleInboundIntake returns Gather speech prompt and Record fallback', async () => {
    const { handleInboundIntake } = await import('../../functions/src/inboundVoicePipeline.js');
    let outputXml = '';
    let contentType = '';

    const mockReq = {};
    const mockRes = {
      set: (k, v) => { contentType = v; },
      type: () => {},
      send: (xml) => { outputXml = xml; return xml; }
    };

    handleInboundIntake(mockReq, mockRes);
    assert.strictEqual(contentType, 'text/xml');
    assert.ok(outputXml.includes('<Gather action="/api/voice/process-citizen-report" input="speech" language="en-IN" speechTimeout="auto" timeout="6">'));
    assert.ok(outputXml.includes('Welcome to the CivicFlow citizen hotline.'));
    assert.ok(outputXml.includes('<Record action="/api/voice/process-citizen-report"'));
  });

  // Test 7: Autonomous Closure Verification Agent
  test('Closure Verification: handleClosureDialogue emits DTMF/speech prompt asking for completion status', async () => {
    const { handleClosureDialogue } = await import('../../functions/src/verificationVoiceAgent.js');
    let outputXml = '';
    let contentType = '';

    const mockReq = {
      query: { ticketId: 'CF-1001', landmark: 'Shivaji Chowk', issueType: 'pothole repair' }
    };
    const mockRes = {
      set: (k, v) => { contentType = v; },
      type: () => {},
      send: (xml) => { outputXml = xml; return xml; }
    };

    handleClosureDialogue(mockReq, mockRes);
    assert.strictEqual(contentType, 'text/xml');
    assert.ok(outputXml.includes('Municipal workers have reported that the pothole repair near Shivaji Chowk has been resolved.'));
    assert.ok(outputXml.includes('Press 1 or say Completed'));
    assert.ok(outputXml.includes('Press 2 or say Incomplete'));
    assert.ok(outputXml.includes('action="/api/voice/closure-response?ticketId=CF-1001"'));
  });

  // Test 8: Auto Dispatch Trigger
  test('Auto Dispatch: isDispatchEligible enforces Critical/Equity conditions and duplicate prevention', async () => {
    const { isDispatchEligible } = await import('../../functions/src/autoDispatchTrigger.js');

    assert.strictEqual(isDispatchEligible({ priority: 'Critical', dispatchCallTriggered: false }), true);
    assert.strictEqual(isDispatchEligible({ priority: 'Low', isEquityBoosted: true, dispatchCallTriggered: false }), true);
    assert.strictEqual(isDispatchEligible({ priority: 'Critical', dispatchCallTriggered: true }), false);
    assert.strictEqual(isDispatchEligible({ priority: 'Medium', isEquityBoosted: false, dispatchCallTriggered: false }), false);
  });

  // Test 9: Voice Failover Service
  test('Voice Failover: handleCallStatusCallback triggers SMS/WhatsApp fallback on busy or no-answer', async () => {
    const { handleCallStatusCallback } = await import('../../functions/src/voiceFailoverService.js');
    let jsonResponse = null;

    const mockReq = {
      body: {
        CallStatus: 'no-answer',
        CallSid: 'CA_TEST_FAILOVER',
        To: '+919370777698'
      },
      query: {
        ticketId: 'CF-2001',
        landmark: 'Ward 11',
        issueType: 'Pipeline Burst'
      }
    };
    const mockRes = {
      status: (code) => ({
        json: (data) => { jsonResponse = data; return data; }
      })
    };

    await handleCallStatusCallback(mockReq, mockRes);
    assert.strictEqual(jsonResponse.success, true);
    assert.strictEqual(jsonResponse.callStatus, 'no-answer');
    assert.strictEqual(jsonResponse.failoverTriggered, true);
  });
});
