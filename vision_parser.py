#!/usr/bin/env python3
"""
Vision parser: sends schedule screenshot to OpenAI GPT-4o Vision,
extracts shifts for מאור פורמן.
"""

import os
import json
import base64
import re
from openai import OpenAI

client = OpenAI(api_key=os.environ["OPEN_API_KEY"])

SHIFT_TIMES = {
    "בוקר": ("07:00", "15:00"),
    "צהריים": ("15:00", "23:00"),
    "לילה": ("23:00", "07:00"),
    "כפולה בוקר": ("07:00", "19:00"),
    "כפולה לילה": ("15:00", "03:00"),
}

VISION_PROMPT = """אתה מנתח טבלת סידור עבודה. עיין בתמונה בזהירות.

משימה: מצא את השורות של "מאור פורמן" בטבלה.

לכל יום שבו מופיע "מאור פורמן", החזר את המידע הבא:

1. **תאריך** — קרא מכותרת העמודה/יום (פורמט DD/MM/YYYY או DD/MM)
2. **משמרת** — באיזו עמודה הוא מופיע: בוקר / צהריים / לילה
3. **12/12** — האם העמודה הסמוכה מכילה את הסימן "12/12" או "12\\12"?
   - אם הוא ב"בוקר" וב"צהריים" יש "12/12" → shift_type = "כפולה בוקר"
   - אם הוא ב"צהריים" וב"לילה" יש "12/12" → shift_type = "כפולה לילה"
   - אחרת → shift_type = שם העמודה (בוקר/צהריים/לילה)
4. **מיקום** — האם רקע שורת הכותרת של מאור פורמן ירוק?
   - ירוק → location = "הרצליה"
   - אחרת → location = 'רמ"ש'
5. **תפקיד** — קרא את הטקסט בכותרת השורה (למשל: מאבטח 1 אקדח, צלף, שיפוצים)

החזר JSON בלבד, ללא הסברים נוספים:
{
  "shifts": [
    {
      "date": "DD/MM/YYYY",
      "column": "בוקר|צהריים|לילה",
      "shift_type": "בוקר|צהריים|לילה|כפולה בוקר|כפולה לילה",
      "location": "הרצליה|רמ\"ש",
      "role": "שם התפקיד"
    }
  ]
}

אם מאור פורמן לא מופיע בכלל → החזר: {"shifts": []}
"""


def parse_schedule_image(image_bytes: bytes) -> list[dict]:
    b64 = base64.b64encode(image_bytes).decode("utf-8")
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": VISION_PROMPT},
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/jpeg;base64,{b64}",
                            "detail": "high",
                        },
                    },
                ],
            }
        ],
        max_tokens=1024,
        temperature=0.1,
    )

    raw = response.choices[0].message.content.strip()
    raw = re.sub(r"^```[a-z]*\n?", "", raw).rstrip("`").strip()
    data = json.loads(raw)
    shifts = data.get("shifts", [])

    for s in shifts:
        shift_type = s.get("shift_type", "")
        start, end = SHIFT_TIMES.get(shift_type, ("00:00", "00:00"))
        s["start_time"] = start
        s["end_time"] = end

    return shifts


def format_shifts_for_confirmation(shifts: list[dict]) -> str:
    if not shifts:
        return "לא נמצאו משמרות עבור מאור פורמן בתמונה זו."

    lines = ["זיהיתי את המשמרות הבאות:\n"]
    for s in shifts:
        end_note = ""
        if s["shift_type"] in ("לילה", "כפולה לילה"):
            end_note = " (+1 יום)"
        lines.append(
            f"📅 {s['date']} — {s['location']}, {s['role']}, {s['shift_type']} "
            f"({s['start_time']}–{s['end_time']}{end_note})"
        )

    lines.append("\nלאשר ולהכניס ליומן? לחץ ✅ לאישור או ❌ לביטול")
    return "\n".join(lines)
