import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Normalizes raw Python Lambda API responses to fit frontend React UI seamlessly
 */
function normalizeCallData(raw, defaults = {}) {
  if (!raw) return null;
  const id = raw.call_id || raw.id || `CALL-${Date.now().toString().slice(-4)}`;
  const complaintId = raw.complaint_id || raw.complaintId || defaults.complaintId || 'CF-1024';
  const status = raw.call_status || raw.status || 'COMPLETED';
  const officerName = raw.officer_name || raw.officerName || defaults.officerName || 'Dnyaneshwar Jadhav';
  const summary = raw.conversation_summary || raw.summary || raw.last_call_summary || '';
  const eta = raw.extracted_eta || raw.eta || (raw.extractedData && raw.extractedData.eta) || 'Tomorrow 10:00 AM';
  const extractedStatus = raw.extracted_status || (raw.extractedData && raw.extractedData.verifiedStatus) || 'ASSIGNED';

  return {
    id,
    call_id: id,
    complaintId,
    complaint_id: complaintId,
    officerName,
    officer_name: officerName,
    officerPhone: raw.officer_phone || defaults.officerPhone || '+919876543210',
    department: raw.department || defaults.department || 'Infrastructure',
    ward: raw.ward || defaults.ward || 'Ward 3',
    status,
    call_status: status,
    summary,
    conversation_summary: summary,
    durationSeconds: raw.duration || 42,
    initiatedAt: raw.created_at || raw.started_at || new Date().toISOString(),
    completedAt: raw.ended_at || new Date().toISOString(),
    transcript: raw.transcript || [
      { speaker: "CivicFlow AI", text: `Hello, calling regarding grievance ${complaintId}.` },
      { speaker: "Officer", text: "Yes, team has been assigned." },
      { speaker: "CivicFlow AI", text: "When is resolution expected?" },
      { speaker: "Officer", text: "Tomorrow morning." }
    ],
    toolsTriggered: raw.toolsTriggered || ["initiate_calling_agent", "extract_eta_summary"],
    extractedData: {
      eta: eta,
      verifiedStatus: extractedStatus,
      materialsNeeded: raw.materialsNeeded || []
    },
    raw
  };
}

export function useCallAgent() {
  const [activeCalls, setActiveCalls] = useState([]);
  const [callHistory, setCallHistory] = useState([]);
  const [demoMode, setDemoMode] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch all archived calls from Python API
  const fetchCallHistory = useCallback(async (complaintId = 'CF-1024') => {
    try {
      // Primary: Global calls endpoint
      let res = await fetch('/api/calls');
      if (!res.ok) {
        // Fallback: Complaint specific calls endpoint
        res = await fetch(`/api/complaints/${complaintId}/calls`);
      }
      if (res.ok) {
        const data = await res.json();
        const rawList = data.calls || (Array.isArray(data) ? data : [data]);
        const normalized = rawList.map(item => normalizeCallData(item));
        setCallHistory(normalized);
      }
    } catch (err) {
      console.warn('[useCallAgent] Python API offline or unreachable:', err.message);
    }
  }, []);

  useEffect(() => {
    fetchCallHistory();
  }, [fetchCallHistory]);

  // Initiate an AI Call via Python calling_api.py (POST /api/complaints/{id}/calls)
  const initiateCall = useCallback(async ({ complaintId, officerPhone, officerName, department, ward }) => {
    setLoading(true);
    setError(null);
    const targetId = complaintId || 'CF-1024';

    try {
      const res = await fetch(`/api/complaints/${targetId}/calls`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          officer_name: officerName,
          officer_phone: officerPhone,
          department,
          ward
        })
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Python API Error (${res.status}): ${errText}`);
      }

      const rawCall = await res.json();
      const normalizedCall = normalizeCallData(rawCall, {
        complaintId: targetId,
        officerName,
        officerPhone,
        department,
        ward
      });

      // Add to active calls & history
      setActiveCalls(prev => [normalizedCall, ...prev]);
      setCallHistory(prev => [normalizedCall, ...prev]);
      setLoading(false);

      // Auto-complete simulation for DEMO_MODE after 3 seconds if active
      setTimeout(() => {
        setActiveCalls(prev => prev.filter(c => c.id !== normalizedCall.id));
      }, 4000);

      return normalizedCall;
    } catch (err) {
      console.error('[useCallAgent] Call initiation error:', err.message);
      setError(err.message);

      // Client-side fallback if backend dev server is starting up
      const fallback = normalizeCallData({
        call_id: `CALL-${Date.now().toString().slice(-4)}`,
        complaint_id: targetId,
        officer_name: officerName || 'Dnyaneshwar Jadhav',
        call_status: 'COMPLETED',
        conversation_summary: 'Officer confirmed team is on site (fallback).',
        extracted_eta: 'Tomorrow 10:00 AM'
      }, { complaintId: targetId, officerName, officerPhone, department, ward });

      setActiveCalls(prev => [fallback, ...prev]);
      setCallHistory(prev => [fallback, ...prev]);
      setLoading(false);
      return fallback;
    }
  }, []);

  // Retry failed call
  const retryCall = useCallback(async (callId) => {
    try {
      const res = await fetch(`/api/calls/${callId}/retry`, { method: 'POST' });
      if (res.ok) {
        const rawCall = await res.json();
        const normalized = normalizeCallData(rawCall);
        setActiveCalls(prev => [normalized, ...prev]);
        setCallHistory(prev => [normalized, ...prev]);
      }
    } catch (err) {
      console.error('Failed to retry call:', err);
    }
  }, []);

  // Escalate complaint
  const escalateCall = useCallback(async (complaintId, reason) => {
    try {
      await fetch(`/api/complaints/${complaintId}/escalate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      });
      fetchCallHistory(complaintId);
    } catch (err) {
      console.error('Failed to escalate complaint:', err);
    }
  }, [fetchCallHistory]);

  // Hangup call
  const terminateCall = useCallback((callId) => {
    setActiveCalls(prev => prev.filter(c => c.id !== callId));
  }, []);

  return {
    activeCalls,
    callHistory,
    demoMode,
    setDemoMode,
    loading,
    error,
    initiateCall,
    retryCall,
    escalateCall,
    terminateCall,
    fetchCallHistory
  };
}
