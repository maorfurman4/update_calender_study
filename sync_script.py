#!/usr/bin/env python3
import os
import json
import base64
import pytz
import re
import io
from datetime import datetime, timedelta
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
import requests

try:
    import PyPDF2
except ImportError:
    print("❌ PyPDF2 missing! Please add 'PyPDF2==3.0.1' to requirements.txt")

# =============================================================================
# ─── CONFIG & SECRETS ────────────────────────────────────────────────────────
# =============================================================================
ISRAEL_TZ = pytz.timezone("Asia/Jerusalem")
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")
LABEL_NAME = "Processed_By_Bot"

# סודות אקדמיה (ראשי)
TELEGRAM_TOKEN = os.environ.get("TELEGRAM_TOKEN", "")
CHAT_ID = os.environ.get("CHAT_ID", "")

# סודות קופונים
TELEGRAM_TOKEN_COUPONS = os.environ.get("TELEGRAM_TOKEN_COUPONS", "")
CHAT_ID_COUPONS = os.environ.get("CHAT_ID_COUPONS", "")

# סודות חשבונות וקבלות
TELEGRAM_TOKEN_RECEIPTS = os.environ.get("TELEGRAM_TOKEN_RECEIPTS", "")
CHAT_ID_RECEIPTS = os.environ.get("CHAT_ID_RECEIPTS", "")

# סודות משלוחים
TELEGRAM_TOKEN_DELIVERIES = os.environ.get("TELEGRAM_TOKEN_DELIVERIES", "")
CHAT_ID_DELIVERIES = os.environ.get("CHAT_ID_DELIVERIES", "")

LECTURER_MAP = {
    "רמי אלקיים": "מעבדת מכניקה", "גבריאל בן סימון": "מדר (הרצאה)", "בועז ויינר": "מדר (תרגול)",
    "בועז": "מדר (תרגול)", "יוני": "חדו\"א (הרצאה)", "אלינה ליס": "חדו\"א (תרגול)",
    "אלינה": "חדו\"א (תרגול)", "אפרת אבישי": "פיזיקה חשמל (הרצאה)", "אבישי": "פיזיקה חשמל (הרצאה)",
    "אילנה": "פיזיקה חשמל (תרגול)", "ד\"ר גבי שפט": "הנדסת חשמל א' (הרצאה + תרגול)",
    "גבי שפט": "הנדסת חשמל א' (הרצאה + תרגול)", "ערן לבינגר": "מערכות ספרתיות (הרצאה + תרגול)",
}

# =============================================================================
# ─── CORE FUNCTIONS (Google Auth, Extraction, Telegram) ──────────────────────
# =============================================================================
def get_google_services():
    raw = os.environ["GOOGLE_CREDENTIALS"]
    creds_data = json.loads(raw)
    SCOPES = [
        "https://www.googleapis.com/auth/gmail.modify",
        "https://www.googleapis.com/auth/calendar",
    ]
    creds = Credentials.from_authorized_user_info(creds_data, SCOPES)
    if creds.expired and creds.refresh_token:
        creds.refresh(Request())
    gmail = build("gmail", "v1", credentials=creds)
    calendar = build("calendar", "v3", credentials=creds)
    return gmail, calendar

def ensure_label_exists(gmail):
    results = gmail.users().labels().list(userId='me').execute()
    for label in results.get('labels', []):
        if label['name'] == LABEL_NAME:
            return label['id']
    
    label_body = {'name': LABEL_NAME, 'labelListVisibility': 'labelShow', 'messageListVisibility': 'show'}
    new_label = gmail.users().labels().create(userId='me', body=label_body).execute()
    return new_label['id']

