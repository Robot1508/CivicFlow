import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  MapPin, 
  Rss, 
  BarChart3, 
  PhoneCall, 
  Settings,
  ShieldCheck,
  Bot
} from 'lucide-react';

export default function Sidebar({ activeCallsCount = 0 }) {
  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'AI Voice Calls', path: '/calls', icon: PhoneCall, badge: activeCallsCount > 0 ? activeCallsCount : null, highlight: true },
    { name: 'Workers & Officers', path: '/workers', icon: Users },
    { name: 'Wards', path: '/wards', icon: MapPin },
    { name: 'Live Feed', path: '/feed', icon: Rss },
    { name: 'Analytics & Reports', path: '/reports', icon: BarChart3 },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-[#1e3a8a] text-white flex flex-col h-screen fixed left-0 top-0 z-30 shadow-xl">
      {/* Brand Header */}
      <div className="p-5 border-b border-blue-800 flex items-center space-x-3">
        <div className="bg-blue-600 p-2 rounded-lg flex items-center justify-center text-white shadow-md">
          <ShieldCheck className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="font-bold text-lg leading-tight tracking-wide">CivicFlow</h1>
          <p className="text-xs text-blue-200 font-medium">Municipal Admin Portal</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-blue-100 hover:bg-blue-800/60 hover:text-white'
                } ${item.highlight && !isActive ? 'ring-1 ring-blue-400/40 bg-blue-900/40' : ''}`
              }
            >
              <div className="flex items-center space-x-3">
                <Icon className="w-5 h-5" />
                <span>{item.name}</span>
              </div>
              {item.badge && (
                <span className="bg-amber-400 text-blue-950 font-bold text-xs px-2 py-0.5 rounded-full animate-pulse">
                  {item.badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="p-4 border-t border-blue-800/80 bg-blue-950/40">
        <div className="flex items-center space-x-2 text-xs text-blue-300">
          <Bot className="w-4 h-4 text-emerald-400" />
          <span className="font-semibold text-emerald-400">Bedrock Voice Engine</span>
        </div>
        <p className="text-[11px] text-blue-300/70 mt-1">
          Simulated & Live AWS Connect Integration
        </p>
      </div>
    </aside>
  );
}
