#!/usr/bin/env python3
"""
Google Calendar client using Service Account credentials.
Writes shift events for מאור פורמן.
"""

import os
import json
from datetime import datetime, timedelta
import pytz
from google.oauth2.service_account import Credentials
from googleapiclient.discovery import build

ISRAEL_TZ = pytz.timezone("Asia/Jerusalem")
SCOPES = ["https://www.googleapis.com/auth/calendar"]


def _get_calendar_service():
    raw = os.environ["GOOGLE_SERVICE_ACCOUNT_JSON"]
    info = json.loads(raw)
    creds = Credentials.from_service_account_info(info, scopes=SCOPES)
    return build("calendar", "v3", credentials=creds)


def _parse_datetime(date_str: str, time_str: str) -> datetime:
    """Parse DD/MM/YYYY or DD/MM + HH:MM into an aware datetime."""
    parts = date_str.split("/")
    if len(parts) == 2:
        day, month = parts
        year = str(datetime.now().year)
    else:
        day, month, year = parts
        if len(year) == 2:
            year = "20" + year

    dt = datetime.strptime(f"{day}/{month}/{year} {time_str}", "%d/%m/%Y %H:%M")
    return ISRAEL_TZ.localize(dt)


def create_shift_event(shift: dict) -> str:
    """Creates a Google Calendar event for one shift. Returns the event URL."""
    service = _get_calendar_service()

    start_dt = _parse_datetime(shift["date"], shift["start_time"])

    if shift["shift_type"] in ("לילה", "כפולה לילה"):
        end_dt = _parse_datetime(shift["date"], shift["end_time"]) + timedelta(days=1)
    else:
        end_dt = _parse_datetime(shift["date"], shift["end_time"])

    title = f"{shift['location']}, {shift['role']}, {shift['shift_type']}"

    event_body = {
        "summary": title,
        "start": {
            "dateTime": start_dt.isoformat(),
            "timeZone": "Asia/Jerusalem",
        },
        "end": {
            "dateTime": end_dt.isoformat(),
            "timeZone": "Asia/Jerusalem",
        },
        "reminders": {
            "useDefault": False,
            "overrides": [
                {"method": "popup", "minutes": 60},
            ],
        },
    }

    result = service.events().insert(calendarId="primary", body=event_body).execute()
    return result.get("htmlLink", "")


def create_all_shifts(shifts: list[dict]) -> list[str]:
    """Creates calendar events for all shifts. Returns list of event URLs."""
    links = []
    for shift in shifts:
        link = create_shift_event(shift)
        links.append(link)
    return links