def extract_body(gmail, msg_id, payload, snippet="") -> str:
    body_text = ""
    def safe_b64decode(data: str) -> str:
        if not data: return ""
        padding = 4 - (len(data) % 4)
        if padding != 4: data += "=" * padding
        try: return base64.urlsafe_b64decode(data).decode("utf-8", errors="ignore")
        except: return ""

    if "parts" in payload:
        for part in payload["parts"]:
            mime_type = part.get("mimeType", "")
            if mime_type == "text/plain":
                body_text += safe_b64decode(part.get("body", {}).get("data", ""))
            elif mime_type == "text/html":
                html_text = safe_b64decode(part.get("body", {}).get("data", ""))
                html_text = re.sub(r'<a\s+(?:[^>]*?\s+)?href=["\'](http[^"\']+)["\'][^>]*>(.*?)</a>', r'\2 (Link: \1)', html_text, flags=re.IGNORECASE)
                body_text += re.sub(r'<[^>]+>', ' ', html_text)
            elif mime_type == "application/pdf" or part.get("filename", "").lower().endswith(".pdf"):
                att_id = part.get("body", {}).get("attachmentId")
                if att_id:
                    try:
                        att = gmail.users().messages().attachments().get(userId="me", messageId=msg_id, id=att_id).execute()
                        pdf_data = io.BytesIO(base64.urlsafe_b64decode(att['data']))
                        reader = PyPDF2.PdfReader(pdf_data)
                        pdf_content = "".join([page.extract_text() for page in reader.pages if page.extract_text()])
                        body_text += f"\n--- PDF ATTACHMENT ({part.get('filename')}) ---\n{pdf_content}\n"
                    except Exception as e:
                        print(f"❌ PDF extraction error for {part.get('filename')}: {e}")
            elif "parts" in part:
                body_text += extract_body(gmail, msg_id, part)
    else:
        data = payload.get("body", {}).get("data", "")
        if data:
            raw = safe_b64decode(data)
            raw = re.sub(r'<a\s+(?:[^>]*?\s+)?href=["\'](http[^"\']+)["\'][^>]*>(.*?)</a>', r'\2 (Link: \1)', raw, flags=re.IGNORECASE)
            body_text += re.sub(r'<[^>]+>', ' ', raw)

    clean_text = body_text.strip()
    return clean_text if len(clean_text) > 10 else snippet

def mark_as_read(gmail, msg_id: str):
    """מסמן את המייל בתווית הסופית כדי שלא ייסרק שוב לעולם"""
    try:
        gmail.users().messages().modify(
            userId="me", id=msg_id, 
            body={"addLabelIds": [ensure_label_exists(gmail)], "removeLabelIds": ["UNREAD"]}
        ).execute()
    except Exception as e:
        print(f"⚠️ Error marking email {msg_id}: {e}")

# פונקציית השליחה האוניברסלית עם דיווח שגיאות
def send_telegram_universal(token, chat_id, text, reply_markup=None):
    if not token or not chat_id:
        print(f"⚠️ Telegram Warning: Missing Token or Chat ID.")
        return
    url = f"https://api.telegram.org/bot{token.strip()}/sendMessage"
    payload = {"chat_id": str(chat_id).strip(), "text": text, "parse_mode": "HTML"}
    if reply_markup:
        payload["reply_markup"] = reply_markup
    try:
        response = requests.post(url, json=payload, timeout=15)
        result = response.json()
        if not result.get("ok"):
            print(f"❌ Telegram Error: {result.get('description')} (Chat ID: {chat_id})")
        else:
            print(f"🚀 Telegram: Message sent successfully to {chat_id}")
    except Exception as e:
        print(f"❌ Telegram Connection Error: {e}")

# מעטפות לפונקציה האוניברסלית כדי לשמור על הקוד המקורי שלך
def send_telegram(text: str):
    send_telegram_universal(TELEGRAM_TOKEN, CHAT_ID, text)

def send_telegram_coupon(text: str):
    send_telegram_universal(TELEGRAM_TOKEN_COUPONS, CHAT_ID_COUPONS, text)

def send_telegram_receipt(text: str, reply_markup: dict = None):
    send_telegram_universal(TELEGRAM_TOKEN_RECEIPTS, CHAT_ID_RECEIPTS, text, reply_markup)

def send_telegram_delivery(text: str, reply_markup: dict = None):
    send_telegram_universal(TELEGRAM_TOKEN_DELIVERIES, CHAT_ID_DELIVERIES, text, reply_markup)

