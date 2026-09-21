import React from 'react';
import { Rss, ThumbsUp, MessageSquare, Clock, MapPin } from 'lucide-react';
import CallDispatchButton from '../components/CallDispatchButton';

export default function Feed({ complaints = [] }) {
  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Citizen Grievance Live Feed</h1>
        <p className="text-sm text-gray-500">Real-time public grievance stream submitted via mobile apps & WhatsApp bot.</p>
      </div>

      <div className="space-y-4">
        {complaints.map((item) => (
          <div key={item.id} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 text-white font-bold flex items-center justify-center text-xs">
                  {item.reportedBy ? item.reportedBy.split(' ').map(n => n[0]).join('') : 'CZ'}
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 text-sm">{item.reportedBy}</h4>
                  <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                    <Clock className="w-3 h-3" /> {new Date(item.reportedAt).toLocaleString()} • {item.ward}
                  </p>
                </div>
              </div>
              <span className={`px-2.5 py-1 rounded-md text-xs font-semibold ${
                item.status === 'Resolved' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
              }`}>
                {item.status}
              </span>
            </div>

            <h3 className="font-bold text-gray-800 text-base">{item.title}</h3>
            <p className="text-sm text-gray-600 leading-relaxed">{item.description}</p>

            {item.image && (
              <div className="mt-2 rounded-lg overflow-hidden border border-gray-200 max-h-64">
                <img src={item.image} alt={item.title} className="w-full h-48 object-cover" />
              </div>
            )}

            <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
              <div className="flex items-center space-x-4">
                <span className="flex items-center space-x-1 hover:text-blue-600 cursor-pointer">
                  <ThumbsUp className="w-4 h-4" />
                  <span>Upvote (14)</span>
                </span>
                <span className="flex items-center space-x-1 hover:text-blue-600 cursor-pointer">
                  <MessageSquare className="w-4 h-4" />
                  <span>Comments (3)</span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <CallDispatchButton
                  ticketId={item.id}
                  landmark={item.ward}
                  issueType={item.title}
                  defaultPhone={item.assignedToPhone || "+919370777698"}
                />
                <span className="font-semibold text-blue-700 bg-blue-50 px-2 py-1 rounded">
                  Assigned to: {item.assignedTo}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
