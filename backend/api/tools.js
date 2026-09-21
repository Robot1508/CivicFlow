import { store } from './data/store.js';

/**
 * Municipal Telephony Agent Tool Definitions & Executions
 */

export const TOOL_DEFINITIONS = [
  {
    name: "get_complaint_details",
    description: "Fetch details of a specific grievance/complaint by its ID.",
    inputSchema: {
      json: {
        type: "object",
        properties: {
          complaintId: { type: "string", description: "Complaint ID, e.g., CP-2001" }
        },
        required: ["complaintId"]
      }
    }
  },
  {
    name: "update_resolution_eta",
    description: "Update estimated time of completion/resolution for a grievance.",
    inputSchema: {
      json: {
        type: "object",
        properties: {
          complaintId: { type: "string", description: "Complaint ID" },
          etaHoursOrDescription: { type: "string", description: "ETA string, e.g., '3 hours', 'Tomorrow 10 AM'" }
        },
        required: ["complaintId", "etaHoursOrDescription"]
      }
    }
  },
  {
    name: "request_materials",
    description: "Submit a requisition for materials or equipment required for repair work.",
    inputSchema: {
      json: {
        type: "object",
        properties: {
          complaintId: { type: "string", description: "Complaint ID" },
          materialsList: {
            type: "array",
            items: { type: "string" },
            description: "List of material names/specs"
          }
        },
        required: ["complaintId", "materialsList"]
      }
    }
  },
  {
    name: "report_delay_reason",
    description: "Log an official delay reason for an overdue complaint.",
    inputSchema: {
      json: {
        type: "object",
        properties: {
          complaintId: { type: "string", description: "Complaint ID" },
          reason: { type: "string", description: "Reason for delay, e.g., Rain blockage, missing parts" }
        },
        required: ["complaintId", "reason"]
      }
    }
  },
  {
    name: "verify_resolution_status",
    description: "Verify or update the operational status of a grievance (e.g. Resolved, In Progress).",
    inputSchema: {
      json: {
        type: "object",
        properties: {
          complaintId: { type: "string", description: "Complaint ID" },
          status: { type: "string", enum: ["Submitted", "Assigned", "In Progress", "Resolved", "Closed"] }
        },
        required: ["complaintId", "status"]
      }
    }
  },
  {
    name: "escalate_to_supervisor",
    description: "Escalate an unresolvable or emergency issue to the Chief Ward Engineer.",
    inputSchema: {
      json: {
        type: "object",
        properties: {
          complaintId: { type: "string", description: "Complaint ID" },
          escalationReason: { type: "string", description: "Critical reason for escalation" }
        },
        required: ["complaintId", "escalationReason"]
      }
    }
  },
  {
    name: "reschedule_inspection",
    description: "Reschedule field site inspection time.",
    inputSchema: {
      json: {
        type: "object",
        properties: {
          complaintId: { type: "string", description: "Complaint ID" },
          newDateTime: { type: "string", description: "New ISO date/time string" }
        },
        required: ["complaintId", "newDateTime"]
      }
    }
  },
  {
    name: "confirm_worker_assignment",
    description: "Confirm or re-assign field worker to a complaint.",
    inputSchema: {
      json: {
        type: "object",
        properties: {
          complaintId: { type: "string", description: "Complaint ID" },
          workerName: { type: "string", description: "Name of assigned worker" }
        },
        required: ["complaintId", "workerName"]
      }
    }
  },
  {
    name: "end_call",
    description: "Conclude and disconnect the active call session once all information is recorded.",
    inputSchema: {
      json: {
        type: "object",
        properties: {
          callId: { type: "string", description: "Active Call Session ID" },
          summary: { type: "string", description: "Final brief summary of call outcomes" }
        },
        required: ["callId", "summary"]
      }
    }
  }
];

export function executeTool(toolName, args, callSession) {
  const complaint = store.complaints.find(c => c.id === args.complaintId) || store.complaints[0];

  switch (toolName) {
    case "get_complaint_details":
      return {
        success: true,
        complaint: complaint || { id: args.complaintId, title: "Grievance Record", status: "In Progress" }
      };

    case "update_resolution_eta":
      if (complaint) {
        complaint.eta = args.etaHoursOrDescription;
        complaint.status = "In Progress";
      }
      if (callSession) {
        callSession.extractedData = callSession.extractedData || {};
        callSession.extractedData.eta = args.etaHoursOrDescription;
        callSession.extractedData.verifiedStatus = "In Progress";
        if (!callSession.toolsTriggered.includes("update_resolution_eta")) {
          callSession.toolsTriggered.push("update_resolution_eta");
        }
      }
      return {
        success: true,
        message: `Resolution ETA for ${args.complaintId} set to ${args.etaHoursOrDescription}`
      };

    case "request_materials":
      if (complaint) {
        complaint.materialsNeeded = args.materialsList;
      }
      if (callSession) {
        callSession.extractedData = callSession.extractedData || {};
        callSession.extractedData.materialsNeeded = args.materialsList;
        if (!callSession.toolsTriggered.includes("request_materials")) {
          callSession.toolsTriggered.push("request_materials");
        }
      }
      return {
        success: true,
        message: `Materials requisition submitted for ${args.complaintId}: ${args.materialsList.join(', ')}`
      };

    case "report_delay_reason":
      if (complaint) {
        complaint.delayReason = args.reason;
      }
      if (callSession) {
        callSession.extractedData = callSession.extractedData || {};
        callSession.extractedData.delayReason = args.reason;
        if (!callSession.toolsTriggered.includes("report_delay_reason")) {
          callSession.toolsTriggered.push("report_delay_reason");
        }
      }
      return {
        success: true,
        message: `Delay reason logged for ${args.complaintId}`
      };

    case "verify_resolution_status":
      if (complaint) {
        complaint.status = args.status;
      }
      if (callSession) {
        callSession.extractedData = callSession.extractedData || {};
        callSession.extractedData.verifiedStatus = args.status;
        if (!callSession.toolsTriggered.includes("verify_resolution_status")) {
          callSession.toolsTriggered.push("verify_resolution_status");
        }
      }
      return {
        success: true,
        message: `Status updated to ${args.status}`
      };

    case "escalate_to_supervisor":
      if (callSession) {
        callSession.status = "ESCALATED";
        if (!callSession.toolsTriggered.includes("escalate_to_supervisor")) {
          callSession.toolsTriggered.push("escalate_to_supervisor");
        }
      }
      return {
        success: true,
        message: `Issue escalated to Chief Ward Engineer: ${args.escalationReason}`
      };

    case "reschedule_inspection":
      return {
        success: true,
        message: `Inspection rescheduled to ${args.newDateTime}`
      };

    case "confirm_worker_assignment":
      if (complaint) {
        complaint.assignedTo = args.workerName;
      }
      return {
        success: true,
        message: `Worker ${args.workerName} confirmed for ${args.complaintId}`
      };

    case "end_call":
      if (callSession) {
        callSession.status = "COMPLETED";
        callSession.summary = args.summary;
        if (!callSession.toolsTriggered.includes("end_call")) {
          callSession.toolsTriggered.push("end_call");
        }
      }
      return {
        success: true,
        message: `Call ${args.callId} terminated cleanly.`
      };

    default:
      return { success: false, error: `Unknown tool: ${toolName}` };
  }
}
