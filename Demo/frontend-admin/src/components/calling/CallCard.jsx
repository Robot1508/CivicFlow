import React from 'react';
import { PhoneCall, Bot, User, Clock, AlertTriangle, ExternalLink, Activity } from 'lucide-react';

export default function CallCard({ call, onOpenModal, onHangup }) {
  const isConnecting = call.status === 'RINGING' || call.status === 'INITIATED';
  const isActive = call.status === 'IN_PROGRESS';
  const latestMessage = call.transcript && call.transcript.length > 0
    ? call.transcript[call.transcript.length - 1]
    : null;

  return (
    <div className={`rounded-xl border p-5 shadow-md transition-all ${
      isActive
        ? 'bg-gradient-to-br from-blue-900 to-indigo-950 text-white border-blue-500 shadow-blue-900/30 ring-2 ring-blue-500/50'
        : isConnecting
        ? 'bg-amber-950/90 text-white border-amber-500 shadow-amber-900/30 animate-pulse'
        : 'bg-white text-gray-900 border-gray-200'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10">
        <div className="flex items-center space-x-3">
          <div className={`p-2.5 rounded-xl font-bold flex items-center justify-center ${
            isActive ? 'bg-blue-600 text-white animate-pulse' : 'bg-gray-100 text-gray-800'
          }`}>
            <PhoneCall className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-sm tracking-tight">{call.officerName}</span>
              <span className="text-xs opacity-75 font-mono">({call.officerPhone})</span>
            </div>
            <p className="text-xs opacity-80">{call.department} • {call.ward}</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span className={`px-2.5 py-1 rounded-full text-xs font-extrabold uppercase tracking-wide ${
            isActive
              ? 'bg-emerald-500 text-white animate-pulse'
              : isConnecting
              ? 'bg-amber-400 text-amber-950'
              : 'bg-gray-200 text-gray-800'
          }`}>
            {call.status}
          </span>
        </div>
      </div>

      {/* Waveform indicator if active */}
      {isActive && (
        <div className="my-4 py-2 px-3 bg-blue-950/60 rounded-lg flex items-center justify-between border border-blue-800/60">
          <div className="flex items-center space-x-1.5 text-xs text-blue-300 font-semibold">
            <Activity className="w-4 h-4 text-emerald-400 animate-spin" />
            <span>AI Conversing with Officer...</span>
          </div>
          {/* Animated audio wave bars */}
          <div className="flex items-end space-x-1 h-6">
            <div className="w-1 bg-blue-400 rounded animate-wave-1"></div>
            <div className="w-1 bg-indigo-400 rounded animate-wave-2"></div>
            <div className="w-1 bg-emerald-400 rounded animate-wave-3"></div>
            <div className="w-1 bg-cyan-400 rounded animate-wave-4"></div>
          </div>
        </div>
      )}

      {/* Latest Transcript Bubble */}
      {latestMessage && (
        <div className="mt-3 text-xs p-3 rounded-lg bg-black/20 border border-white/10 space-y-1">
          <div className="flex items-center space-x-1.5 font-bold text-blue-300">
            {latestMessage.speaker === 'AI' ? <Bot className="w-3.5 h-3.5 text-blue-400" /> : <User className="w-3.5 h-3.5 text-emerald-400" />}
            <span>{latestMessage.speaker}:</span>
          </div>
          <p className="line-clamp-2 italic opacity-90">{latestMessage.text}</p>
        </div>
      )}

      {/* Triggered Tools Summary */}
      {call.toolsTriggered && call.toolsTriggered.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {call.toolsTriggered.map((t, idx) => (
            <span key={idx} className="text-[10px] bg-blue-500/20 text-blue-200 border border-blue-400/30 px-2 py-0.5 rounded font-mono">
              ⚡ {t}
            </span>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
        <span className="text-xs opacity-75 font-mono">Ref: {call.complaintId}</span>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onOpenModal(call)}
            className="flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Open Monitor</span>
          </button>
          <button
            onClick={() => onHangup(call.id)}
            className="bg-red-600 hover:bg-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
          >
            End
          </button>
        </div>
      </div>
    </div>
  );
}
