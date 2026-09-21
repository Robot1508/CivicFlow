import React, { useState } from 'react';
import { 
  PhoneCall, 
  Bot, 
  Radio, 
  History, 
  PlusCircle, 
  Search, 
  Filter, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  Sparkles
} from 'lucide-react';
import CallCard from '../components/calling/CallCard';
import CallModal from '../components/calling/CallModal';
import CallHistoryModal from '../components/calling/CallHistoryModal';
import EscalateModal from '../components/calling/EscalateModal';

export default function AICalling({ 
  activeCalls = [], 
  callHistory = [], 
  complaints = [], 
  workers = [],
  demoMode = true,
  onInitiateCall,
  onHangupCall,
  onToggleDemoMode
}) {
  const [selectedCallModal, setSelectedCallModal] = useState(null);
  const [selectedHistoryModal, setSelectedHistoryModal] = useState(null);
  const [escalateCallModal, setEscalateCallModal] = useState(null);

  // Manual Dispatch Form state
  const [selectedComplaintId, setSelectedComplaintId] = useState(complaints[0]?.id || 'CP-2001');

  const selectedComplaint = complaints.find(c => c.id === selectedComplaintId) || complaints[0];
  const assignedWorker = workers.find(w => w.name === selectedComplaint?.assignedTo) || workers[0];

  const handleLaunchCall = () => {
    if (!selectedComplaint) return;
    const newCall = onInitiateCall({
      complaintId: selectedComplaint.id,
      officerPhone: assignedWorker?.phone || selectedComplaint.assignedToPhone || "+919876543210",
      officerName: selectedComplaint.assignedTo || assignedWorker?.name || "Officer",
      department: selectedComplaint.department,
      ward: selectedComplaint.ward
    });
    if (newCall) {
      setSelectedCallModal(newCall);
    }
  };

  // Keep modal updated with active call state updates
  const currentActiveModalCall = activeCalls.find(c => c.id === selectedCallModal?.id) || selectedCallModal;

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">AI Telephony Dispatch Center</h1>
            <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <Bot className="w-3.5 h-3.5 text-blue-600" /> AWS Bedrock
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">
            Autonomous Voice Agent calling municipal officers, querying grievance resolution status, & extracting operational data.
          </p>
        </div>

        {/* DEMO_MODE toggle */}
        <button
          onClick={onToggleDemoMode}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-extrabold border transition-all ${
            demoMode
              ? 'bg-amber-50 border-amber-300 text-amber-900 hover:bg-amber-100 shadow-sm'
              : 'bg-emerald-50 border-emerald-300 text-emerald-900 hover:bg-emerald-100 shadow-sm'
          }`}
        >
          {demoMode ? (
            <>
              <Sparkles className="w-4 h-4 text-amber-600" />
              <span>DEMO MODE (Simulated Voice)</span>
            </>
          ) : (
            <>
              <Radio className="w-4 h-4 text-emerald-600 animate-pulse" />
              <span>LIVE MODE (AWS Connect Dialing)</span>
            </>
          )}
        </button>
      </div>

      {/* Dispatch Control Bar */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-950 text-white rounded-2xl p-6 shadow-xl border border-blue-800 flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <PhoneCall className="w-5 h-5 text-blue-400" />
            <h3 className="font-bold text-lg text-white">Manual Call Dispatcher</h3>
          </div>
          <p className="text-xs text-blue-200">
            Select an open grievance log to trigger an automated outbound voice call to the assigned officer.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <select
            value={selectedComplaintId}
            onChange={(e) => setSelectedComplaintId(e.target.value)}
            className="bg-blue-950 border border-blue-700 text-white text-xs font-semibold rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            {complaints.map(c => (
              <option key={c.id} value={c.id}>
                {c.id}: {c.title.slice(0, 32)}... ({c.department})
              </option>
            ))}
          </select>

          <button
            onClick={handleLaunchCall}
            className="flex items-center justify-center space-x-2 bg-gradient-to-r from-blue-500 to-emerald-500 hover:from-blue-600 hover:to-emerald-600 text-white font-extrabold text-xs px-6 py-2.5 rounded-xl shadow-lg transition-all"
          >
            <Bot className="w-4 h-4 text-blue-100" />
            <span>Initiate AI Call</span>
          </button>
        </div>
      </div>

      {/* Active Calls Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <Radio className="w-4 h-4 text-emerald-500 animate-pulse" /> Active Telephony Calls ({activeCalls.length})
          </h2>
        </div>

        {activeCalls.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {activeCalls.map((call) => (
              <CallCard
                key={call.id}
                call={call}
                onOpenModal={(c) => setSelectedCallModal(c)}
                onHangup={(id) => onHangupCall(id)}
              />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-dashed border-gray-300 p-8 text-center space-y-2">
            <Bot className="w-8 h-8 text-gray-400 mx-auto" />
            <h4 className="font-bold text-gray-700 text-sm">No Active Telephony Calls</h4>
            <p className="text-xs text-gray-500">Click "Initiate AI Call" above or "Call Officer" from the Dashboard to start an automated inquiry.</p>
          </div>
        )}
      </div>

      {/* Completed Telephony Call Logs */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-200 flex items-center justify-between bg-gray-50/50">
          <div>
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <History className="w-4 h-4 text-blue-600" /> Recent Call Logs & Transcript Archive
            </h2>
            <p className="text-xs text-gray-500">Recorded officer conversations, extracted ETAs, and tools executed.</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-100 text-xs text-gray-500 uppercase font-semibold">
              <tr>
                <th className="px-5 py-3">Call ID</th>
                <th className="px-5 py-3">Officer & Dept</th>
                <th className="px-5 py-3">Issue Ref</th>
                <th className="px-5 py-3">Extracted ETA</th>
                <th className="px-5 py-3">Tools Fired</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {callHistory.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-5 py-4 font-mono font-bold text-xs text-blue-700">{item.id}</td>
                  <td className="px-5 py-4">
                    <div className="font-bold text-gray-900 text-xs">{item.officerName}</div>
                    <div className="text-[11px] text-gray-500">{item.department}</div>
                  </td>
                  <td className="px-5 py-4 font-mono text-xs text-gray-700">{item.complaintId}</td>
                  <td className="px-5 py-4">
                    <span className="font-bold text-emerald-700 text-xs">{item.extractedData?.eta || '4 hours'}</span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-1">
                      {item.toolsTriggered && item.toolsTriggered.map((t, idx) => (
                        <span key={idx} className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded font-mono">
                          {t}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-100 text-emerald-800">
                      {item.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button
                      onClick={() => setSelectedHistoryModal(item)}
                      className="text-xs font-bold text-blue-600 hover:text-blue-800 underline"
                    >
                      View Log
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      {currentActiveModalCall && (
        <CallModal
          call={currentActiveModalCall}
          onClose={() => setSelectedCallModal(null)}
          onHangup={(id) => {
            onHangupCall(id);
            setSelectedCallModal(null);
          }}
          onEscalate={(callToEscalate) => setEscalateCallModal(callToEscalate)}
        />
      )}

      {selectedHistoryModal && (
        <CallHistoryModal
          call={selectedHistoryModal}
          onClose={() => setSelectedHistoryModal(null)}
        />
      )}

      {escalateCallModal && (
        <EscalateModal
          call={escalateCallModal}
          onClose={() => setEscalateCallModal(null)}
          onSubmitEscalation={(call, reason) => {
            console.log(`Escalating ${call.id} for reason: ${reason}`);
          }}
        />
      )}
    </div>
  );
}
