// In-memory backend data store for CivicFlow Telephony Backend

export const store = {
  complaints: [
    {
      id: "CP-2001",
      title: "Large Pothole near Central Market",
      category: "Road",
      department: "Infrastructure",
      ward: "Ward 3",
      status: "In Progress",
      priority: "High",
      priorityScore: 87,
      reportedBy: "Ramesh Sharma",
      reportedAt: "2026-03-10T10:15:00Z",
      assignedTo: "Dnyaneshwar Jadhav",
      assignedToPhone: "+919876543210",
      resolutionTime: null,
      location: { lat: 19.0760, lng: 72.8777, address: "Main Road, Ward 3, Near City Center" },
      description: "Dangerous pothole creating traffic bottlenecks and hazard for 2-wheelers.",
      materialsNeeded: []
    },
    {
      id: "CP-2002",
      title: "Overflowing Garbage Bin",
      category: "Sanitation",
      department: "Sanitation",
      ward: "Ward 7",
      status: "Submitted",
      priority: "Medium",
      priorityScore: 62,
      reportedBy: "Priya Verma",
      reportedAt: "2026-03-11T08:30:00Z",
      assignedTo: "Vishwas Kamble",
      assignedToPhone: "+919876543211",
      resolutionTime: null,
      location: { lat: 19.0820, lng: 72.8820, address: "Sector 4 Market, Ward 7" },
      description: "Garbage bin overflowing for 3 days, foul odor spreading.",
      materialsNeeded: []
    },
    {
      id: "CP-2003",
      title: "Water Pipeline Leakage",
      category: "Water Supply",
      department: "Water Supply",
      ward: "Ward 9",
      status: "Assigned",
      priority: "High",
      priorityScore: 91,
      reportedBy: "Amit Patel",
      reportedAt: "2026-03-12T06:45:00Z",
      assignedTo: "Santosh Chougule",
      assignedToPhone: "+919876543212",
      resolutionTime: null,
      location: { lat: 19.0900, lng: 72.8900, address: "Subhash Nagar Road, Ward 9" },
      description: "Major water pipeline leakage flooding the street.",
      materialsNeeded: []
    }
  ],

  workers: [
    {
      id: "W-01",
      name: "Dnyaneshwar Jadhav",
      category: "Infrastructure",
      ward: "Ward 3",
      phone: "+919876543210",
      status: "Active",
      openTasks: 2
    },
    {
      id: "W-02",
      name: "Vishwas Kamble",
      category: "Sanitation",
      ward: "Ward 7",
      phone: "+919876543211",
      status: "Active",
      openTasks: 1
    },
    {
      id: "W-03",
      name: "Santosh Chougule",
      category: "Water Supply",
      ward: "Ward 9",
      phone: "+919876543212",
      status: "Active",
      openTasks: 3
    }
  ],

  // Active call sessions indexed by callId
  activeCalls: {},

  // Completed call history
  callHistory: [
    {
      id: "CALL-1001",
      complaintId: "CP-2005",
      officerName: "Rajan Bhosale",
      officerPhone: "+919876543214",
      department: "Traffic Control",
      ward: "Ward 6",
      initiatedAt: "2026-03-08T09:12:00Z",
      completedAt: "2026-03-08T09:14:30Z",
      durationSeconds: 150,
      status: "COMPLETED",
      summary: "Officer confirmed signal control box replacement needed. Estimated 4 hours.",
      toolsTriggered: ["get_complaint_details", "update_resolution_eta", "request_materials"],
      extractedData: {
        eta: "4 hours",
        delayReason: null,
        materialsNeeded: ["Signal Relay Unit CP-9"],
        verifiedStatus: "In Progress"
      },
      transcript: [
        { speaker: "AI", text: "Hello Officer Rajan, calling regarding Complaint CP-2005." },
        { speaker: "Officer", text: "Signal relay unit is blown. I need CP-9 relay. Will finish in 4 hours." },
        { speaker: "AI", text: "Thank you. ETA updated and material request submitted." }
      ]
    }
  ]
};
