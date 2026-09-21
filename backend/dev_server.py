"""
CivicFlow Python Development Server
Runs backend/calling_api.py locally using Python standard library (http.server).
Zero external dependencies required.
"""

import json
import os
import sys
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

# Import the Lambda handler from calling_api.py
sys.path.insert(0, os.path.dirname(__file__))
from calling_api import handler as lambda_handler, _memory, seed

PORT = int(os.getenv("PORT", "3001"))

# Seed default complaint CF-1024
seed()

class LambdaRequestHandler(BaseHTTPRequestHandler):
    def _send_cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", os.getenv("CORS_ORIGIN", "*"))
        self.send_header("Access-Control-Allow-Headers", "Content-Type, X-API-Key, Authorization")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")

    def do_OPTIONS(self):
        self.send_response(204)
        self._send_cors_headers()
        self.end_headers()

    def _process_request(self, method):
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length).decode('utf-8') if content_length > 0 else ""

        parsed_url = urlparse(self.path)
        path = parsed_url.path

        event = {
            "httpMethod": method,
            "path": path,
            "rawPath": path,
            "headers": {k: v for k, v in self.headers.items()},
            "queryStringParameters": parse_qs(parsed_url.query),
            "body": body,
            "requestContext": {
                "http": {
                    "method": method
                }
            }
        }

        try:
            response = lambda_handler(event, None)
            status_code = response.get("statusCode", 200)
            headers = response.get("headers", {})
            response_body = response.get("body", "{}")

            self.send_response(status_code)
            self._send_cors_headers()
            for k, v in headers.items():
                if k.lower() not in ["access-control-allow-origin", "access-control-allow-headers", "access-control-allow-methods"]:
                    self.send_header(k, v)
            self.end_headers()
            self.wfile.write(response_body.encode('utf-8'))

        except Exception as e:
            self.send_response(500)
            self._send_cors_headers()
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            err_json = json.dumps({"error": str(e)})
            self.wfile.write(err_json.encode('utf-8'))

    def do_GET(self):
        self._process_request("GET")

    def do_POST(self):
        self._process_request("POST")

    def do_PUT(self):
        self._process_request("PUT")

    def do_PATCH(self):
        self._process_request("PATCH")

    def do_DELETE(self):
        self._process_request("DELETE")

    def log_message(self, format, *args):
        # Custom clean log format
        print(f"[Python Calling API Server] {args[0]} - {args[1]}")

def run_server():
    server_address = ('', PORT)
    httpd = HTTPServer(server_address, LambdaRequestHandler)
    print(f"[CivicFlow Python Server] Running on http://localhost:{PORT}")
    print(f"[CivicFlow Python Server] Handler: backend/calling_api.py (DEMO_MODE={os.getenv('DEMO_MODE', 'true')})")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping Python server...")
        httpd.server_close()

if __name__ == "__main__":
    run_server()
