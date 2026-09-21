"""CivicFlow calling-agent API for AWS Lambda/API Gateway."""
import json, os, re, uuid
from datetime import datetime, timedelta, timezone
import boto3

UTC = timezone.utc
DEMO_MODE = os.getenv("DEMO_MODE", "true").lower() == "true"
TABLE_NAME = os.getenv("CIVICFLOW_TABLE", "")
_memory = {"complaints": {}, "calls": {}}

def now(): return datetime.now(UTC).isoformat()
def seed():
    c = {"id":"CF-1024","title":"Garbage collection at Shivaji Chowk","description":"Overflowing public waste bin has not been collected.","department_id":"sanitation","department":"Sanitation","officer_id":"officer-sanit-01","officer_name":"Municipal Sanitation Officer","officer_phone":"+919999999999","status":"OPEN","eta":None,"escalated":False,"created_at":now(),"updated_at":now()}
    return _memory["complaints"].setdefault(c["id"], c)
def tbl(): return boto3.resource("dynamodb", region_name=os.getenv("AWS_REGION","ap-south-1")).Table(TABLE_NAME)
def complaint(cid):
    if not TABLE_NAME:
        if cid not in _memory["complaints"]:
            if cid == "CF-1024":
                seed()
            else:
                _memory["complaints"][cid] = {"id":cid,"title":f"Municipal Grievance {cid}","description":"Reported civic issue","department_id":"infrastructure","department":"Infrastructure","officer_id":f"officer-{cid}","officer_name":"Dnyaneshwar Jadhav","officer_phone":"+919876543210","status":"OPEN","eta":None,"escalated":False,"created_at":now(),"updated_at":now()}
        return _memory["complaints"].get(cid)
    return tbl().get_item(Key={"PK":f"COMPLAINT#{cid}","SK":"META"}).get("Item")

def save_complaint(c):
    c["updated_at"] = now()
    if not TABLE_NAME: _memory["complaints"][c["id"]] = c; return c
    item=dict(c, PK=f"COMPLAINT#{c['id']}", SK="META", entity="complaint"); tbl().put_item(Item=item); return item

def calls(cid):
    if not TABLE_NAME: return sorted([v for v in _memory["calls"].values() if v["complaint_id"] == cid], key=lambda x:x["created_at"], reverse=True)
    q=tbl().query(KeyConditionExpression=boto3.dynamodb.conditions.Key("PK").eq(f"COMPLAINT#{cid}") & boto3.dynamodb.conditions.Key("SK").begins_with("CALL#")); return sorted(q.get("Items",[]),key=lambda x:x["created_at"],reverse=True)

def call(call_id):
    if not TABLE_NAME: return _memory["calls"].get(call_id)
    q=tbl().query(IndexName="call_id-index",KeyConditionExpression=boto3.dynamodb.conditions.Key("call_id").eq(call_id)); return q.get("Items",[None])[0]

def save_call(c):
    if not TABLE_NAME: _memory["calls"][c["call_id"]]=c; return c
    item=dict(c,PK=f"COMPLAINT#{c['complaint_id']}",SK=f"CALL#{c['created_at']}#{c['call_id']}",entity="call"); tbl().put_item(Item=item); return item

def cfg(*names):
    missing=[n for n in names if not os.getenv(n)]
    if missing: raise ValueError("Missing required configuration: "+", ".join(missing))

