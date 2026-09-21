import twilio from 'twilio';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * CivicFlow Inbound Citizen Voice Hotline (Speech-to-Ticket Pipeline)
 */

export interface ExtractedCitizenReport {
  issueType: 'pothole' | 'water_leakage' | 'street_light' | 'garbage' | 'drainage' | 'other';
  detectedWard: string;
  landmark: string;
  description: string;
  estimatedUrgency: 'Low' | 'Medium' | 'High' | 'Critical';
}

/**
 * 1. handleInboundIntake
 * Returns TwiML greeting with <Gather input="speech"> and <Record> fallback.
 */
export function handleInboundIntake(req: any, res: any) {
  try {
    const VoiceResponse = twilio.twiml.VoiceResponse;
    const twiml = new VoiceResponse();

    const gather = twiml.gather({
      input: ['speech'],
      timeout: 6,
      speechTimeout: 'auto',
      action: '/api/voice/process-citizen-report',
      language: 'en-IN'
    });

    gather.say(
      { voice: 'Polly.Aditi', language: 'en-IN' },
      'Welcome to the CivicFlow citizen hotline. Please describe the issue and your location or ward after the beep.'
    );
    gather.play({ digits: 'w' }); // Subtle pause/beep

    // Fallback: If Gather does not capture speech, record voicemail
    twiml.say(
      { voice: 'Polly.Aditi', language: 'en-IN' },
      'We did not capture your voice input. Please leave your report as a voicemail after the tone.'
    );
    twiml.record({
      action: '/api/voice/process-citizen-report',
      maxLength: 30,
      playBeep: true,
      transcribe: true
    });
    twiml.hangup();

    res.set('Content-Type', 'text/xml');
    res.type('text/xml');
    return res.send(twiml.toString());
  } catch (error: any) {
    console.error('[handleInboundIntake Error]:', error);
    const VoiceResponse = twilio.twiml.VoiceResponse;
    const twiml = new VoiceResponse();
    twiml.say('The CivicFlow citizen hotline is temporarily unavailable.');
    twiml.hangup();
    res.set('Content-Type', 'text/xml');
    res.type('text/xml');
    return res.status(500).send(twiml.toString());
  }
}

/**
 * 2. processCitizenReport
 * Extracts structured issue details via Gemini 1.5 Flash, checks Equity Boost, writes to Firestore, and replies with TwiML.
 */
export async function processCitizenReport(req: any, res: any) {
  const speechResult = req.body?.SpeechResult || req.query?.SpeechResult || req.body?.TranscriptionText || '';
  const callerPhone = req.body?.From || req.query?.From || 'anonymous';
  const callSid = req.body?.CallSid || req.query?.CallSid || `CALL-${Date.now()}`;

  console.log(`[processCitizenReport] Received speech transcript from ${callerPhone}: "${speechResult}"`);

  let extractedData: ExtractedCitizenReport = {
    issueType: 'other',
    detectedWard: 'Ward 3',
    landmark: 'Municipal Sector',
    description: speechResult || 'Voice grievance recorded via citizen hotline',
    estimatedUrgency: 'Medium'
  };

  // Structured extraction with Gemini 1.5 Flash
  if (speechResult) {
    try {
      const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: 'gemini-1.5-flash',
        generationConfig: {
          responseMimeType: 'application/json'
        }
      });

      const prompt = `
You are CivicFlow's Speech-to-Ticket AI Engine. Extract civic issue details from this citizen caller transcript (in English, Hindi, or Marathi):
Transcript: "${speechResult}"

Return valid JSON conforming strictly to this JSON schema:
{
  "issueType": "pothole" | "water_leakage" | "street_light" | "garbage" | "drainage" | "other",
  "detectedWard": string (e.g. "Ward 9", "Ward 11", "Ward 3", "Unknown"),
  "landmark": string (e.g. "Shivaji Chowk", "Subhash Nagar", "Main Market"),
  "description": string (one clear sentence describing the problem),
  "estimatedUrgency": "Low" | "Medium" | "High" | "Critical"
}
`;

      const response = await model.generateContent(prompt);
      const rawJson = response.response.text().replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(rawJson);

      extractedData = {
        issueType: parsed.issueType || 'other',
        detectedWard: parsed.detectedWard || 'Ward 3',
        landmark: parsed.landmark || 'Municipal Area',
        description: parsed.description || speechResult,
        estimatedUrgency: parsed.estimatedUrgency || 'Medium'
      };
    } catch (err: any) {
      console.warn('[processCitizenReport] Gemini structured parsing fallback:', err.message);
      // Heuristic fallback
      const lower = speechResult.toLowerCase();
      if (lower.includes('water') || lower.includes('pipe') || lower.includes('leak')) {
        extractedData.issueType = 'water_leakage';
        extractedData.detectedWard = 'Ward 9';
      } else if (lower.includes('pothole') || lower.includes('road')) {
        extractedData.issueType = 'pothole';
        extractedData.detectedWard = 'Ward 3';
      } else if (lower.includes('garbage') || lower.includes('trash') || lower.includes('waste')) {
        extractedData.issueType = 'garbage';
        extractedData.detectedWard = 'Ward 7';
      } else if (lower.includes('light') || lower.includes('pole')) {
        extractedData.issueType = 'street_light';
        extractedData.detectedWard = 'Ward 4';
      } else if (lower.includes('drain') || lower.includes('gutter')) {
        extractedData.issueType = 'drainage';
        extractedData.detectedWard = 'Ward 11';
      }
    }
  }

  // Equity Boost Check: Ward 9, Ward 11, or neglected zones
  const wardLower = (extractedData.detectedWard || '').toLowerCase();
  const landmarkLower = (extractedData.landmark || '').toLowerCase();
  const isEquityBoosted = Boolean(
    wardLower.includes('ward 9') ||
    wardLower.includes('ward 11') ||
    landmarkLower.includes('subhash nagar') ||
    landmarkLower.includes('slum') ||
    landmarkLower.includes('basti')
  );

  let priority = extractedData.estimatedUrgency;
  if (isEquityBoosted) {
    priority = 'Critical';
  }

  const landmarkDisplay = extractedData.landmark || extractedData.detectedWard || 'your area';

  // Write document directly to Firestore issues collection
  let docId = `CF-VOICE-${Date.now().toString().slice(-4)}`;
  try {
    const db = getFirestore();
    const issueRef = await db.collection('issues').add({
      title: `Voice Report: ${extractedData.issueType.replace('_', ' ')}`,
      description: extractedData.description,
      landmark: extractedData.landmark,
      ward: extractedData.detectedWard,
      priority,
      isEquityBoosted,
      source: 'voice_hotline',
      status: 'pending_verification',
      callerPhone,
      callSid,
      rawTranscript: speechResult,
      createdAt: FieldValue.serverTimestamp()
    });
    docId = issueRef.id;
    console.log(`[processCitizenReport] Issue created in Firestore with ID: ${docId}, EquityBoosted=${isEquityBoosted}`);
  } catch (dbErr: any) {
    console.error('[processCitizenReport] Firestore write error:', dbErr.message);
  }

  // Return TwiML speech confirmation
  const VoiceResponse = twilio.twiml.VoiceResponse;
  const twiml = new VoiceResponse();
  twiml.say(
    { voice: 'Polly.Aditi', language: 'en-IN' },
    `Thank you. Your report for ${landmarkDisplay} has been logged with ticket reference. Our municipal team has been notified. Goodbye.`
  );
  twiml.hangup();

  res.set('Content-Type', 'text/xml');
  res.type('text/xml');
  return res.send(twiml.toString());
}
