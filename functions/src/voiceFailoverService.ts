import twilio from 'twilio';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

/**
 * CivicFlow Voice Failover Service (SMS & WhatsApp Fallback Dispatcher)
 * Triggered via Twilio Status Callback when outbound voice alerts are unanswered, busy, or failed.
 */

function getTwilioClient() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  return twilio(accountSid || 'AC_MOCK_SID', authToken || 'MOCK_AUTH_TOKEN');
}

/**
 * Webhook: handleCallStatusCallback
 * POST /api/voice/call-status
 */
export async function handleCallStatusCallback(req: any, res: any) {
  try {
    const callStatus = (req.body?.CallStatus || req.query?.CallStatus || '').toLowerCase();
    const callSid = req.body?.CallSid || req.query?.CallSid || `CALL-${Date.now()}`;
    const toPhone = req.body?.To || req.query?.To || process.env.DEFAULT_DISPATCH_PHONE || '+919370777698';
    
    const ticketId = req.query?.ticketId || req.body?.ticketId || '101';
    const landmark = req.query?.landmark || req.body?.landmark || 'Municipal Ward';
    const issueType = req.query?.issueType || req.body?.issueType || 'Civic Grievance';

    console.log(`[voiceFailoverService] Status callback for call ${callSid}: ${callStatus}`);

    const failedStatuses = ['busy', 'no-answer', 'failed', 'canceled'];

    if (failedStatuses.includes(callStatus)) {
      console.warn(`[voiceFailoverService] Call ${callSid} failed with status "${callStatus}". Initiating emergency SMS/WhatsApp failover.`);

      const messageBody = `EMERGENCY DISPATCH MISSED: Critical ${issueType} at ${landmark}. Voice alert was unanswered. Please verify and acknowledge immediately at: https://fixithub-5fe6e.web.app/ticket/${ticketId}`;
      const fromNumber = process.env.TWILIO_PHONE_NUMBER || '+17372508034';

      let messageSid = `SM_FAILOVER_${Date.now()}`;

      if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
        try {
          const client = getTwilioClient();
          const message = await client.messages.create({
            body: messageBody,
            from: fromNumber,
            to: toPhone
          });
          messageSid = message.sid;
          console.log(`[voiceFailoverService] Emergency fallback message sent to ${toPhone}. SID: ${messageSid}`);
        } catch (msgErr: any) {
          console.error(`[voiceFailoverService] Failed to send SMS via Twilio:`, msgErr.message);
        }
      } else {
        console.log(`[voiceFailoverService] Mock SMS dispatched to ${toPhone}: "${messageBody}"`);
      }

      // Append failure and failover record to Firestore: issues/{ticketId}/dispatch_logs
      try {
        const db = getFirestore();
        await db.collection('issues').doc(ticketId).collection('dispatch_logs').add({
          event: 'voice_call_unanswered_fallback',
          callSid,
          callStatus,
          recipientPhone: toPhone,
          fallbackChannel: 'SMS',
          fallbackMessageSid: messageSid,
          messageBody,
          timestamp: FieldValue.serverTimestamp()
        });
        console.log(`[voiceFailoverService] Recorded failover log in Firestore for ticket ${ticketId}`);
      } catch (dbErr: any) {
        console.warn(`[voiceFailoverService] Firestore log error for ticket ${ticketId}:`, dbErr.message);
      }
    }

    return res.status(200).json({
      success: true,
      callStatus,
      failoverTriggered: failedStatuses.includes(callStatus)
    });
  } catch (error: any) {
    console.error('[handleCallStatusCallback Error]:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Status callback processing error'
    });
  }
}

export default handleCallStatusCallback;
