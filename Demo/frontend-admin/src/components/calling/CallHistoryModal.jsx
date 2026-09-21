import React from 'react';
import { X, Bot, User, Clock, CheckCircle2, Package, Calendar } from 'lucide-react';
import DispatchCallAuditHUD from '../DispatchCallAuditHUD';

export default function CallHistoryModal({ call, onClose }) {
  if (!call) return null;

  const extracted = call.extractedData || {};

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-3xl border border-gray-200 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-5 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-mono text-xs text-blue-600 font-bold">{call.id}</span>
              <span className="text-xs text-gray-400">•</span>
              <span className="font-bold text-gray-900 text-base">{call.officerName}</span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Department: {call.department} • Ref: {call.complaintId} • Call Ended
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Summary Card */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-2">
            <h4 className="font-bold text-blue-900 text-xs uppercase tracking-wider">AI Executive Call Summary</h4>
            <p className="text-sm text-blue-950 font-medium leading-relaxed">{call.summary || "Call completed cleanly. Extracted ETA and operational parameters updated in system database."}</p>
          </div>

          {/* Extracted Data Box */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
              <span className="text-xs text-gray-500 uppercase font-semibold">ETA Captured</span>
              <p className="text-base font-bold text-emerald-600 mt-1">{extracted.eta || 'N/A'}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
              <span className="text-xs text-gray-500 uppercase font-semibold">Materials Requested</span>
              <p className="text-sm font-bold text-amber-700 mt-1">
                {extracted.materialsNeeded && extracted.materialsNeeded.length > 0
                  ? extracted.materialsNeeded.join(', ')
                  : 'None requested'}
              </p>
            </div>
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
              <span className="text-xs text-gray-500 uppercase font-semibold">Call Duration</span>
              <p className="text-base font-bold text-gray-800 mt-1">{call.durationSeconds ? `${call.durationSeconds}s` : '1m 30s'}</p>
            </div>
          </div>

          {/* Complete Transcript */}
          <div className="space-y-3">
            <h4 className="font-bold text-gray-900 text-sm">Full Telephony Transcript</h4>
            <div className="space-y-3 bg-gray-50 p-4 rounded-xl border border-gray-200 max-h-64 overflow-y-auto">
              {call.transcript && call.transcript.map((msg, i) => (
                <div key={i} className="flex items-start space-x-2 text-xs">
                  <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                    msg.speaker === 'AI' ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {msg.speaker}
                  </span>
                  <p className="text-gray-700 flex-1">{msg.text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Real-time Telephony Audit Log HUD */}
          <DispatchCallAuditHUD ticketId={call.complaintId || call.id} />
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className="bg-gray-800 hover:bg-gray-900 text-white font-bold text-xs px-5 py-2 rounded-lg"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