# =============================================================================
# ─── AGENT 1: ACADEMIC (לימודים ויומן) ───────────────────────────────────────
# =============================================================================
def fetch_teachingbox_emails(gmail) -> list[dict]:
    query = f'(label:TeachingBox OR "TeachingBox") -label:{LABEL_NAME}'
    print(f"🎓 DEBUG: Searching for Academic emails with query: {query}")
    result = gmail.users().messages().list(userId="me", q=query, maxResults=20).execute()
    messages = result.get("messages", [])
    print(f"🎓 DEBUG: Found {len(messages)} potential academic messages.")
    
    emails = []
    for msg in messages:
        full = gmail.users().messages().get(userId="me", id=msg["id"], format="full").execute()
        headers = {h["name"]: h["value"] for h in full["payload"]["headers"]}
        body_content = extract_body(gmail, msg["id"], full["payload"], full.get("snippet", ""))
        emails.append({
            "id": msg["id"], "subject": headers.get("Subject", ""),
            "from": headers.get("From", ""), "date": headers.get("Date", ""),
            "body": body_content,
        })
    return emails

def analyze_email_with_openai(email: dict) -> dict:
    lecturer_list = "\n".join(f"- {k} → {v}" for k, v in LECTURER_MAP.items())
    prompt = f"""אתה עוזר אקדמי. קרא את *תוכן המייל בלבד* (התעלם מהתאריך והשעה שבהם נשלח).
עליך לחלץ מידע מדויק:
1. action: "cancellation", "update", "delay", או "ignore".
2. is_permanent: האם קבוע? true או false.
3. lecturer: שם המרצה מהרשימה.
4. course: שם הקורס מהרשימה.
5. event_date: תאריך השיעור (YYYY-MM-DD). אם אין, null.
6. start_time/end_time: שעות (HH:MM). אם אין, null.
7. room: מספר חדר. אם אין, "לא צוין".
8. change_details: הסבר קצר.
רשימת מרצים:
{lecturer_list}
גוף המייל:
{email['body']}
החזר JSON בלבד במבנה המתאים."""
    url = "https://api.openai.com/v1/chat/completions"
    headers = {"Authorization": f"Bearer {OPENAI_API_KEY.strip()}", "Content-Type": "application/json"}
    payload = {"model": "gpt-4o-mini", "messages": [{"role": "system", "content": "JSON only."}, {"role": "user", "content": prompt}], "response_format": {"type": "json_object"}, "temperature": 0.1}
    response = requests.post(url, json=payload, headers=headers)
    return json.loads(response.json()['choices'][0]['message']['content'])

def find_calendar_event(calendar, course: str, event_dt: str) -> dict | None:
    if not event_dt: return None
    try: dt = datetime.fromisoformat(event_dt).astimezone(ISRAEL_TZ)
    except: return None
    time_min = (dt - timedelta(hours=2)).isoformat()
    time_max = (dt + timedelta(hours=2)).isoformat()
    events = calendar.events().list(calendarId="primary", timeMin=time_min, timeMax=time_max, q=course, singleEvents=True).execute().get("items", [])
    return events[0] if events else None

def delete_event(calendar, event_id: str):
    calendar.events().delete(calendarId="primary", eventId=event_id).execute()

def update_event(calendar, event: dict, change_details: str, room: str, is_permanent: bool):
    event["description"] = event.get("description", "") + f"\n\n📝 עדכון בוט: {change_details}"
    if room and room != "לא צוין": event["location"] = room
    try:
        if is_permanent and "recurringEventId" in event:
            master_id = event["recurringEventId"]
            master_event = calendar.events().get(calendarId="primary", eventId=master_id).execute()
            if room and room != "לא צוין": master_event["location"] = room
            master_event["description"] = event["description"]
            calendar.events().update(calendarId="primary", eventId=master_id, body=master_event).execute()
        else:
            calendar.events().update(calendarId="primary", eventId=event["id"], body=event).execute()
    except Exception as e: print(f"❌ Error updating calendar: {e}")

