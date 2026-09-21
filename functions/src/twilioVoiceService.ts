import twilio from 'twilio';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

/**
 * CivicFlow Outbound Voice Calling Agent & Twilio Telephony Service
 */

function getTwilioCredentials() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER || '+17372508034';

  return { accountSid, authToken, fromNumber };
}

/**
 * Task 1.1: initiateOutboundCall
 * Request Body: { recipientPhone: string, ticketId: string, landmark: string, issueType: string }
 */
export async function initiateOutboundCall(req: any, res: any) {
  try {
    const { recipientPhone, ticketId = '101', landmark = 'Ward 11', issueType = 'Pipeline Burst' } = req.body || {};

    if (!recipientPhone) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameter: recipientPhone is required.'
      });
    }

    const { accountSid, authToken, fromNumber } = getTwilioCredentials();
    const host = req.get('host') || process.env.PUBLIC_HOST || 'localhost:5001';
    const protocol = req.protocol === 'https' || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';

    const webhookUrl = `${protocol}://${host}/api/voice/call-dialogue?ticketId=${encodeURIComponent(ticketId)}&landmark=${encodeURIComponent(landmark)}&issueType=${encodeURIComponent(issueType)}`;

    let callSid = `CA_DEV_${Date.now()}`;

    if (accountSid && authToken) {
      const client = twilio(accountSid, authToken);
      const call = await client.calls.create({
        to: recipientPhone,
        from: fromNumber,
        url: webhookUrl,
        method: 'POST'
      });
      callSid = call.sid;
      console.log(`[initiateOutboundCall] Call successfully initiated. SID: ${callSid}`);
    } else {
      console.log(`[initiateOutboundCall] Mock mode. Target: ${recipientPhone}, SID: ${callSid}`);
    }

    return res.status(200).json({
      success: true,
      callSid
    });
  } catch (error: any) {
    console.error('[initiateOutboundCall Error]:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to place outbound call'
    });
  }
}

/**
 * Task 1.2: handleCallDialogue
 * Handles both GET and POST requests seamlessly.
 * Returns valid TwiML with Content-Type: text/xml.
 */
export function handleCallDialogue(req: any, res: any) {
  try {
    const ticketId = req.query?.ticketId || req.body?.ticketId || '101';
    const landmark = req.query?.landmark || req.body?.landmark || 'Ward 11';
    const issueType = req.query?.issueType || req.body?.issueType || 'Pipeline Burst';

    const VoiceResponse = twilio.twiml.VoiceResponse;
    const twiml = new VoiceResponse();

    const gather = twiml.gather({
      action: `/api/voice/call-response?ticketId=${encodeURIComponent(ticketId)}`,
      input: ['speech', 'dtmf'],
      language: 'en-IN',
      numDigits: 1,
      timeout: 5
    });

    gather.say(
      { voice: 'Polly.Aditi', language: 'en-IN' },
      `Attention, urgent civic alert from CivicFlow dispatch. A critical ${issueType} has been logged near ${landmark}. Press 1 or say Accept to acknowledge dispatch. Press 2 or say Escalate to request municipal supervisor backup.`
    );

    // Fallback if no response is detected within timeout
    twiml.say(
      { voice: 'Polly.Aditi', language: 'en-IN' },
      'No response received. Escalating alert to municipal leads. Goodbye.'
    );
    twiml.hangup();

    res.set('Content-Type', 'text/xml');
    res.type('text/xml');
    return res.send(twiml.toString());
  } catch (error: any) {
    console.error('[handleCallDialogue Error]:', error);
    const VoiceResponse = twilio.twiml.VoiceResponse;
    const twiml = new VoiceResponse();
    twiml.say('An error occurred during dispatch connection.');
    twiml.hangup();
    res.set('Content-Type', 'text/xml');
    res.type('text/xml');
    return res.status(500).send(twiml.toString());
  }
}

/**
 * Task 1.3: handleCallResponse
 * Processes DTMF Digits or SpeechResult, logs to Firestore, speaks confirmation, and hangs up.
 */
export async function handleCallResponse(req: any, res: any) {
  try {
    const ticketId = req.query?.ticketId || req.body?.ticketId || '101';
    const digits = req.body?.Digits || req.query?.Digits || '';
    const speechResult = req.body?.SpeechResult || req.query?.SpeechResult || '';
    const callSid = req.body?.CallSid || req.query?.CallSid || `CALL-${Date.now()}`;
    const caller = req.body?.From || req.query?.From || 'Unknown';

    let acknowledgementStatus = 'NO_INPUT';
    const speechLower = speechResult.toLowerCase();

    if (digits === '1' || speechLower.includes('accept') || speechLower.includes('acknowledge')) {
      acknowledgementStatus = 'ACCEPTED';
    } else if (digits === '2' || speechLower.includes('escalate') || speechLower.includes('backup') || speechLower.includes('supervisor')) {
      acknowledgementStatus = 'ESCALATED';
    } else if (digits || speechResult) {
      acknowledgementStatus = 'OTHER_RESPONSE';
    }

    // Persist acknowledgement log to Firestore under issues/{ticketId}/call_logs
    try {
      const db = getFirestore();
      await db.collection('issues').doc(ticketId).collection('call_logs').add({
        callSid,
        caller,
        digits,
        speechResult,
        acknowledgementStatus,
        createdAt: FieldValue.serverTimestamp()
      });
      console.log(`[handleCallResponse] Firestore logged for ticket ${ticketId}: ${acknowledgementStatus}`);
    } catch (dbErr: any) {
      console.warn(`[handleCallResponse] Firestore log warning for ticket ${ticketId}:`, dbErr.message);
    }

    const VoiceResponse = twilio.twiml.VoiceResponse;
    const twiml = new VoiceResponse();
    twiml.say({ voice: 'Polly.Aditi', language: 'en-IN' }, 'Response confirmed. Thank you.');
    twiml.hangup();

    res.set('Content-Type', 'text/xml');
    res.type('text/xml');
    return res.send(twiml.toString());
  } catch (error: any) {
    console.error('[handleCallResponse Error]:', error);
    const VoiceResponse = twilio.twiml.VoiceResponse;
    const twiml = new VoiceResponse();
    twiml.say('Response confirmed. Thank you.');
    twiml.hangup();
    res.set('Content-Type', 'text/xml');
    res.type('text/xml');
    return res.status(200).send(twiml.toString());
  }
}