def initiate(c):
    record={"call_id":str(uuid.uuid4()),"complaint_id":c["id"],"officer_id":c.get("officer_id"),"officer_name":c.get("officer_name"),"phone_number_reference":"demo" if DEMO_MODE else "masked","created_at":now(),"started_at":now(),"ended_at":None,"duration":None,"call_status":"INITIATED","conversation_summary":None,"extracted_status":None,"extracted_eta":None,"blocker":None,"escalation_reason":None,"retry_count":0}
    if DEMO_MODE:
        eta=(datetime.now(UTC)+timedelta(days=1)).replace(hour=10,minute=0,second=0,microsecond=0).isoformat()
        summary="Officer confirmed the team is assigned and expects resolution tomorrow morning."
        c.update({"status":"ASSIGNED","eta":eta,"last_call_summary":summary}); save_complaint(c)
        record.update({"call_status":"COMPLETED","ended_at":now(),"duration":42,"transcript":[{"speaker":"CivicFlow AI","text":f"Hello, I'm calling regarding {c['id']}: {c['title']}. Is this assigned to your department?"},{"speaker":"Officer","text":"Yes, the team has been assigned."},{"speaker":"CivicFlow AI","text":"When do you expect it to be resolved?"},{"speaker":"Officer","text":"Tomorrow morning."}],"conversation_summary":summary,"extracted_status":"ASSIGNED","extracted_eta":eta}); return save_call(record)
    cfg("CIVICFLOW_TABLE","AMAZON_CONNECT_INSTANCE_ID","AMAZON_CONNECT_CONTACT_FLOW_ID","AMAZON_CONNECT_SOURCE_PHONE_NUMBER")
    if not re.fullmatch(r"\+[1-9]\d{7,14}",c.get("officer_phone", "")): raise ValueError("Officer has no valid E.164 phone number")
    result=boto3.client("connect",region_name=os.getenv("AWS_REGION","ap-south-1")).start_outbound_voice_contact(InstanceId=os.environ["AMAZON_CONNECT_INSTANCE_ID"],ContactFlowId=os.environ["AMAZON_CONNECT_CONTACT_FLOW_ID"],DestinationPhoneNumber=c["officer_phone"],CallerId=os.environ["AMAZON_CONNECT_SOURCE_PHONE_NUMBER"],Attributes={"complaint_id":c["id"],"call_id":record["call_id"]})
    record.update({"call_status":"RINGING","provider_contact_id":result["ContactId"]}); return save_call(record)

def out(status, body): return {"statusCode":status,"headers":{"Content-Type":"application/json","Access-Control-Allow-Origin":os.getenv("CORS_ORIGIN","*"),"Access-Control-Allow-Headers":"Content-Type,X-API-Key","Access-Control-Allow-Methods":"GET,POST,OPTIONS"},"body":json.dumps(body,default=str)}

def handler(event, context):
    try:
        method=event.get("requestContext",{}).get("http",{}).get("method") or event.get("httpMethod","GET"); path=(event.get("rawPath") or event.get("path","")).rstrip("/") or "/"
        if method == "OPTIONS": return out(204,{})
        key=os.getenv("CIVICFLOW_API_KEY"); headers={k.lower():v for k,v in (event.get("headers") or {}).items()}
        if key and headers.get("x-api-key") != key: return out(401,{"error":"Unauthorized"})
        m=re.fullmatch(r"/api/calls",path)
        if method == "GET" and m:
            all_c = sorted(list(_memory["calls"].values()), key=lambda x: x.get("created_at",""), reverse=True)
            return out(200, {"calls": all_c})
        m=re.fullmatch(r"/api/complaints/([^/]+)",path)
        if method == "GET" and m:
            c=complaint(m.group(1)); return out(200,c) if c else out(404,{"error":"Complaint not found"})
        m=re.fullmatch(r"/api/complaints/([^/]+)/calls",path)
        if m and method == "GET": return out(200,{"calls":calls(m.group(1))})
        if m and method == "POST":
            c=complaint(m.group(1)); return out(201,initiate(c)) if c else out(404,{"error":"Complaint not found"})
        m=re.fullmatch(r"/api/calls/([^/]+)",path)
        if m and method == "GET":
            v=call(m.group(1)); return out(200,v) if v else out(404,{"error":"Call not found"})
        m=re.fullmatch(r"/api/calls/([^/]+)/retry",path)
        if m and method == "POST":
            old=call(m.group(1))
            if not old: return out(404,{"error":"Call not found"})
            if old["call_status"] not in {"NO_ANSWER","BUSY","FAILED"}: return out(409,{"error":"Only failed, busy, or unanswered calls can be retried"})
            return out(201,initiate(complaint(old["complaint_id"])))
        m=re.fullmatch(r"/api/complaints/([^/]+)/escalate",path)
        if m and method == "POST":
            c=complaint(m.group(1))
            if not c: return out(404,{"error":"Complaint not found"})
            b=json.loads(event.get("body") or "{}"); c.update({"escalated":True,"escalation_reason":b.get("reason","Manual escalation"),"status":"ESCALATED"}); return out(200,save_complaint(c))
        return out(404,{"error":"Route not found"})
    except ValueError as e: return out(400,{"error":str(e)})
    except Exception as e: return out(500,{"error":f"Calling service error: {str(e)}"})
