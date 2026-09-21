import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import twilio from 'twilio';

/**
 * Ward directory mapping for fallback lookups
 */
const WARD_OFFICIAL_DIRECTORY: Record<string, { name: string; phone: string; department: string }> = {
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
 * Retrieve assigned ward official or contractor phone number
 */
export async function getWardOfficialPhone(wardId?: string): Promise<{ phone: string; name: string }> {
  const fallbackPhone = process.env.DEFAULT_DISPATCH_PHONE || '+919370777698';
  if (!wardId) return { phone: fallbackPhone, name: 'Duty Officer' };

  const db = getFirestore();
  const normalizedWardId = wardId.toLowerCase().trim();

  // 1. Try querying wards/{wardId} collection in Firestore
  try {
    const wardDoc = await db.collection('wards').doc(wardId).get();
    if (wardDoc.exists) {
      const data = wardDoc.data();
      const phone = data?.officialPhone || data?.leadPhone || data?.phone;
      const name = data?.officialName || data?.leadName || data?.name || 'Ward Officer';
      if (phone) {
        return { phone, name };
      }
    }
  } catch (err: any) {
    console.debug('[autoDispatchTrigger] Firestore wards query fallback:', err.message);
  }

  // 2. Check directory mapping
  for (const [key, official] of Object.entries(WARD_OFFICIAL_DIRECTORY)) {
    if (normalizedWardId.includes(key)) {
      return { phone: official.phone, name: official.name };
    }
  }

  return { phone: fallbackPhone, name: 'Municipal Dispatch Lead' };
}

/**
 * Evaluates whether ticket satisfies immediate dispatch trigger conditions
 */
export function isDispatchEligible(data: any): boolean {
  if (!data) return false;

  // Prevent duplicate calls: Check if dispatchCallTriggered === true
  if (data.dispatchCallTriggered === true || data.hasTriggeredDispatchCall === true) {
    return false;
  }

  // Trigger ONLY if priority === "Critical" OR isEquityBoosted === true
  const isCritical = String(data.priority || '').toLowerCase() === 'critical';
  const isEquityBoosted = Boolean(data.isEquityBoosted === true);

  return isCritical || isEquityBoosted;
}

/**
 * Automated Firestore Background Trigger on issues/{issueId}
 */
export const onIssueCreated = onDocumentCreated('issues/{issueId}', async (event) => {
  const snapshot = event.data;
  if (!snapshot) return;

  const data = snapshot.data();
  const issueId = event.params.issueId;

  if (!isDispatchEligible(data)) {
    return;
  }

  console.log(`[autoDispatchTrigger] Critical / Equity-Boosted ticket detected: ${issueId}`);

  const wardInfo = await getWardOfficialPhone(data.ward || data.wardId);
  const targetPhone = data.assignedToPhone || wardInfo.phone;
  const landmark = data.landmark || data.ward || 'Municipal Sector';
  const issueType = data.category || data.title || 'Critical Civic Issue';

  let callSid = `CA_DISPATCH_${Date.now()}`;
  let dispatchCallStatus = 'initiated';
  let errorMessage: string | null = null;

  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_PHONE_NUMBER || '+17372508034';
    const host = process.env.PUBLIC_HOST || 'localhost:5001';
    const webhookUrl = `https://${host}/api/voice/call-dialogue?ticketId=${encodeURIComponent(issueId)}&landmark=${encodeURIComponent(landmark)}&issueType=${encodeURIComponent(issueType)}`;

    if (accountSid && authToken) {
      const client = twilio(accountSid, authToken);
      const call = await client.calls.create({
        to: targetPhone,
        from: fromNumber,
        url: webhookUrl,
        method: 'POST'
      });
      callSid = call.sid;
      console.log(`[autoDispatchTrigger] Outbound call placed to ${targetPhone}. Call SID: ${callSid}`);
    } else {
      console.log(`[autoDispatchTrigger] Mock dispatch call placed to ${targetPhone} for ticket ${issueId}. Call SID: ${callSid}`);
    }
  } catch (err: any) {
    console.error(`[autoDispatchTrigger] Error placing dispatch call for ${issueId}:`, err.message);
    dispatchCallStatus = 'failed';
    errorMessage = err.message;
  }

  // Atomically update the ticket document in Firestore
  const db = getFirestore();
  const issueRef = db.collection('issues').doc(issueId);

  try {
    await issueRef.set(
      {
        dispatchCallTriggered: true,
        dispatchCallSid: callSid,
        dispatchCallStatus,
        dispatchedAt: FieldValue.serverTimestamp(),
        dispatchedTo: {
          name: wardInfo.name,
          phone: targetPhone
        },
        ...(errorMessage ? { dispatchError: errorMessage } : {})
      },
      { merge: true }
    );
    console.log(`[autoDispatchTrigger] Ticket ${issueId} atomically updated with dispatchCallTriggered: true`);
  } catch (dbErr: any) {
    console.error(`[autoDispatchTrigger] Failed to update ticket ${issueId}:`, dbErr.message);
  }
});

export default onIssueCreated;
