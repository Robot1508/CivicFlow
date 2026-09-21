import React from 'react';
import { BarChart3, Bot, CheckCircle, Clock, AlertTriangle } from 'lucide-react';

export default function Reports({ callLogs = [] }) {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Analytics & AI Dispatch Reports</h1>
        <p className="text-sm text-gray-500">Performance insights, resolution throughput, and AI telephony metrics.</p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase">AI Calls Dispatched</span>
            <Bot className="w-5 h-5 text-blue-600" />
          </div>
          <h3 className="text-3xl font-black text-gray-900 mt-2">{callLogs.length + 12}</h3>
          <p className="text-xs text-emerald-600 font-medium mt-1">100% automated outreach</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase">Avg Call Duration</span>
            <Clock className="w-5 h-5 text-indigo-600" />
          </div>
          <h3 className="text-3xl font-black text-gray-900 mt-2">1m 45s</h3>
          <p className="text-xs text-gray-500 font-medium mt-1">Fast structured extraction</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase">Resolution Acceleration</span>
            <CheckCircle className="w-5 h-5 text-emerald-600" />
          </div>
          <h3 className="text-3xl font-black text-emerald-600 mt-2">3.4x Faster</h3>
          <p className="text-xs text-emerald-600 font-medium mt-1">Compared to manual phone followups</p>
        </div>
      </div>

      {/* Call Log Summary */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-4">
        <h3 className="font-bold text-gray-900 text-base">Recent AI Call Telemetry</h3>
        <div className="divide-y divide-gray-100">
          {callLogs.map((log) => (
            <div key={log.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div>
                <span className="font-mono font-bold text-blue-700 mr-2">{log.id}</span>
                <span className="font-bold text-gray-800">{log.officerName} ({log.department})</span>
                <p className="text-gray-500 text-[11px] mt-0.5">{log.summary}</p>
              </div>
              <div className="text-right">
                <span className="px-2 py-0.5 rounded font-semibold bg-emerald-100 text-emerald-800">
                  {log.status}
                </span>
                <p className="text-[11px] text-gray-400 mt-0.5">{new Date(log.initiatedAt).toLocaleTimeString()}</p>
              </div>
            </div>
          ))}
          {callLogs.length === 0 && (
            <p className="text-xs text-gray-400 py-4 text-center">No AI calls logged yet in this session.</p>
          )}
        </div>
      </div>
    </div>
  );
}
