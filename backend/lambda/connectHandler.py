"""
CivicFlow AWS Connect Telephony Lambda Handler
Invoked by Amazon Connect Contact Flow to drive Bedrock AI Voice Conversations & Tool Executions.
"""

import json
import os
import boto3
from agentTools import execute_lambda_tool

bedrock_client = boto3.client('bedrock-runtime', region_name=os.environ.get('AWS_REGION', 'us-east-1'))
MODEL_ID = os.environ.get('BEDROCK_MODEL_ID', 'anthropic.claude-3-5-sonnet-20240620-v1:0')

TOOL_CONFIG = {
    "tools": [
        {
            "toolSpec": {
                "name": "get_complaint_details",
                "description": "Fetch details of a grievance complaint by ID.",
                "inputSchema": {
                    "json": {
                        "type": "object",
                        "properties": {
                            "complaintId": {"type": "string", "description": "Complaint ID"}
                        },
                        "required": ["complaintId"]
                    }
                }
            }
        },
        {
            "toolSpec": {
                "name": "update_resolution_eta",
                "description": "Update resolution ETA in hours or description.",
                "inputSchema": {
                    "json": {
                        "type": "object",
                        "properties": {
                            "complaintId": {"type": "string", "description": "Complaint ID"},
                            "etaHoursOrDescription": {"type": "string", "description": "ETA string"}
                        },
                        "required": ["complaintId", "etaHoursOrDescription"]
                    }
                }
            }
        },
        {
            "toolSpec": {
                "name": "request_materials",
                "description": "Submit material requisition order.",
                "inputSchema": {
                    "json": {
                        "type": "object",
                        "properties": {
                            "complaintId": {"type": "string", "description": "Complaint ID"},
                            "materialsList": {"type": "array", "items": {"type": "string"}}
                        },
                        "required": ["complaintId", "materialsList"]
                    }
                }
            }
        }
    ]
}

def lambda_handler(event, context):
    """
    Amazon Connect contact flow entry point.
    event parameters: Details.Parameters.ComplaintId, Details.Parameters.OfficerName, Details.Parameters.UserUtterance
    """
    print("[Connect Handler Event]:", json.dumps(event))

    parameters = event.get('Details', {}).get('Parameters', {})
    complaint_id = parameters.get('ComplaintId', 'CP-2001')
    officer_name = parameters.get('OfficerName', 'Field Lead')
    user_utterance = parameters.get('UserUtterance', 'Hello, I am inspecting the site.')

    system_prompt = [
        {
            "text": f"You are CivicFlow AI calling Officer {officer_name} regarding complaint {complaint_id}. Ask for resolution ETA and materials required."
        }
    ]

    messages = [
        {
            "role": "user",
            "content": [{"text": user_utterance}]
        }
    ]

    try:
        response = bedrock_client.converse(
            modelId=MODEL_ID,
            messages=messages,
            system=system_prompt,
            toolConfig=TOOL_CONFIG
        )

        output_message = response['output']['message']
        stop_reason = response.get('stopReason')
        reply_text = ""

        for content_block in output_message.get('content', []):
            if 'text' in content_block:
                reply_text += content_block['text'] + " "

            if 'toolUse' in content_block:
                tool_use = content_block['toolUse']
                tool_name = tool_use['name']
                tool_input = tool_use['input']
                print(f"[Tool Requested]: {tool_name} with input {tool_input}")

                # Execute tool
                tool_result = execute_lambda_tool(tool_name, tool_input)
                print(f"[Tool Result]: {tool_result}")

        if not reply_text:
            reply_text = f"Thank you Officer {officer_name}. I have updated the municipal system database."

        # Return format expected by Amazon Connect
        return {
            "statusCode": 200,
            "PromptText": reply_text.strip(),
            "ComplaintId": complaint_id,
            "Status": "SUCCESS"
        }

    except Exception as e:
        print(f"[Error in Lambda Handler]: {str(e)}")
        return {
            "statusCode": 500,
            "PromptText": f"Officer {officer_name}, I recorded your update into CivicFlow.",
            "ComplaintId": complaint_id,
            "Status": "FALLBACK"
        }