def add_event(calendar, course: str, event_dt: str, change_details: str, room: str):
    if not event_dt: return
    try: dt = datetime.fromisoformat(event_dt).astimezone(ISRAEL_TZ)
    except: return
    end_dt = dt + timedelta(hours=2)
    event = {
        "summary": f"📚 {course}", "description": f"📝 {change_details}",
        "start": {"dateTime": dt.isoformat(), "timeZone": "Asia/Jerusalem"},
        "end": {"dateTime": end_dt.isoformat(), "timeZone": "Asia/Jerusalem"},
    }
    if room and room != "לא צוין": event["location"] = room
    calendar.events().insert(calendarId="primary", body=event).execute()

def format_date(iso: str | None) -> str:
    if not iso: return "לא צוין"
    try: return datetime.fromisoformat(iso).astimezone(ISRAEL_TZ).strftime("%d/%m/%Y")
    except: return iso

def process_emails(gmail, calendar) -> list:
    print("🚀 Starting Academic Sync Process...")
    emails = fetch_teachingbox_emails(gmail)
    processed_ids = []
    if not emails: return processed_ids
    
    for email in emails:
        print(f"📧 Processing Academic: {email['subject']}")
        try: analysis = analyze_email_with_openai(email)
        except Exception: continue

        action = analysis.get("action", "ignore")
        if action == "ignore":
            processed_ids.append(email["id"])
            continue

        course = analysis.get("course", "קורס לא ידוע")
        lecturer = analysis.get("lecturer", "")
        event_date = analysis.get("event_date")
        start_time = analysis.get("start_time")
        end_time = analysis.get("end_time", "")
        room = analysis.get("room", "לא צוין")
        is_permanent = analysis.get("is_permanent", False)
        details = analysis.get("change_details", "")

        event_dt = f"{event_date}T{start_time}:00+03:00" if event_date and start_time else None
        is_perm_text = "🔄 <b>שינוי קבוע במערכת!</b>" if is_permanent else "📅 <b>שינוי חד פעמי</b>"

        if action == "cancellation":
            event = find_calendar_event(calendar, course, event_dt)
            if event: delete_event(calendar, event["id"])
            send_telegram(f"⚠️ <b>בוטל שיעור:</b> {course}\n👨‍🏫 <b>מרצה:</b> {lecturer}\n📅 <b>תאריך:</b> {format_date(event_dt)}\n🗑️ הוסר מהיומן.")
        elif action == "update":
            event = find_calendar_event(calendar, course, event_dt)
            if event: update_event(calendar, event, details, room, is_permanent)
            else: add_event(calendar, course, event_dt, details, room)
            send_telegram(f"✅ <b>עדכון במערכת:</b> {course}\n{is_perm_text}\n👨‍🏫 <b>מרצה:</b> {lecturer}\n📅 <b>תאריך:</b> {event_date or 'לא צוין'}\n⏰ <b>שעות:</b> {start_time or '?'} - {end_time or '?'}\n🚪 <b>חדר:</b> {room}\n📝 <b>פרטים:</b> {details}")
        elif action == "delay":
            send_telegram(f"⏳ <b>הודעת עיכוב:</b> {course}\n👨‍🏫 <b>המרצה:</b> {lecturer} מתעכב.\n📅 <b>תאריך:</b> {format_date(event_dt)}\n🚪 <b>חדר:</b> {room}\n📝 <b>פרטים:</b> {details}")
        
        processed_ids.append(email["id"])
    return processed_ids


# =============================================================================
# ─── AGENT 2: COUPONS (10Bis & Carrefour) ────────────────────────────────────
# =============================================================================
def fetch_coupon_emails(gmail) -> list[dict]:
    # הוספנו את המילה "קרפור" לחיפוש הכללי כדי שלא יפספס כלום
    query = f'(label:"קופוננים קארפור" OR "קרפור" OR from:carrefour.co.il OR from:10bis.co.il OR "תן ביס") -label:{LABEL_NAME}'
    result = gmail.users().messages().list(userId="me", q=query, maxResults=50).execute()
    messages = result.get("messages", [])
    emails = []
    for msg in messages:
        full = gmail.users().messages().get(userId="me", id=msg["id"], format="full").execute()
        headers = {h["name"]: h["value"] for h in full["payload"]["headers"]}
        body_content = extract_body(gmail, msg["id"], full["payload"], full.get("snippet", ""))
        emails.append({"id": msg["id"], "subject": headers.get("Subject", ""), "body": body_content})
    return emails

