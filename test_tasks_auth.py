#!/usr/bin/env python3
"""
Local auth test — run before deploying.

Usage:
  export GOOGLE_TASKS_CREDENTIALS='<paste the full JSON here>'
  python3 test_tasks_auth.py
"""

import os, json, sys
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build

SCOPES = ["https://www.googleapis.com/auth/tasks"]

raw = os.environ.get("GOOGLE_TASKS_CREDENTIALS")
if not raw:
    print("❌ GOOGLE_TASKS_CREDENTIALS env var not set")
    sys.exit(1)

try:
    info = json.loads(raw)
except json.JSONDecodeError as e:
    print(f"❌ JSON parse failed: {e}")
    sys.exit(1)

required = {"client_id", "client_secret", "refresh_token", "token_uri"}
missing = required - info.keys()
if missing:
    print(f"❌ JSON missing keys: {missing}")
    sys.exit(1)

print("✅ JSON parsed OK")
print(f"   client_id:     {info['client_id'][:30]}...")
print(f"   refresh_token: {info['refresh_token'][:20]}...")

try:
    creds = Credentials.from_authorized_user_info(info, SCOPES)
    creds.refresh(Request())
    print("✅ Token refreshed OK")
    print(f"   access_token: {creds.token[:20]}...")
except Exception as e:
    print(f"❌ Token refresh failed: {e}")
    sys.exit(1)

try:
    service = build("tasks", "v1", credentials=creds)
    lists = service.tasklists().list().execute()
    print(f"✅ Tasks API reachable — found {len(lists.get('items', []))} list(s):")
    for tl in lists.get("items", []):
        print(f"   • {tl['title']} (id: {tl['id']})")
except Exception as e:
    print(f"❌ Tasks API call failed: {e}")
    sys.exit(1)

print("\n🎉 All checks passed — safe to deploy")
