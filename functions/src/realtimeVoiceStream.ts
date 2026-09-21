import { WebSocket, WebSocketServer } from 'ws';
import type { IncomingMessage } from 'http';
import type { Request, Response } from 'express';

/**
 * ============================================================================
 * G.711 mu-law <-> Linear PCM 16-bit Codec & Resampling Engine
 * ============================================================================
 */

// Precomputed mu-law expansion table
const ULAW_TO_PCM16_TABLE = new Int16Array(256);
(function initMuLawTables() {
  for (let i = 0; i < 256; i++) {
    let input = ~i;
    let sign = (input & 0x80);
    let exponent = (input >> 4) & 0x07;
    let mantissa = input & 0x0F;
    let sample = (mantissa << 3) + 132;
    sample <<= exponent;
    sample -= 132;
    if (sign === 0) sample = -sample;
    ULAW_TO_PCM16_TABLE[i] = sample;
  }
})();

/**
 * Decode 8-bit mu-law buffer to 16-bit linear PCM Int16Array
 */
export function decodeMuLawToPcm16(muLawBuffer: Buffer): Int16Array {
  const pcm = new Int16Array(muLawBuffer.length);
  for (let i = 0; i < muLawBuffer.length; i++) {
    pcm[i] = ULAW_TO_PCM16_TABLE[muLawBuffer[i]];
  }
  return pcm;
}

/**
 * Encode 16-bit linear PCM Int16Array to 8-bit mu-law buffer
 */
export function encodePcm16ToMuLaw(pcm16: Int16Array): Buffer {
  const muLaw = Buffer.alloc(pcm16.length);
  const BIAS = 0x84;
  const CLIP = 32635;

  for (let i = 0; i < pcm16.length; i++) {
    let sample = pcm16[i];
    let sign = (sample >> 8) & 0x80;
    if (sign !== 0) sample = -sample;
    if (sample > CLIP) sample = CLIP;
    sample += BIAS;

    let exponent = 7;
    for (let expMask = 0x4000; (sample & expMask) === 0 && exponent > 0; expMask >>= 1) {
      exponent--;
    }
    let mantissa = (sample >> (exponent + 3)) & 0x0F;
    let byteVal = ~(sign | (exponent << 4) | mantissa);
    muLaw[i] = byteVal & 0xFF;
  }
  return muLaw;
}

/**
 * Resample PCM 16-bit stream between two sample rates (e.g. 8000Hz <-> 24000Hz or 16000Hz)
 */
export function resamplePcm16(samples: Int16Array, fromRate: number, toRate: number): Int16Array {
  if (fromRate === toRate || samples.length === 0) return samples;
  const ratio = toRate / fromRate;
  const newLength = Math.round(samples.length * ratio);
  const result = new Int16Array(newLength);

  for (let i = 0; i < newLength; i++) {
    const origPos = i / ratio;
    const index = Math.floor(origPos);
    const fraction = origPos - index;

    if (index + 1 < samples.length) {
      result[i] = Math.round(samples[index] * (1 - fraction) + samples[index + 1] * fraction);
    } else {
      result[i] = samples[index] || 0;
    }
  }
  return result;
}

/**
 * System Instructions for CivicFlow Emergency Voice Dispatch Agent
 */
export const DISPATCH_SYSTEM_INSTRUCTION =
  "You are CivicFlow's emergency dispatch calling agent. You are speaking with municipal field teams or reporting citizens over a live phone call. Keep responses under 2 sentences, speak clearly in Indian-accented English, Hindi, or Marathi, and confirm dispatch status immediately.";

/**
 * ============================================================================
 * HTTP / TwiML Handlers
 * ============================================================================
 */

/**
 * Incoming Webhook: /api/voice/stream-connect
 * Returns TwiML connecting the call to our WebSocket Media Stream
 */
