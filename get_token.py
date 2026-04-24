#!/usr/bin/env python3
"""
Run once locally to get a Google Tasks OAuth2 refresh token.
Usage:
  pip install google-auth-oauthlib
  python get_token.py
Then copy the printed refresh_token into GitHub secret GOOGLE_TASKS_REFRESH_TOKEN.
"""

from google_auth_oauthlib.flow import InstalledAppFlow

CLIENT_ID     = input("Client ID: ").strip()
CLIENT_SECRET = input("Client Secret: ").strip()

client_config = {
    "installed": {
        "client_id": CLIENT_ID,
        "client_secret": CLIENT_SECRET,
        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
        "token_uri": "https://oauth2.googleapis.com/token",
        "redirect_uris": ["urn:ietf:wg:oauth:2.0:oob", "http://localhost"],
    }
}

flow = InstalledAppFlow.from_client_config(
    client_config,
    scopes=["https://www.googleapis.com/auth/tasks"],
)
creds = flow.run_local_server(port=0, access_type="offline", prompt="consent")

print("\n✅ Refresh token:")
print(creds.refresh_token)
print("\nCopy the token above → GitHub secret: GOOGLE_TASKS_REFRESH_TOKEN")