def analyze_coupon_with_openai(email_body: str) -> dict:
    prompt = f"""חלץ מידע לקופון או שובר. החזר JSON בלבד.
אם גילית שאין קוד קופון במייל (למשל מדובר בקבלה רגילה על הזמנת אוכל או פרסומת), החזר is_coupon: false.
1. is_coupon: true או false.
2. store: שם הרשת (למשל "Carrefour", "10bis", "תן ביס").
3. code: קוד כרטיס או שובר.
4. amount: סכום (מספר בלבד).
5. date: תאריך קבלה (DD/MM/YYYY).
טקסט המייל:
{email_body}
{{ "is_coupon": true, "store": "string", "code": "string", "amount": "string", "date": "string" }}"""
    url = "https://api.openai.com/v1/chat/completions"
    headers = {"Authorization": f"Bearer {OPENAI_API_KEY.strip()}", "Content-Type": "application/json"}
    payload = {"model": "gpt-4o-mini", "messages": [{"role": "user", "content": prompt}], "response_format": {"type": "json_object"}, "temperature": 0.1}
    response = requests.post(url, json=payload, headers=headers)
    return json.loads(response.json()['choices'][0]['message']['content'])

def process_coupons(gmail) -> list:
    print("🛒 Starting Coupons Sync...")
    emails = fetch_coupon_emails(gmail)
    processed_ids = []
    if not emails: return processed_ids
    
    for email in emails:
        print(f"📧 Processing Coupon: {email['subject']}")
        try:
            analysis = analyze_coupon_with_openai(email['body'])
            
            # בדיקה חכמה האם זה באמת קופון לפני ששולחים לטלגרם
            if not analysis.get("is_coupon", True) or analysis.get("code") in [None, "", "?", "לא נמצא"]:
                print(f"⚠️ Not a real coupon (Skipping Telegram): {email['subject']}")
                processed_ids.append(email["id"])
                continue

            msg = (f"🎟️ <b>קופון חדש!</b>\n\n🏪 <b>רשת:</b> {analysis.get('store', '?')}\n"
                   f"💰 <b>סכום:</b> ₪{analysis.get('amount', '0')}\n📅 <b>תאריך:</b> {analysis.get('date', '?')}\n"
                   f"🔑 <b>קוד:</b> <code>{analysis.get('code', '?')}</code>\n\n<i>* לחץ על הקוד כדי להעתיק</i>")
            send_telegram_coupon(msg)
            processed_ids.append(email["id"])
        except Exception as e: print(f"❌ Error processing coupon: {e}")
    return processed_ids

# =============================================================================
# ─── AGENT 3: HOME UTILITIES & RECEIPTS (חשבונות וקבלות) ─────────────────────
# =============================================================================
def fetch_utility_emails(gmail) -> list[dict]:
    query = f'(subject:("חשבון" OR "קבלה" OR "חשבונית" OR "invoice" OR "receipt") OR "אמישראגז" OR "לתשלום מהיר") -label:{LABEL_NAME}'
    print(f"🏠 DEBUG: Searching for Bills/Receipts with query: {query}")
    result = gmail.users().messages().list(userId="me", q=query, maxResults=20).execute()
    messages = result.get("messages", [])
    emails = []
    for msg in messages:
        full = gmail.users().messages().get(userId="me", id=msg["id"], format="full").execute()
        headers = {h["name"]: h["value"] for h in full["payload"]["headers"]}
        body_content = extract_body(gmail, msg["id"], full["payload"], full.get("snippet", ""))
        emails.append({"id": msg["id"], "subject": headers.get("Subject", ""), "body": body_content})
    return emails

