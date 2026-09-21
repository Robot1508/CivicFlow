import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  PhoneOff, 
  MicOff, 
  Mic, 
  Bot, 
  User, 
  CheckCircle2, 
  Clock, 
  Package, 
  AlertOctagon, 
  Activity,
  Cpu,
  ShieldAlert
} from 'lucide-react';

export default function CallModal({ call, onClose, onHangup, onEscalate }) {
  const [muted, setMuted] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [call?.transcript]);

  if (!call) return null;

  const isActive = call.status === 'IN_PROGRESS' || call.status === 'RINGING';
  const extracted = call.extractedData || {};

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="bg-gray-900 text-white rounded-2xl w-full max-w-4xl border border-gray-800 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-5 border-b border-gray-800 bg-gray-950 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`p-3 rounded-xl font-bold ${isActive ? 'bg-blue-600 animate-pulse text-white' : 'bg-gray-800 text-gray-400'}`}>
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-bold text-white tracking-tight">{call.officerName}</h3>
                <span className="text-xs text-blue-400 font-mono">({call.officerPhone})</span>
              </div>
              <p className="text-xs text-gray-400">
                Department: <span className="text-gray-200 font-semibold">{call.department}</span> • Ward: <span className="text-gray-200 font-semibold">{call.ward}</span> • Issue: <span className="text-blue-300 font-mono">{call.complaintId}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
              isActive ? 'bg-emerald-500 text-white animate-pulse' : 'bg-gray-700 text-gray-300'
            }`}>
              {call.status}
            </span>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Live Audio & Model Status Banner */}
        {isActive && (
          <div className="bg-gradient-to-r from-blue-900/60 via-indigo-900/60 to-purple-900/60 border-b border-blue-800/40 p-3 px-6 flex items-center justify-between">
            <div className="flex items-center space-x-3 text-xs text-blue-200">
              <Activity className="w-4 h-4 text-emerald-400 animate-spin" />
              <span className="font-semibold">Bedrock Voice Telephony Engine Active</span>
              <span className="hidden sm:inline text-blue-400 font-mono">| Model: Claude 3.5 Sonnet</span>
            </div>

            {/* Audio Wave Visualizer */}
            <div className="flex items-end space-x-1.5 h-6">
              <div className="w-1.5 bg-blue-400 rounded animate-wave-1"></div>
              <div className="w-1.5 bg-indigo-400 rounded animate-wave-2"></div>
              <div className="w-1.5 bg-emerald-400 rounded animate-wave-3"></div>
              <div className="w-1.5 bg-cyan-400 rounded animate-wave-4"></div>
              <div className="w-1.5 bg-purple-400 rounded animate-wave-2"></div>
            </div>
          </div>
        )}

        {/* Modal Body Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 flex-1 overflow-hidden">
          
          {/* Left / Main: Transcript Stream */}
          <div className="md:col-span-2 p-5 overflow-y-auto space-y-4 bg-gray-900 flex flex-col justify-between">
            <div className="space-y-4">
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-blue-400" /> Live Telephony Conversation Transcript
              </h4>

              {call.transcript && call.transcript.map((msg, idx) => {
                const isAI = msg.speaker === 'AI';
                return (
                  <div
                    key={idx}
                    className={`flex items-start space-x-3 ${isAI ? 'justify-start' : 'justify-start flex-row-reverse space-x-reverse'}`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                      isAI ? 'bg-blue-600 text-white' : 'bg-emerald-600 text-white'
                    }`}>
                      {isAI ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                    </div>
                    <div className={`max-w-[80%] rounded-xl p-3.5 text-xs sm:text-sm shadow-sm ${
                      isAI
                        ? 'bg-gray-800 text-gray-100 border border-gray-700/60 rounded-tl-none'
                        : 'bg-emerald-950/80 text-emerald-100 border border-emerald-800/60 rounded-tr-none'
                    }`}>
                      <div className="font-bold text-[11px] mb-1 opacity-75">
                        {isAI ? 'CivicFlow AI Assistant' : call.officerName}
                      </div>
                      <p className="leading-relaxed">{msg.text}</p>
                    </div>
                  </div>
                );
              })}
              <div ref={chatEndRef} />
            </div>
          </div>

          {/* Right Sidebar: Real-time Extracted Data & Triggered Tools */}
          <div className="p-5 bg-gray-950 border-l border-gray-800 space-y-5 overflow-y-auto">
            
            {/* Extracted Insights */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Extracted Structured Data
              </h4>

              <div className="bg-gray-900 p-3.5 rounded-xl border border-gray-800 space-y-3 text-xs">
                <div>
                  <span className="text-gray-500 block text-[11px]">Resolution ETA</span>
                  <div className="font-bold text-emerald-400 text-sm flex items-center gap-1 mt-0.5">
                    <Clock className="w-4 h-4 text-emerald-400" />
                    <span>{extracted.eta || 'Awaiting officer response...'}</span>
                  </div>
                </div>

                {extracted.materialsNeeded && extracted.materialsNeeded.length > 0 && (
                  <div>
                    <span className="text-gray-500 block text-[11px]">Materials Requested</span>
                    <div className="mt-1 space-y-1">
                      {extracted.materialsNeeded.map((mat, i) => (
                        <div key={i} className="flex items-center space-x-1.5 text-amber-300 font-semibold">
                          <Package className="w-3.5 h-3.5 text-amber-400" />
                          <span>{mat}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {extracted.delayReason && (
                  <div>
                    <span className="text-gray-500 block text-[11px]">Delay Reason</span>
                    <p className="text-red-300 font-medium mt-0.5">{extracted.delayReason}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Triggered AI Tools */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                Autonomous Tools Fired
              </h4>
              <div className="space-y-1.5">
                {call.toolsTriggered && call.toolsTriggered.length > 0 ? (
                  call.toolsTriggered.map((t, idx) => (
                    <div key={idx} className="bg-blue-950/70 border border-blue-800/60 p-2 rounded-lg text-xs font-mono text-blue-300 flex items-center justify-between">
                      <span>⚡ {t}</span>
                      <span className="text-[10px] text-blue-400">SUCCESS</span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-gray-500 italic">No tools triggered yet</p>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* Modal Controls Footer */}
        <div className="p-4 border-t border-gray-800 bg-gray-950 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setMuted(!muted)}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors ${
                muted ? 'bg-amber-600 text-white' : 'bg-gray-800 hover:bg-gray-700 text-gray-200'
              }`}
            >
              {muted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              <span>{muted ? 'Muted' : 'Mute Admin Mic'}</span>
            </button>

            <button
              onClick={() => onEscalate && onEscalate(call)}
              className="flex items-center space-x-2 bg-gradient-to-r from-amber-600 to-red-600 hover:from-amber-700 hover:to-red-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-md transition-all"
            >
              <ShieldAlert className="w-4 h-4" />
              <span>Escalate to Sr. Engineer</span>
            </button>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => onHangup(call.id)}
              className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-xl text-xs font-bold shadow-md transition-all"
            >
              <PhoneOff className="w-4 h-4" />
              <span>End Call</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
