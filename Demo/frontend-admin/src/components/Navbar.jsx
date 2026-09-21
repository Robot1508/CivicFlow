import React from 'react';
import { Bell, Search, Radio, Bot, PlayCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Navbar({ demoMode = true, onToggleDemoMode }) {
  const navigate = useNavigate();

  return (
    <header className="h-16 bg-white border-b border-gray-200 px-6 flex items-center justify-between ml-64 sticky top-0 z-20 shadow-sm">
      {/* Title / Search */}
      <div className="flex items-center space-x-4">
        <h2 className="text-xl font-bold text-gray-800 tracking-tight">CivicFlow Admin Dashboard</h2>
        <div className="relative hidden md:block">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search complaint ID, ward, or officer..."
            className="pl-9 pr-4 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
          />
        </div>
      </div>

      {/* Right Tools & Mode Indicator */}
      <div className="flex items-center space-x-4">
        {/* Quick Call Action */}
        <button
          onClick={() => navigate('/calls')}
          className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-3.5 py-1.5 rounded-lg text-sm font-semibold shadow-sm transition-all"
        >
          <Bot className="w-4 h-4 text-blue-200" />
          <span>Launch AI Call</span>
        </button>

        {/* DEMO_MODE toggle badge */}
        <button
          onClick={onToggleDemoMode}
          className={`flex items-center space-x-2 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
            demoMode
              ? 'bg-amber-50 border-amber-300 text-amber-800 hover:bg-amber-100'
              : 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100'
          }`}
          title="Click to toggle between DEMO_MODE (Simulation) and LIVE_MODE (AWS Connect)"
        >
          {demoMode ? (
            <>
              <PlayCircle className="w-3.5 h-3.5 text-amber-600" />
              <span>DEMO MODE (Simulated Calls)</span>
            </>
          ) : (
            <>
              <Radio className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
              <span>LIVE MODE (AWS Connect)</span>
            </>
          )}
        </button>

        {/* Notification Icon */}
        <button className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-600 rounded-full"></span>
        </button>

        {/* Admin Avatar */}
        <div className="flex items-center space-x-3 pl-2 border-l border-gray-200">
          <div className="w-8 h-8 rounded-full bg-blue-900 text-white font-bold flex items-center justify-center text-xs">
            AD
          </div>
          <div className="text-left hidden sm:block">
            <p className="text-xs font-semibold text-gray-800 leading-tight">Admin Officer</p>
            <p className="text-[10px] text-gray-500">Municipal Control</p>
          </div>
        </div>
      </div>
    </header>
  );
}
