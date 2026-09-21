import React, { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import AICalling from './pages/AICalling';
import Workers from './pages/Workers';
import Wards from './pages/Wards';
import Feed from './pages/Feed';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import { MOCK_COMPLAINTS, MOCK_WORKERS, MOCK_CALL_LOGS } from './data/mockData';
import { useCallAgent } from './hooks/useCallAgent';
import CivicHelpAgent from './components/CivicHelpAgent';

export default function App() {
  const [complaints, setComplaints] = useState(MOCK_COMPLAINTS);
  const [workers, setWorkers] = useState(MOCK_WORKERS);

  const {
    activeCalls,
    callHistory,
    demoMode,
    setDemoMode,
    initiateCall,
    terminateCall
  } = useCallAgent();

  const handleTriggerCallFromAnywhere = (complaint, worker) => {
    return initiateCall({
      complaintId: complaint.id,
      officerPhone: worker?.phone || complaint.assignedToPhone || "+919876543210",
      officerName: worker?.name || complaint.assignedTo || "Dnyaneshwar Jadhav",
      department: complaint.department,
      ward: complaint.ward
    });
  };

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50 flex">
        {/* Left Fixed Sidebar */}
        <Sidebar activeCallsCount={activeCalls.length} />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          <Navbar
            demoMode={demoMode}
            onToggleDemoMode={() => setDemoMode(!demoMode)}
          />

          <main className="flex-1 ml-64 overflow-y-auto">
            <Routes>
              <Route
                path="/"
                element={
                  <Dashboard
                    complaints={complaints}
                    workers={workers}
                    onTriggerCall={handleTriggerCallFromAnywhere}
                  />
                }
              />
              <Route
                path="/calls"
                element={
                  <AICalling
                    activeCalls={activeCalls}
                    callHistory={callHistory}
                    complaints={complaints}
                    workers={workers}
                    demoMode={demoMode}
                    onInitiateCall={initiateCall}
                    onHangupCall={terminateCall}
                    onToggleDemoMode={() => setDemoMode(!demoMode)}
                  />
                }
              />
              <Route
                path="/workers"
                element={
                  <Workers
                    workers={workers}
                    complaints={complaints}
                    onTriggerCall={handleTriggerCallFromAnywhere}
                  />
                }
              />
              <Route path="/wards" element={<Wards />} />
              <Route path="/feed" element={<Feed complaints={complaints} />} />
              <Route path="/reports" element={<Reports callLogs={callHistory} />} />
              <Route
                path="/settings"
                element={
                  <Settings
                    demoMode={demoMode}
                    onToggleDemoMode={() => setDemoMode(!demoMode)}
                  />
                }
              />
            </Routes>
          </main>
        </div>
        {/* Citizen Helping Agent Floating Widget */}
        <CivicHelpAgent />
      </div>
    </BrowserRouter>
  );
}