export function handleStreamConnect(req: Request | any, res: Response | any) {
  const host =
    req.headers['x-forwarded-host'] ||
    req.get?.('host') ||
    req.headers?.host ||
    process.env.STREAM_HOST ||
    process.env.PUBLIC_URL ||
    'localhost:3001';

  const wssHost = host.toString().replace(/^https?:\/\//, '');

  const ticketId = req.query?.ticketId || req.body?.ticketId || '';
  const officerName = req.query?.officerName || req.body?.officerName || '';

  const customParams = [
    ticketId ? `<Parameter name="ticketId" value="${escapeXml(ticketId)}" />` : '',
    officerName ? `<Parameter name="officerName" value="${escapeXml(officerName)}" />` : ''
  ].filter(Boolean).join('\n      ');

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="wss://${wssHost}/media-stream">
      ${customParams}
    </Stream>
  </Connect>
</Response>`;

  if (res.type) res.type('text/xml');
  return res.send(twiml);
}

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

/**
 * ============================================================================
 * Real-Time WebSocket Media Stream Session Manager
 * ============================================================================
 */

export interface MediaStreamSession {
  streamSid: string | null;
  callSid: string | null;
  customParameters: Record<string, string>;
  isBotSpeaking: boolean;
  activeResponseId: string | null;
  llmSocket: WebSocket | null;
}

/**
 * Creates and binds the WebSocket server handler for /media-stream
 */
export function setupRealtimeVoiceStreamServer(server: any) {
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request: IncomingMessage, socket: any, head: Buffer) => {
    const pathname = request.url ? new URL(request.url, `http://${request.headers.host}`).pathname : '';
    if (pathname === '/media-stream') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    }
  });

  wss.on('connection', (twilioWs: WebSocket, request: IncomingMessage) => {
    console.log('[MediaStream] Twilio connected to /media-stream');

    const session: MediaStreamSession = {
      streamSid: null,
      callSid: null,
      customParameters: {},
      isBotSpeaking: false,
      activeResponseId: null,
      llmSocket: null
    };

    // Determine LLM provider (OpenAI Realtime or Gemini Live)
    const openAiApiKey = process.env.OPENAI_API_KEY;
    const geminiApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    if (openAiApiKey) {
      initOpenAIRealtimeSession(session, twilioWs, openAiApiKey);
    } else if (geminiApiKey) {
      initGeminiLiveSession(session, twilioWs, geminiApiKey);
    } else {
      console.warn('[MediaStream] No OPENAI_API_KEY or GEMINI_API_KEY found. Running in echo/simulated mode.');
      initSimulatedRealtimeSession(session, twilioWs);
    }

    twilioWs.on('message', (messageData: any) => {
      try {
        const msg = JSON.parse(messageData.toString());

        switch (msg.event) {
          case 'connected':
            console.log('[MediaStream] Twilio stream connection established');
            break;

          case 'start':
            session.streamSid = msg.start.streamSid;
            session.callSid = msg.start.callSid;
            session.customParameters = msg.start.customParameters || {};
            console.log(`[MediaStream] Start event: streamSid=${session.streamSid}, callSid=${session.callSid}`);
            break;

          case 'media':
            if (msg.media && msg.media.payload) {
              handleIncomingTwilioAudio(session, msg.media.payload);
            }
            break;

          case 'mark':
            // Audio playback checkpoint completed
            if (session.isBotSpeaking) {
              session.isBotSpeaking = false;
            }
            break;

          case 'stop':
            console.log(`[MediaStream] Stop event for streamSid=${session.streamSid}`);
            if (session.llmSocket && session.llmSocket.readyState === WebSocket.OPEN) {
              session.llmSocket.close();
            }
            break;
        }
      } catch (err: any) {
        console.error('[MediaStream] Error handling Twilio message:', err.message);
      }
    });

    twilioWs.on('close', () => {
      console.log('[MediaStream] Twilio WebSocket closed');
      if (session.llmSocket && session.llmSocket.readyState === WebSocket.OPEN) {
        session.llmSocket.close();
      }
    });

    twilioWs.on('error', (err) => {
      console.error('[MediaStream] Twilio WebSocket error:', err);
    });
  });

  return wss;
}

