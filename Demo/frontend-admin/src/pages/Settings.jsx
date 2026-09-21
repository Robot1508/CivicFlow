import React from 'react';
import { Settings, Shield, Radio, Bot, Server, CheckCircle2, Cpu } from 'lucide-react';

export default function SettingsPage({ demoMode = true, onToggleDemoMode }) {
  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">System Settings & Telephony Config</h1>
        <p className="text-sm text-gray-500">Configure AI Bedrock models, Amazon Connect integration mode, and simulation options.</p>
      </div>

      {/* DEMO_MODE Card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`p-2.5 rounded-xl ${demoMode ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
              <Radio className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-lg">Execution Mode</h3>
              <p className="text-xs text-gray-500">Switch between offline simulated calls and real Amazon Connect calls.</p>
            </div>
          </div>
          <button
            onClick={onToggleDemoMode}
            className={`px-4 py-2 rounded-lg font-bold text-sm shadow-sm transition-all ${
              demoMode
                ? 'bg-amber-500 hover:bg-amber-600 text-white'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            }`}
          >
            {demoMode ? 'Currently: DEMO MODE (Simulated)' : 'Currently: LIVE MODE (AWS Connect)'}
          </button>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg text-xs text-gray-700 space-y-2 border border-gray-200">
          <div className="flex justify-between items-center font-medium">
            <span>DEMO_MODE (Simulation):</span>
            <span className="text-emerald-700 font-bold">Enabled</span>
          </div>
          <p className="text-gray-500">
            Simulates dynamic officer responses with animated audio waveform, multi-turn tool calling, and live data mutation without dialing external phone numbers. Ideal for hackathon demonstrations.
          </p>
          <div className="flex justify-between items-center font-medium pt-2 border-t border-gray-200">
            <span>LIVE_MODE (AWS Connect + Bedrock):</span>
            <span className="text-gray-600 font-mono">arn:aws:connect:us-east-1:123456789012:instance/...</span>
          </div>
        </div>
      </div>

      {/* AWS Bedrock Configuration */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-4">
        <div className="flex items-center space-x-3 border-b border-gray-100 pb-3">
          <Cpu className="w-5 h-5 text-blue-600" />
          <h3 className="font-bold text-gray-900 text-base">AWS Bedrock Telephony Agent Engine</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-1">
            <span className="text-gray-500 block">LLM Model ID</span>
            <span className="font-mono font-bold text-gray-800">anthropic.claude-3-5-sonnet-20240620-v1:0</span>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-1">
            <span className="text-gray-500 block">AWS Region</span>
            <span className="font-mono font-bold text-gray-800">us-east-1 (N. Virginia)</span>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-1">
            <span className="text-gray-500 block">Available Tools</span>
            <span className="font-bold text-blue-700">9 Municipal Operations Tools Registered</span>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-1">
            <span className="text-gray-500 block">Backend Server</span>
            <span className="font-mono font-bold text-emerald-700">http://localhost:3001/api</span>
          </div>
        </div>
      </div>

      {/* System Prompt Inspector */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-3">
        <div className="flex items-center space-x-2">
          <Bot className="w-5 h-5 text-indigo-600" />
          <h3 className="font-bold text-gray-900 text-base">Active Agent System Instructions</h3>
        </div>
        <pre className="bg-gray-900 text-gray-200 p-4 rounded-lg text-xs font-mono overflow-x-auto whitespace-pre-wrap max-h-48 border border-gray-800">
{`You are CivicFlow Automated Municipal Calling Agent.
Your purpose: Call municipal field officers, inquire about complaint status, record ETAs, request missing materials, report delays, or escalate emergencies.

Rules:
1. Speak concisely in natural conversational tone.
2. Use tools immediately when officer provides data (e.g. update_resolution_eta, request_materials).
3. Confirm all details before terminating call with end_call tool.`}
        </pre>
      </div>
    </div>
  );
}
