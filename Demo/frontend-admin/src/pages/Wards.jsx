import React from 'react';
import { MOCK_WARDS } from '../data/mockData';
import { MapPin, Users, AlertTriangle, CheckCircle } from 'lucide-react';

export default function Wards() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Municipal Wards Directory</h1>
        <p className="text-sm text-gray-500">Overview of municipal divisions, designated officers, and issue statistics.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {MOCK_WARDS.map((ward) => (
          <div key={ward.id} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center space-x-2">
                <MapPin className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-gray-900 text-lg">{ward.name}</h3>
              </div>
              <span className="text-xs font-mono bg-blue-50 text-blue-700 px-2 py-1 rounded font-semibold">{ward.id}</span>
            </div>

            <div className="space-y-2 text-xs text-gray-600">
              <div className="flex justify-between">
                <span className="text-gray-500">Designated Officer:</span>
                <span className="font-bold text-gray-800">{ward.officer}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Population:</span>
                <span className="font-medium text-gray-800">{ward.population.toLocaleString()} citizens</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Active Issues:</span>
                <span className="font-bold text-amber-600 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> {ward.activeIssues} open
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Resolved This Month:</span>
                <span className="font-bold text-emerald-600 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" /> {ward.resolvedThisMonth} solved
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