/**
 * Handle incoming user audio from Twilio (base64 mu-law 8000Hz)
 */
function handleIncomingTwilioAudio(session: MediaStreamSession, base64MuLaw: string) {
  if (!session.llmSocket || session.llmSocket.readyState !== WebSocket.OPEN) return;

  // If using OpenAI Realtime with g711_ulaw support
  const isOpenAi = (session.llmSocket as any)?._provider === 'openai';

  if (isOpenAi) {
    const audioAppendEvent = {
      type: 'input_audio_buffer.append',
      audio: base64MuLaw
    };
    session.llmSocket.send(JSON.stringify(audioAppendEvent));
  } else {
    // For Gemini Live or other PCM 16kHz/24kHz models
    const muLawBuffer = Buffer.from(base64MuLaw, 'base64');
    const pcm8k = decodeMuLawToPcm16(muLawBuffer);
    const pcm16k = resamplePcm16(pcm8k, 8000, 16000);
    const pcmBuffer = Buffer.from(pcm16k.buffer);

    const geminiRealtimeMessage = {
      realtimeInput: {
        mediaChunks: [
          {
            mimeType: 'audio/pcm;rate=16000',
            data: pcmBuffer.toString('base64')
          }
        ]
      }
    };
    session.llmSocket.send(JSON.stringify(geminiRealtimeMessage));
  }
}

/**
 * Handle Barge-In / Interruption:
 * Clears Twilio audio playback buffer and cancels active model response
 */
export function handleBargeInInterruption(session: MediaStreamSession, twilioWs: WebSocket) {
  if (!session.streamSid) return;

  console.log('[MediaStream] User speech detected during bot playback. Triggering barge-in CLEAR event.');

  // 1. Send Twilio clear event
  if (twilioWs.readyState === WebSocket.OPEN) {
    twilioWs.send(
      JSON.stringify({
        event: 'clear',
        streamSid: session.streamSid
      })
    );
  }

  // 2. Truncate / Cancel active LLM response
  if (session.llmSocket && session.llmSocket.readyState === WebSocket.OPEN) {
    const isOpenAi = (session.llmSocket as any)?._provider === 'openai';
    if (isOpenAi) {
      session.llmSocket.send(JSON.stringify({ type: 'response.cancel' }));
    }
  }

  session.isBotSpeaking = false;
  session.activeResponseId = null;
}

/**
 * Stream audio delta back to Twilio
 */
export function sendAudioDeltaToTwilio(session: MediaStreamSession, twilioWs: WebSocket, base64MuLawDelta: string) {
  if (!session.streamSid || twilioWs.readyState !== WebSocket.OPEN) return;

  session.isBotSpeaking = true;

  twilioWs.send(
    JSON.stringify({
      event: 'media',
      streamSid: session.streamSid,
      media: {
        payload: base64MuLawDelta
      }
    })
  );
}

/**
 * Initialize OpenAI Realtime WebSocket Session
 */