def analyze_utility_bill_with_openai(email_body: str) -> dict:
    prompt = f"""אתה מנתח חשבונות וקבלות. קרא בעיון את הטקסט (כולל טקסט מחולץ מ-PDF).
חלץ את המידע בפורמט JSON בלבד. חובה להחזיר ערכים תקינים ולא null (אם חסר, רשום "לא צוין"):
{{
  "merchant": "שם החברה/ספק",
  "amount": "סכום לתשלום (רק המספר)",
  "currency": "₪/$/€",
  "billing_period": "תקופת החשבון או תאריך",
  "payment_link": "קישור URL לתשלום אם קיים. אם לא, רשום 'לא נמצא'",
  "is_paid": true/false (true אם מדובר בקבלה על תשלום שכבר בוצע)
}}
טקסט המייל:
{email_body}"""
    url = "https://api.openai.com/v1/chat/completions"
    headers = {"Authorization": f"Bearer {OPENAI_API_KEY.strip()}", "Content-Type": "application/json"}
    payload = {"model": "gpt-4o-mini", "messages": [{"role": "user", "content": prompt}], "response_format": {"type": "json_object"}, "temperature": 0.1}
    response = requests.post(url, json=payload, headers=headers)
    return json.loads(response.json()['choices'][0]['message']['content'])

def process_utility_bills(gmail) -> list:
    print("🏠 Processing Home Utility Bills & Receipts...")
    emails = fetch_utility_emails(gmail)
    processed_ids = []
    if not emails:
        print("📭 No new utility/receipt emails found.")
        return processed_ids
        
    for email in emails:
        print(f"📧 Processing Receipt/Bill: {email['subject']}")
        try:
            analysis = analyze_utility_bill_with_openai(email['body'])
            merchant = analysis.get("merchant", "לא צוין")
            amount = analysis.get("amount", "לא ידוע")
            currency = analysis.get("currency", "₪")
            period = analysis.get("billing_period", "לא צוין")
            payment_link = analysis.get("payment_link")
            is_paid = analysis.get("is_paid", False)

            icon = "✅" if is_paid else "💳"
            status_text = "<b>שולם בהצלחה</b>" if is_paid else "<b>ממתין לתשלום!</b>"

            msg = (
                f"{icon} <b>עדכון חשבונות וקבלות</b>\n\n"
                f"🏪 <b>ספק:</b> {merchant}\n"
                f"💰 <b>סכום:</b> {amount} {currency}\n"
                f"📊 <b>סטטוס:</b> {status_text}\n"
                f"📅 <b>תקופה/תאריך:</b> {period}\n"
            )

            buttons = []
            if payment_link and str(payment_link).startswith("http") and not is_paid:
                buttons.append([{"text": "💳 לתשלום מהיר (לחץ כאן)", "url": payment_link}])
            
            gmail_direct_link = f"https://mail.google.com/mail/u/0/#inbox/{email['id']}"
            buttons.append([{"text": "📧 פתח את המייל המקורי", "url": gmail_direct_link}])

            send_telegram_receipt(msg, {"inline_keyboard": buttons})
            processed_ids.append(email["id"])
            print(f"✅ Receipt from {merchant} processed.")
        except Exception as e:
            print(f"❌ Error processing receipt: {e}")
            
    return processed_ids


# =============================================================================
# ─── AGENT 4: DELIVERIES & TRACKING (משלוחים ומעקב חבילות) ───────────────────
# =============================================================================
def fetch_delivery_emails(gmail) -> list[dict]:
    keywords = (
        'subject:("order confirmed" OR "shipped" OR "tracking" OR "out for delivery" OR "delivered" '
        'OR "משלוח" OR "הזמנה" OR "נשלחה" OR "מספר מעקב" OR "הגיעה") '
        'OR from:(amazon OR aliexpress OR shein OR temo OR iherb OR myprotein)'
    )
    # הוספנו חסימה מפורשת לקרפור ותן-ביס כדי שלא יכנסו לפה
    query = f'({keywords}) -subject:"פרסומת" -subject:"מבצע" -from:carrefour -from:10bis -label:{LABEL_NAME}'
    print(f"📦 DEBUG: Searching for delivery updates with query: {query}")
    result = gmail.users().messages().list(userId="me", q=query, maxResults=30).execute()
    messages = result.get("messages", [])
    
    emails = []
    for msg in messages:
        full = gmail.users().messages().get(userId="me", id=msg["id"], format="full").execute()
        headers = {h["name"]: h["value"] for h in full["payload"]["headers"]}
        body_content = extract_body(gmail, msg["id"], full["payload"], full.get("snippet", ""))
        emails.append({"id": msg["id"], "subject": headers.get("Subject", ""), "body": body_content})
    return emails

