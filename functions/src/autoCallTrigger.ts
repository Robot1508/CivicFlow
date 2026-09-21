import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import twilio from 'twilio';

/**
 * On-duty municipal ward roster directory
 */
const WARD_OFFICIAL_ROSTER: Record<string, { name: string; phone: string; department: string }> = {
  'ward 1': { name: 'Kavita Shinde', phone: '+919876543201', department: 'Sanitation' },
  'ward 2': { name: 'Sunil Rao', phone: '+919876543202', department: 'Infrastructure' },
  'ward 3': { name: 'Dnyaneshwar Jadhav', phone: '+919876543210', department: 'Infrastructure' },
  'ward 4': { name: 'Anil Deshmukh', phone: '+919876543204', department: 'Electrical' },
  'ward 5': { name: 'Pooja Kulkarni', phone: '+919876543205', department: 'Public Health' },
  'ward 6': { name: 'Rajan Bhosale', phone: '+919876543214', department: 'Traffic Control' },
  'ward 7': { name: 'Vishwas Kamble', phone: '+919876543211', department: 'Sanitation' },
  'ward 8': { name: 'Meena Gaikwad', phone: '+919876543208', department: 'Infrastructure' },
  'ward 9': { name: 'Santosh Chougule', phone: '+919876543212', department: 'Water Supply' },
  'ward 10': { name: 'Sachin Patil', phone: '+919876543210', department: 'Disaster Management' },
  'ward 11': { name: 'Deepak More', phone: '+919876543211', department: 'Public Works' }
};

/**
 * Retrieve on-duty official for a given ward or landmark
 */
export function getOnDutyOfficial(ward?: string, landmark?: string) {
  const normalizedWard = (ward || '').toLowerCase().trim();
  for (const [key, official] of Object.entries(WARD_OFFICIAL_ROSTER)) {
    if (normalizedWard.includes(key) || (landmark && landmark.toLowerCase().includes(key))) {
      return official;
    }
  }

  // Check specific landmark keywords
  if (landmark) {
    const lLower = landmark.toLowerCase();
    if (lLower.includes('market') || lLower.includes('shivaji')) {
      return WARD_OFFICIAL_ROSTER['ward 3'];
    }
    if (lLower.includes('subhash') || lLower.includes('water')) {
      return WARD_OFFICIAL_ROSTER['ward 9'];
    }
  }

  // Default fallback official
  return {
    name: 'Municipal Duty Officer',
    phone: process.env.EMERGENCY_DISPATCH_PHONE || '+919876543210',
    department: 'Central Emergency Dispatch'
  };
}

/**
 * Check if the issue satisfies the automated dispatch call trigger conditions
 */
export function shouldTriggerDispatchCall(issueData: any): boolean {
  if (!issueData) return false;

  // 1. Strict Idempotency check
  if (issueData.hasTriggeredDispatchCall === true) {
    return false;
  }

  // 2. Critical Priority or Equity-Boosted
  const isCritical = String(issueData.priority || '').toLowerCase() === 'critical';
  const isEquityBoosted = Boolean(issueData.isEquityBoosted === true);

  return isCritical || isEquityBoosted;
}

/**
 * Executes the outbound call and updates Firestore with idempotent lock
 */
export async function executeAutoDispatchCall(issueId: string, issueData: any) {
  const db = getFirestore();
  const issueRef = db.collection('issues').doc(issueId);

  const official = getOnDutyOfficial(issueData.ward, issueData.landmark);
  const recipientPhone = issueData.assignedToPhone || official.phone;
  const issueType = issueData.category || issueData.title || 'Critical Issue';
  const landmark = issueData.landmark || issueData.ward || 'Assigned Sector';

  console.log(`[autoCallTrigger] Triggering auto outbound call for issue ${issueId} to ${official.name} (${recipientPhone})`);

  let callSid = `CA_AUTO_${Date.now()}`;
  let dispatchCallStatus = 'initiated';
  let errorMessage: string | null = null;

  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromPhone = process.env.TWILIO_PHONE_NUMBER || '+1234567890';
    const host = process.env.PUBLIC_HOST || process.env.STREAM_HOST || 'civicflow-dispatch.local';
    const webhookUrl = `https://${host}/api/voice/call-dialogue?ticketId=${encodeURIComponent(issueId)}&landmark=${encodeURIComponent(landmark)}&issueType=${encodeURIComponent(issueType)}`;

    if (accountSid && authToken) {
      const client = twilio(accountSid, authToken);
      const call = await client.calls.create({
        to: recipientPhone,
        from: fromPhone,
        url: webhookUrl,
        method: 'POST'
      });
      callSid = call.sid;
      console.log(`[autoCallTrigger] Twilio call created successfully: ${callSid}`);
    } else {
      console.log(`[autoCallTrigger] DEMO_MODE: Telephony credentials not set, simulated callSid: ${callSid}`);
    }
  } catch (err: any) {
    console.error(`[autoCallTrigger] Telephony error for issue ${issueId}:`, err.message);
    dispatchCallStatus = 'failed';
    errorMessage = err.message;
  }

  // Idempotent write to Firestore
  try {
    await issueRef.set(
      {
        hasTriggeredDispatchCall: true,
        lastCallDispatchedAt: FieldValue.serverTimestamp(),
        dispatchCallStatus,
        dispatchCallSid: callSid,
        dispatchedTo: {
          officerName: official.name,
          officerPhone: recipientPhone,
          department: official.department
        },
        ...(errorMessage ? { dispatchCallError: errorMessage } : {})
      },
      { merge: true }
    );
    console.log(`[autoCallTrigger] Firestore updated for issue ${issueId} with hasTriggeredDispatchCall=true`);
  } catch (dbErr: any) {
    console.error(`[autoCallTrigger] Failed to update Firestore for ${issueId}:`, dbErr.message);
  }
}

/**
 * Firestore Background Trigger: onDocumentCreated for path 'issues/{issueId}'
 */
export const onIssueCreated = onDocumentCreated('issues/{issueId}', async (event) => {
  const snapshot = event.data;
  if (!snapshot) return;

  const issueData = snapshot.data();
  const issueId = event.params.issueId;

  if (shouldTriggerDispatchCall(issueData)) {
    await executeAutoDispatchCall(issueId, issueData);
  }
});

/**
 * Firestore Background Trigger: onDocumentUpdated for path 'issues/{issueId}'
 */
export const onIssueUpdated = onDocumentUpdated('issues/{issueId}', async (event) => {
  const change = event.data;
  if (!change) return;

  const beforeData = change.before.data();
  const afterData = change.after.data();
  const issueId = event.params.issueId;

  // If already triggered in prior state, ignore
  if (beforeData?.hasTriggeredDispatchCall === true) {
    return;
  }

  if (shouldTriggerDispatchCall(afterData)) {
    await executeAutoDispatchCall(issueId, afterData);
  }
});
