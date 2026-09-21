import React, { useState } from 'react';
import { ShieldAlert, X, Send, AlertTriangle } from 'lucide-react';

export default function EscalateModal({ call, onClose, onSubmitEscalation }) {
  const [reason, setReason] = useState('Officer uncontactable / Material blockage');
  const [notes, setNotes] = useState('');
  const [sent, setSent] = useState(false);

  if (!call) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setSent(true);
    if (onSubmitEscalation) {
      onSubmitEscalation(call, reason, notes);
    }
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg border border-gray-200 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-red-600 to-amber-600 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <ShieldAlert className="w-6 h-6" />
            <h3 className="font-bold text-lg">Escalate Issue to Senior Engineer</h3>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {sent ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-gray-900 text-lg">Escalation Ticket Generated</h4>
            <p className="text-xs text-gray-500">Forwarded to Chief Ward Engineer & Municipal Commissioner SMS alert system.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 space-y-1">
              <span className="font-bold flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Ref: {call.complaintId} • Officer: {call.officerName}
              </span>
              <p>This will notify the Chief Municipal Engineer to re-assign or dispatch emergency contractor crews.</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Escalation Reason
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2 text-xs font-semibold text-gray-800 focus:ring-2 focus:ring-red-500 focus:outline-none"
              >
                <option value="Officer uncontactable / Material blockage">Officer uncontactable / Material blockage</option>
                <option value="Unreasonable Resolution ETA">Unreasonable Resolution ETA</option>
                <option value="Critical Safety Hazard">Critical Safety Hazard</option>
                <option value="Citizen Protests Reported">Citizen Protests Reported</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Additional Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Enter details for the Chief Engineer..."
                rows={3}
                className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 text-xs text-gray-800 focus:ring-2 focus:ring-red-500 focus:outline-none"
              ></textarea>
            </div>

            <div className="pt-2 flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex items-center space-x-1.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-5 py-2 rounded-lg shadow-md transition-all"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Submit Escalation</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