function initOpenAIRealtimeSession(session: MediaStreamSession, twilioWs: WebSocket, apiKey: string) {
  const url = 'wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01';
  const llmWs = new WebSocket(url, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'OpenAI-Beta': 'realtime=v1'
    }
  });
  (llmWs as any)._provider = 'openai';
  session.llmSocket = llmWs;

  llmWs.on('open', () => {
    console.log('[MediaStream] Connected to OpenAI Realtime API');

    // Configure Realtime Session
    const sessionUpdate = {
      type: 'session.update',
      session: {
        modalities: ['audio', 'text'],
        instructions: DISPATCH_SYSTEM_INSTRUCTION,
        voice: 'alloy',
        input_audio_format: 'g711_ulaw',
        output_audio_format: 'g711_ulaw',
        turn_detection: {
          type: 'server_vad',
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 400
        }
      }
    };
    llmWs.send(JSON.stringify(sessionUpdate));
  });

  llmWs.on('message', (data: any) => {
    try {
      const response = JSON.parse(data.toString());

      switch (response.type) {
        case 'input_audio_buffer.speech_started':
          // Barge-in detected by VAD
          handleBargeInInterruption(session, twilioWs);
          break;

        case 'response.audio.delta':
          if (response.delta) {
            sendAudioDeltaToTwilio(session, twilioWs, response.delta);
          }
          break;

        case 'response.done':
          session.activeResponseId = null;
          break;

        case 'error':
          console.error('[MediaStream] OpenAI Realtime error:', response.error);
          break;
      }
    } catch (err: any) {
      console.error('[MediaStream] Error handling OpenAI message:', err.message);
    }
  });

  llmWs.on('error', (err) => console.error('[MediaStream] OpenAI WebSocket Error:', err));
}

/**
 * Initialize Gemini Live WebSocket Session
 */
function initGeminiLiveSession(session: MediaStreamSession, twilioWs: WebSocket, apiKey: string) {
  const url = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${apiKey}`;
  const llmWs = new WebSocket(url);
  (llmWs as any)._provider = 'gemini';
  session.llmSocket = llmWs;

  llmWs.on('open', () => {
    console.log('[MediaStream] Connected to Gemini Live API');

    // Send setup message
    const setupMsg = {
      setup: {
        model: 'models/gemini-2.0-flash-exp',
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: 'Puck'
              }
            }
          }
        },
        systemInstruction: {
          parts: [{ text: DISPATCH_SYSTEM_INSTRUCTION }]
        }
      }
    };
    llmWs.send(JSON.stringify(setupMsg));
  });

  llmWs.on('message', (data: any) => {
    try {
      const response = JSON.parse(data.toString());

      // Check for user speech interruption in Gemini Live turn detection
      if (response.serverContent?.interrupted) {
        handleBargeInInterruption(session, twilioWs);
      }

      // Audio parts in Gemini response
      const parts = response.serverContent?.modelTurn?.parts || [];
      for (const part of parts) {
        if (part.inlineData && part.inlineData.mimeType?.startsWith('audio/pcm')) {
          const pcm24kBuffer = Buffer.from(part.inlineData.data, 'base64');
          const pcm24k = new Int16Array(pcm24kBuffer.buffer, pcm24kBuffer.byteOffset, pcm24kBuffer.length / 2);
          const pcm8k = resamplePcm16(pcm24k, 24000, 8000);
          const muLaw = encodePcm16ToMuLaw(pcm8k);
          sendAudioDeltaToTwilio(session, twilioWs, muLaw.toString('base64'));
        }
      }
    } catch (err: any) {
      console.error('[MediaStream] Error handling Gemini Live message:', err.message);
    }
  });

  llmWs.on('error', (err) => console.error('[MediaStream] Gemini Live WebSocket Error:', err));
}

/**
 * Fallback Simulated Session (Demonstration Mode)
 */
function initSimulatedRealtimeSession(session: MediaStreamSession, twilioWs: WebSocket) {
  console.log('[MediaStream] Simulated Voice Stream ready.');
  // Emulates initial conversational dispatch greeting after connection
  setTimeout(() => {
    if (session.streamSid && twilioWs.readyState === WebSocket.OPEN) {
      // 1-second silence / beep buffer in mu-law
      const dummyPcm = new Int16Array(8000);
      for (let i = 0; i < dummyPcm.length; i++) {
        dummyPcm[i] = Math.round(Math.sin((2 * Math.PI * 440 * i) / 8000) * 8000);
      }
      const muLaw = encodePcm16ToMuLaw(dummyPcm);
      sendAudioDeltaToTwilio(session, twilioWs, muLaw.toString('base64'));
    }
  }, 1000);
}