def analyze_delivery_with_openai(email_body: str) -> dict:
    prompt = f"""נתח את אימייל המשלוח הבא. חלץ מידע מדויק בפורמט JSON בלבד.
חובה לתרגם סטטוס ושם חברה לעברית.
{{
  "merchant": "מאיפה ההזמנה (למשל: אמזון, עלי אקספרס)",
  "order_date": "תאריך הרכישה (אם מופיע, אחרת 'לא צוין')",
  "tracking_number": "מספר המעקב (Tracking Number) בלבד",
  "status_type": "סיווג: confirmed / shipped / out_for_delivery / delivered",
  "status_details": "תיאור קצר של הסטטוס בעברית",
  "tracking_url": "קישור ישיר למעקב אם נמצא. אם אין, צור: https://www.17track.net/en/track?nums=[NUMBER]"
}}
טקסט:
{email_body[:4000]}"""
    url = "https://api.openai.com/v1/chat/completions"
    headers = {"Authorization": f"Bearer {OPENAI_API_KEY.strip()}", "Content-Type": "application/json"}
    payload = {"model": "gpt-4o-mini", "messages": [{"role": "system", "content": "JSON only."}, {"role": "user", "content": prompt}], "response_format": {"type": "json_object"}, "temperature": 0}
    response = requests.post(url, json=payload, headers=headers)
    return json.loads(response.json()['choices'][0]['message']['content'])

def process_deliveries(gmail) -> list:
    print("📦 Starting Delivery Sync Process...")
    emails = fetch_delivery_emails(gmail)
    processed_ids = []
    if not emails:
        print("📭 No new delivery updates.")
        return processed_ids

    for email in emails:
        print(f"📧 Processing Delivery: {email['subject']}")
        try:
            res = analyze_delivery_with_openai(email['body'])
            icons = {"confirmed": "🛍️", "shipped": "✈️", "out_for_delivery": "🚚", "delivered": "🎁"}
            icon = icons.get(res.get('status_type', ''), "📦")
            
            msg = (
                f"{icon} <b>עדכון משלוח: {res.get('merchant', 'לא ידוע')}</b>\n\n"
                f"📅 <b>תאריך קנייה:</b> {res.get('order_date', 'לא צוין')}\n"
                f"🔢 <b>מספר מעקב:</b> <code>{res.get('tracking_number', 'לא נמצא')}</code>\n"
                f"📍 <b>סטטוס:</b> {res.get('status_details', 'אין פירוט')}\n"
            )

            buttons = []
            # התיקון: בודקים שהקישור באמת מתחיל ב-http לפני שמייצרים כפתור
            tracking_url = str(res.get('tracking_url', ''))
            if tracking_url.startswith("http"):
                track_url = tracking_url.replace("[NUMBER]", str(res.get('tracking_number', '')))
                buttons.append([{"text": "🔗 עקוב אחר החבילה", "url": track_url}])
            
            gmail_link = f"https://mail.google.com/mail/u/0/#inbox/{email['id']}"
            buttons.append([{"text": "📧 פתח מייל מקורי", "url": gmail_link}])
            
            send_telegram_delivery(msg, {"inline_keyboard": buttons})
            processed_ids.append(email["id"])
            print(f"✅ Delivery update for {res.get('merchant')} sent.")
        except Exception as e:
            print(f"❌ Error in Delivery Agent: {e}")
            
    return processed_ids
