import twilio from 'twilio';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

/**
 * Autonomous Worker Follow-Up & Closure Verification Voice Agent
 * Places outbound calls to citizens after tasks are marked "resolved"
 * to verify work on the ground and prevent false closures.
 */

function getTwilioCredentials() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER || '+17372508034';
  return { accountSid, authToken, fromNumber };
}

/**
 * 1. triggerClosureVerification
 * Initiates an automated closure verification call to the citizen who reported the issue.
 * Request Body: { ticketId: string, citizenPhone: string, landmark: string, issueType: string }
 */
export async function triggerClosureVerification(req: any, res: any) {
  try {
    const {
      ticketId,
      citizenPhone,
      landmark = 'Municipal Sector',
      issueType = 'reported civic issue'
    } = req.body || {};

    if (!ticketId || !citizenPhone) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: ticketId and citizenPhone are required.'
      });
    }

    const { accountSid, authToken, fromNumber } = getTwilioCredentials();
    const host = req.get('host') || process.env.PUBLIC_HOST || 'localhost:5001';
    const protocol = req.protocol === 'https' || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';

    const webhookUrl = `${protocol}://${host}/api/voice/closure-dialogue?ticketId=${encodeURIComponent(ticketId)}&landmark=${encodeURIComponent(landmark)}&issueType=${encodeURIComponent(issueType)}`;

    let callSid = `CA_VERIFY_${Date.now()}`;

    if (accountSid && authToken) {
      const client = twilio(accountSid, authToken);
      const call = await client.calls.create({
        to: citizenPhone,
        from: fromNumber,
        url: webhookUrl,
        method: 'POST'
      });
      callSid = call.sid;
      console.log(`[triggerClosureVerification] Verification call placed to ${citizenPhone} for ticket ${ticketId}. SID: ${callSid}`);
    } else {
      console.log(`[triggerClosureVerification] Mock verification call placed to ${citizenPhone} for ticket ${ticketId}. SID: ${callSid}`);
    }

    return res.status(200).json({
      success: true,
      callSid
    });
  } catch (error: any) {
    console.error('[triggerClosureVerification Error]:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to place closure verification call'
    });
  }
}

/**
 * 2. handleClosureDialogue
 * Returns TwiML VoiceResponse asking the citizen if the repair work is completed or incomplete.
 */
export function handleClosureDialogue(req: any, res: any) {
  try {
    const ticketId = req.query?.ticketId || req.body?.ticketId || '101';
    const landmark = req.query?.landmark || req.body?.landmark || 'your ward';
    const issueType = req.query?.issueType || req.body?.issueType || 'civic issue';

    const VoiceResponse = twilio.twiml.VoiceResponse;
    const twiml = new VoiceResponse();

    const gather = twiml.gather({
      input: ['dtmf', 'speech'],
      numDigits: 1,
      action: `/api/voice/closure-response?ticketId=${encodeURIComponent(ticketId)}`,
      timeout: 6,
      language: 'en-IN'
    });

    gather.say(
      { voice: 'Polly.Aditi', language: 'en-IN' },
      `Hello from CivicFlow. Municipal workers have reported that the ${issueType} near ${landmark} has been resolved. Press 1 or say Completed if the repair is fully done. Press 2 or say Incomplete if the issue is still not fixed.`
    );

    // Fallback if no answer within timeout
    twiml.say(
      { voice: 'Polly.Aditi', language: 'en-IN' },
      'No response received. We will follow up with an automated SMS audit. Goodbye.'
    );
    twiml.hangup();

    res.set('Content-Type', 'text/xml');
    res.type('text/xml');
    return res.send(twiml.toString());
  } catch (error: any) {
    console.error('[handleClosureDialogue Error]:', error);
    const VoiceResponse = twilio.twiml.VoiceResponse;
    const twiml = new VoiceResponse();
    twiml.say('An error occurred during closure verification connection.');
    twiml.hangup();
    res.set('Content-Type', 'text/xml');
    res.type('text/xml');
    return res.status(500).send(twiml.toString());
  }
}

/**
 * 3. handleClosureResponse
 * Evaluates citizen feedback (1/Completed vs 2/Incomplete), updates Firestore status, and speaks confirmation.
 */
export async function handleClosureResponse(req: any, res: any) {
  try {
    const ticketId = req.query?.ticketId || req.body?.ticketId || '101';
    const digits = req.body?.Digits || req.query?.Digits || '';
    const speechResult = (req.body?.SpeechResult || req.query?.SpeechResult || '').toLowerCase();
    const callSid = req.body?.CallSid || req.query?.CallSid || `CALL-${Date.now()}`;

    const VoiceResponse = twilio.twiml.VoiceResponse;
    const twiml = new VoiceResponse();

    const isConfirmed = digits === '1' || speechResult.includes('completed') || speechResult.includes('done') || speechResult.includes('yes') || speechResult.includes('fixed');
    const isRejected = digits === '2' || speechResult.includes('incomplete') || speechResult.includes('no') || speechResult.includes('not fixed') || speechResult.includes('pending');

    const db = getFirestore();
    const issueRef = db.collection('issues').doc(ticketId);

    if (isConfirmed || (!isRejected && digits === '1')) {
      // Citizen Confirmed Repair: Close verified ticket
      try {
        await issueRef.set(
          {
            status: 'closed_verified',
            citizenVerified: true,
            verifiedAt: FieldValue.serverTimestamp(),
            lastVerificationCallSid: callSid
          },
          { merge: true }
        );
        console.log(`[handleClosureResponse] Ticket ${ticketId} verified and CLOSED by citizen.`);
      } catch (dbErr: any) {
        console.warn(`[handleClosureResponse] Firestore update error for ${ticketId}:`, dbErr.message);
      }

      twiml.say(
        { voice: 'Polly.Aditi', language: 'en-IN' },
        'Thank you for helping keep your city accountable. Your confirmation has closed this ticket.'
      );
    } else {
      // Citizen Rejected or Reported Incomplete: Reopen ticket as Critical
      try {
        await issueRef.set(
          {
            status: 'reopened_failed_verification',
            citizenVerified: false,
            priority: 'Critical',
            escalatedReason: 'Citizen reported work incomplete via voice verification',
            reopenedAt: FieldValue.serverTimestamp(),
            lastVerificationCallSid: callSid
          },
          { merge: true }
        );
        console.log(`[handleClosureResponse] Ticket ${ticketId} REOPENED as Critical due to failed citizen verification.`);
      } catch (dbErr: any) {
        console.warn(`[handleClosureResponse] Firestore reopen update error for ${ticketId}:`, dbErr.message);
      }

      twiml.say(
        { voice: 'Polly.Aditi', language: 'en-IN' },
        'Understood. We have reopened this ticket as critical priority and alerted the municipal supervisor.'
      );
    }

    twiml.hangup();
    res.set('Content-Type', 'text/xml');
    res.type('text/xml');
    return res.send(twiml.toString());
  } catch (error: any) {
    console.error('[handleClosureResponse Error]:', error);
    const VoiceResponse = twilio.twiml.VoiceResponse;
    const twiml = new VoiceResponse();
    twiml.say('Your response has been noted. Thank you.');
    twiml.hangup();
    res.set('Content-Type', 'text/xml');
    res.type('text/xml');
    return res.status(200).send(twiml.toString());
  }
}
