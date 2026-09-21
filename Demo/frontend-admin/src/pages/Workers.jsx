import React from 'react';
import { Phone, MapPin, CheckCircle, Clock, PhoneCall, UserCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Workers({ workers = [], complaints = [], onTriggerCall }) {
  const navigate = useNavigate();

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Municipal Officers & Field Staff</h1>
          <p className="text-sm text-gray-500">Directory of active ward officers, departmental leads, and task completion metrics.</p>
        </div>
      </div>

      {/* Workers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {workers.map((worker) => {
          // Find an active complaint assigned to this officer if available
          const activeComplaint = complaints.find(
            c => c.assignedTo === worker.name && c.status !== 'Resolved'
          ) || complaints.find(c => c.assignedTo === worker.name) || complaints[0];

          return (
            <div key={worker.id} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
              <div>
                {/* Header info */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-800 font-bold flex items-center justify-center text-sm">
                      {worker.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 text-base">{worker.name}</h3>
                      <p className="text-xs text-blue-600 font-medium">{worker.category} • {worker.ward}</p>
                    </div>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    worker.status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {worker.status}
                  </span>
                </div>

                {/* Details */}
                <div className="mt-4 pt-3 border-t border-gray-100 space-y-2 text-xs text-gray-600">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center space-x-1.5">
                      <Phone className="w-3.5 h-3.5 text-gray-400" />
                      <span>{worker.phone}</span>
                    </span>
                    <span className="font-mono text-gray-500">{worker.id}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="flex items-center space-x-1.5">
                      <Clock className="w-3.5 h-3.5 text-gray-400" />
                      <span>Avg Resolution</span>
                    </span>
                    <span className="font-semibold text-gray-800">{worker.avgResolutionHours} hrs</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="flex items-center space-x-1.5">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Completed Tasks</span>
                    </span>
                    <span className="font-semibold text-gray-800">{worker.completedTasks} tasks</span>
                  </div>
                </div>
              </div>

              {/* Action */}
              <div className="mt-5 pt-3 border-t border-gray-100 flex items-center justify-between">
                <div className="text-xs text-gray-500">
                  <span className="font-bold text-gray-800">{worker.openTasks}</span> active tasks
                </div>
                <button
                  onClick={() => {
                    if (onTriggerCall && activeComplaint) {
                      onTriggerCall(activeComplaint, worker);
                    }
                    navigate('/calls');
                  }}
                  className="flex items-center space-x-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg text-xs font-bold border border-blue-200 transition-colors"
                >
                  <PhoneCall className="w-3.5 h-3.5 text-blue-600" />
                  <span>Call Officer</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