# =============================================================================
# ─── AGENT 5: SMART MAINTENANCE & TRASH (סוכן התחזוקה החכם) ──────────────────
# =============================================================================
def fetch_potential_trash(gmail) -> list[dict]:
    # מחפש בספאם, בקידומי מכירות, ומיילים כלליים של פרסומות
    query = 'in:anywhere (label:spam OR category:promotions OR "פרסומת" OR "מבצע") -label:{LABEL_NAME}'
    print(f"🧹 DEBUG: Searching for potential trash with query: {query}")
    
    result = gmail.users().messages().list(userId="me", q=query, maxResults=50).execute()
    messages = result.get("messages", [])
    
    emails = []
    for msg in messages:
        full = gmail.users().messages().get(userId="me", id=msg["id"], format="minimal").execute()
        headers = {h["name"]: h["value"] for h in full["payload"]["headers"]}
        emails.append({
            "id": msg["id"], 
            "subject": headers.get("Subject", "ללא נושא"),
            "from": headers.get("From", ""),
            "snippet": full.get("snippet", "")
        })
    return emails

def analyze_trash_priority(email: dict) -> str:
    # רשימת הלבנה - שולחים שלעולם לא נמחוק
    whitelist = ["amazon", "10bis", "carrefour", "teachingbox", "bank", "moodle"]
    sender_lower = email['from'].lower()
    
    if any(word in sender_lower for word in whitelist):
        return "keep" # חסינות אוטומטית

    prompt = f"""אתה מנהל ניקיון לתיבת מייל. עליך להחליט אם המייל הבא הוא "זבל שיווקי" שצריך למחוק, או מייל שחשוב לשמור.
    כלל אצבע: 
    - מחק (delete): ניוזלטרים, מבצעים, עדכוני שיווק.
    - שמור (keep): קבלות, הזמנות, הודעות בנק, אקדמיה, אישי.

    פרטי המייל:
    שולח: {email['from']}
    נושא: {email['subject']}
    תקציר: {email['snippet']}

    החזר תשובה במילה אחת בלבד: 'delete' או 'keep'."""

    try:
        url = "https://api.openai.com/v1/chat/completions"
        headers = {"Authorization": f"Bearer {OPENAI_API_KEY.strip()}", "Content-Type": "application/json"}
        payload = {
            "model": "gpt-4o-mini",
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0
        }
        response = requests.post(url, json=payload, headers=headers)
        return response.json()['choices'][0]['message']['content'].strip().lower()
    except:
        return "keep"

def process_maintenance(gmail) -> list:
    print("🧹 Starting Smart Maintenance Agent...")
    emails = fetch_potential_trash(gmail)
    processed_ids = []
    
    for email in emails:
        decision = analyze_trash_priority(email)
        
        if decision == "delete":
            print(f"🗑️ Deleting redundant email: {email['subject']}")
            gmail.users().messages().trash(userId="me", id=email["id"]).execute()
            processed_ids.append(email["id"])
        else:
            print(f"💎 Keeping potentially useful email: {email['subject']}")
            processed_ids.append(email["id"])
            
    return processed_ids
# =============================================================================
# ─── MAIN EXECUTION (מנוע ההרצה הראשי) ───────────────────────────────────────
# =============================================================================
if __name__ == "__main__":
    try:
        gmail_service, calendar_service = get_google_services()
        ensure_label_exists(gmail_service)
        
        print("--- Agentic Orchestrator v2: Starting Run ---")
        
        all_processed = []
        
        # 1. קודם כל מנקים את הזבל מהתיבה
        all_processed.extend(process_maintenance(gmail_service))
        
        # 2. אחר כך מפעילים את שאר הסוכנים
        all_processed.extend(process_coupons(gmail_service))
        all_processed.extend(process_utility_bills(gmail_service))
        all_processed.extend(process_deliveries(gmail_service))
        all_processed.extend(process_emails(gmail_service, calendar_service))
        
        # 3. חתימה סופית
        unique_processed_ids = set(all_processed)
        for msg_id in unique_processed_ids:
            mark_as_read(gmail_service, msg_id)
            
        print(f"🏁 Finished. Cleaned and processed {len(unique_processed_ids)} emails.")
        
    except Exception as e:
        print(f"❌ Fatal error: {e}")
