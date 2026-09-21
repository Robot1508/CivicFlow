import React, { useState } from 'react';
import { 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  PhoneCall, 
  Filter, 
  MapPin, 
  User,
  ArrowUpRight,
  TrendingUp
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import CallDispatchButton from '../components/CallDispatchButton';

export default function Dashboard({ complaints = [], workers = [], onTriggerCall }) {
  const navigate = useNavigate();
  const [selectedDept, setSelectedDept] = useState('All');

  const filteredComplaints = selectedDept === 'All'
    ? complaints
    : complaints.filter(c => c.department === selectedDept);

  const totalComplaints = complaints.length;
  const pendingComplaints = complaints.filter(c => c.status !== 'Resolved' && c.status !== 'Closed').length;
  const inProgressComplaints = complaints.filter(c => c.status === 'In Progress').length;
  const resolvedComplaints = complaints.filter(c => c.status === 'Resolved').length;

  return (
    <div className="p-6 space-y-6">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Municipal Command Center</h1>
          <p className="text-sm text-gray-500">Real-time civic issue tracking, officer allocation, and automated AI dispatching.</p>
        </div>
        <button
          onClick={() => navigate('/calls')}
          className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-md transition-all self-start sm:self-auto"
        >
          <PhoneCall className="w-4 h-4 text-blue-200" />
          <span>Open AI Voice Dispatch</span>
        </button>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Complaints</p>
            <h3 className="text-2xl font-extrabold text-gray-900 mt-1">{totalComplaints}</h3>
            <p className="text-xs text-emerald-600 font-medium mt-1 flex items-center">
              <TrendingUp className="w-3 h-3 mr-1" /> +12% from last week
            </p>
          </div>
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-bold">
            <AlertCircle className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Action Pending</p>
            <h3 className="text-2xl font-extrabold text-amber-600 mt-1">{pendingComplaints}</h3>
            <p className="text-xs text-amber-600 font-medium mt-1">Requires follow-up</p>
          </div>
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center font-bold">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">In Progress</p>
            <h3 className="text-2xl font-extrabold text-indigo-600 mt-1">{inProgressComplaints}</h3>
            <p className="text-xs text-indigo-600 font-medium mt-1">Officers dispatched</p>
          </div>
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-bold">
            <User className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Resolved</p>
            <h3 className="text-2xl font-extrabold text-emerald-600 mt-1">{resolvedComplaints}</h3>
            <p className="text-xs text-emerald-600 font-medium mt-1">Avg 14.2h resolution</p>
          </div>
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center font-bold">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Active Complaints Section */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Table Filter Header */}
        <div className="p-5 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gray-50/50">
          <div>
            <h2 className="text-base font-bold text-gray-900">Active Grievance Log</h2>
            <p className="text-xs text-gray-500">Select any grievance to trigger an automated AI status verification call to the assigned officer.</p>
          </div>
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="bg-white border border-gray-300 rounded-lg text-xs font-medium text-gray-700 px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="All">All Departments</option>
              <option value="Infrastructure">Infrastructure</option>
              <option value="Sanitation">Sanitation</option>
              <option value="Water Supply">Water Supply</option>
              <option value="Electrical">Electrical</option>
              <option value="Traffic Control">Traffic Control</option>
              <option value="Maintenance">Maintenance</option>
            </select>
          </div>
        </div>

        {/* Complaints Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-100 text-xs text-gray-500 uppercase font-semibold">
              <tr>
                <th className="px-5 py-3">ID & Title</th>
                <th className="px-5 py-3">Category</th>
                <th className="px-5 py-3">Location & Ward</th>
                <th className="px-5 py-3">Priority</th>
                <th className="px-5 py-3">Assigned Officer</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredComplaints.map((item) => {
                const assignedWorker = workers.find(w => w.name === item.assignedTo);
                const phone = assignedWorker ? assignedWorker.phone : item.assignedToPhone || "+919876543210";

                return (
                  <tr key={item.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="px-5 py-4">
                      <div className="font-bold text-gray-900">{item.id}</div>
                      <div className="text-xs text-gray-600 font-medium max-w-xs truncate">{item.title}</div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-block bg-gray-100 text-gray-800 text-xs px-2.5 py-1 rounded-md font-medium">
                        {item.category}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center space-x-1 text-xs text-gray-700 font-medium">
                        <MapPin className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                        <span>{item.ward}</span>
                      </div>
                      <p className="text-[11px] text-gray-500 max-w-xs truncate">{item.location?.address}</p>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        item.priority === 'Critical' || item.priority === 'High'
                          ? 'bg-red-100 text-red-800'
                          : item.priority === 'Medium'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {item.priority} ({item.priorityScore})
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-semibold text-gray-900 text-xs">{item.assignedTo || 'Unassigned'}</div>
                      <div className="text-[11px] text-gray-500">{phone}</div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold ${
                        item.status === 'Resolved'
                          ? 'bg-emerald-100 text-emerald-800'
                          : item.status === 'In Progress'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <CallDispatchButton
                          ticketId={item.id}
                          landmark={item.ward || item.location?.address}
                          issueType={item.category || item.title}
                          defaultPhone={phone}
                        />
                        <button
                          onClick={() => {
                            if (onTriggerCall) {
                              onTriggerCall(item, assignedWorker || { name: item.assignedTo, phone, category: item.department, ward: item.ward });
                            }
                            navigate('/calls');
                          }}
                          className="inline-flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm transition-all"
                        >
                          <PhoneCall className="w-3.5 h-3.5" />
                          <span>Call Officer</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
