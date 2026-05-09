/**
 * lib/email/weekly-summary-html.ts
 *
 * Generates the mobile-optimized HTML email for the weekly owner summary.
 *
 * Design system:
 *   Background  #FDFAF7  (cream white)
 *   Surface     #F5EFE6  (warm off-white)
 *   Primary     #6B4F3A  (brown)
 *   Dark        #2C1810  (near-black)
 *   Muted       #8B7355
 *   Border      #E8DDD4
 *
 * Layout (per owner):
 *   ┌── Header bar (dark brown, NADLAN logo + "סיכום שבועי") ──┐
 *   │  Greeting: "שלום [name],"                                  │
 *   │  ── Per-property block (repeats) ────────────────────────  │
 *   │  │  Property title + address                               │
 *   │  │  KPI table: Views · Right Swipes · New Leads           │
 *   │  │  Drop-off callout (if any stalled conversations)        │
 *   │  ──────────────────────────────────────────────────────── │
 *   │  Footer: unsubscribe blurb                                 │
 *   └────────────────────────────────────────────────────────────┘
 *
 * All CSS is inlined — no external stylesheets — for maximum email-client compat.
 * Hebrew `dir="rtl"` is set on the <html> tag and on every <td> that contains text.
 */

export interface PropertyEmailData {
  property_id: string
  title: string
  address: string
  /** All-time approved leads */
  total_approved: number
  /** This week's total swipes (right + left) */
  views_this_week: number
  /** This week's right swipes */
  right_swipes_this_week: number
  /** Top bot drop-off question (null if no stalled conversations) */
  top_drop_off: string | null
  /** How many conversations stalled at the top drop-off point */
  drop_off_count: number
}

export interface WeeklySummaryEmailParams {
  owner_name: string
  properties: PropertyEmailData[]
  week_ending: string // e.g. "09.05.2025"
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function kpiCell(emoji: string, label: string, value: number | string): string {
  return /* html */`
    <td width="33%" style="padding:14px 8px;text-align:center;border-right:1px solid #E8DDD4;">
      <div style="font-size:20px;">${emoji}</div>
      <div style="font-size:22px;font-weight:900;color:#2C1810;line-height:1.1;margin-top:4px;">
        ${typeof value === 'number' ? value.toLocaleString('he-IL') : value}
      </div>
      <div style="font-size:11px;color:#8B7355;margin-top:3px;">${label}</div>
    </td>`
}

function propertyBlock(prop: PropertyEmailData): string {
  const conversionRate = prop.views_this_week > 0
    ? `${Math.round((prop.right_swipes_this_week / prop.views_this_week) * 100)}%`
    : '0%'

  const dropOffSection = prop.top_drop_off
    ? /* html */`
      <tr>
        <td colspan="3" style="padding:0;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding:16px 20px;background:#FFF8F0;border-top:1px solid #E8DDD4;border-radius:0 0 14px 14px;" dir="rtl">
                <p style="margin:0 0 6px;font-size:12px;font-weight:700;color:#8B7355;">
                  💡 נקודת נטישה עיקרית בראיון הבוט
                </p>
                <p style="margin:0;font-size:13px;color:#2C1810;font-style:italic;line-height:1.6;">
                  &ldquo;${escapeHtml(prop.top_drop_off)}&rdquo;
                </p>
                <p style="margin:8px 0 0;font-size:12px;color:#A87D62;">
                  ${prop.drop_off_count} ${prop.drop_off_count === 1 ? 'שיחה' : 'שיחות'} נטשו בנקודה זו
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>`
    : ''

  return /* html */`
    <!-- Property block -->
    <table width="100%" cellpadding="0" cellspacing="0"
           style="margin-bottom:16px;border:1px solid #E8DDD4;border-radius:14px;background:#FDFAF7;overflow:hidden;">
      <!-- Property header -->
      <tr>
        <td colspan="3" dir="rtl"
            style="padding:16px 20px;border-bottom:1px solid #E8DDD4;background:#F5EFE6;">
          <p style="margin:0;font-size:15px;font-weight:700;color:#2C1810;">${escapeHtml(prop.title)}</p>
          <p style="margin:4px 0 0;font-size:12px;color:#8B7355;">${escapeHtml(prop.address)}</p>
        </td>
      </tr>
      <!-- KPI row -->
      <tr>
        ${kpiCell('👁', 'צפיות השבוע', prop.views_this_week)}
        ${kpiCell('👆', 'מעוניינים', prop.right_swipes_this_week)}
        ${kpiCell('✅', 'אושרו (סה״כ)', prop.total_approved)}
      </tr>
      <!-- Conversion hint -->
      <tr>
        <td colspan="3" dir="rtl"
            style="padding:8px 20px 14px;font-size:12px;color:#8B7355;border-top:1px solid #E8DDD4;">
          שיעור מעוניינים השבוע: <strong style="color:#6B4F3A;">${conversionRate}</strong>
        </td>
      </tr>
      ${dropOffSection}
    </table>`
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export function buildWeeklySummaryHtml(params: WeeklySummaryEmailParams): string {
  const { owner_name, properties, week_ending } = params

  const propertyBlocks = properties.map(propertyBlock).join('\n')

  const totalViews       = properties.reduce((s, p) => s + p.views_this_week, 0)
  const totalRightSwipes = properties.reduce((s, p) => s + p.right_swipes_this_week, 0)
  const totalApproved    = properties.reduce((s, p) => s + p.total_approved, 0)

  return /* html */`<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>סיכום שבועי — NADLAN</title>
  <!--[if mso]>
  <noscript>
    <xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml>
  </noscript>
  <![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#FDFAF7;font-family:Arial,Helvetica,sans-serif;-webkit-text-size-adjust:100%;">

<!-- Preheader (hidden, shows in email client previews) -->
<span style="display:none;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:#FDFAF7;">
  הנה סיכום הביצועים של הנכסים שלך לשבוע האחרון · ${totalViews} צפיות · ${totalRightSwipes} מעוניינים
</span>

<!-- Outer wrapper -->
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#FDFAF7;padding:24px 0;">
  <tr>
    <td align="center">

      <!-- Email card (max 560px) -->
      <table width="100%" cellpadding="0" cellspacing="0"
             style="max-width:560px;background:#F5EFE6;border-radius:20px;border:1px solid #E8DDD4;overflow:hidden;">

        <!-- ── Header ─────────────────────────────────────────── -->
        <tr>
          <td style="background:#6B4F3A;padding:28px 24px;text-align:center;border-radius:20px 20px 0 0;">
            <p style="margin:0;font-size:24px;font-weight:900;color:#FDFAF7;letter-spacing:-0.5px;">
              NADLAN
            </p>
            <p style="margin:6px 0 0;font-size:13px;color:rgba(253,250,247,0.75);">
              סיכום שבועי · שבוע שהסתיים ${week_ending}
            </p>
          </td>
        </tr>

        <!-- ── Greeting ────────────────────────────────────────── -->
        <tr>
          <td style="padding:28px 28px 20px;" dir="rtl">
            <p style="margin:0;font-size:17px;font-weight:700;color:#2C1810;">
              שלום ${escapeHtml(owner_name)}, 👋
            </p>
            <p style="margin:10px 0 0;font-size:14px;color:#8B7355;line-height:1.7;">
              הנה סיכום הביצועים של הנכסים שלך ב-NADLAN לשבוע האחרון.
              ${properties.length > 1
                ? `יש לך <strong style="color:#6B4F3A;">${properties.length} נכסים פעילים</strong>.`
                : ''}
            </p>
          </td>
        </tr>

        <!-- ── Aggregate banner (multi-property only) ──────────── -->
        ${properties.length > 1 ? /* html */`
        <tr>
          <td style="padding:0 28px 20px;">
            <table width="100%" cellpadding="0" cellspacing="0"
                   style="background:#6B4F3A;border-radius:14px;overflow:hidden;">
              <tr>
                ${kpiCell('👁', 'צפיות כוללות', totalViews).replace('border-right:1px solid #E8DDD4', 'border-right:1px solid rgba(253,250,247,0.2)').replace('color:#2C1810', 'color:#FDFAF7').replace('color:#8B7355', 'color:rgba(253,250,247,0.7)')}
                ${kpiCell('👆', 'מעוניינים', totalRightSwipes).replace('border-right:1px solid #E8DDD4', 'border-right:1px solid rgba(253,250,247,0.2)').replace('color:#2C1810', 'color:#FDFAF7').replace('color:#8B7355', 'color:rgba(253,250,247,0.7)')}
                ${kpiCell('✅', 'פניות מאושרות', totalApproved).replace('border-right:1px solid #E8DDD4', '').replace('color:#2C1810', 'color:#FDFAF7').replace('color:#8B7355', 'color:rgba(253,250,247,0.7)')}
              </tr>
            </table>
          </td>
        </tr>` : ''}

        <!-- ── Per-property blocks ─────────────────────────────── -->
        <tr>
          <td style="padding:0 28px 8px;">
            ${propertyBlocks}
          </td>
        </tr>

        <!-- ── Tips callout ────────────────────────────────────── -->
        <tr>
          <td style="padding:0 28px 24px;" dir="rtl">
            <table width="100%" cellpadding="0" cellspacing="0"
                   style="background:#FDFAF7;border:1px solid #E8DDD4;border-radius:14px;padding:16px 20px;">
              <tr>
                <td>
                  <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#6B4F3A;">
                    🚀 טיפ לשיפור ביצועים
                  </p>
                  <p style="margin:0;font-size:12px;color:#8B7355;line-height:1.7;">
                    שיעור ההמרה הממוצע בפלטפורמה הוא <strong style="color:#2C1810;">18%</strong>.
                    אם שיעור המעוניינים שלך נמוך מכך, שקול לעדכן את תמונות הנכס או לדייק את המחיר.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- ── CTA button ──────────────────────────────────────── -->
        <tr>
          <td style="padding:0 28px 32px;text-align:center;">
            <a href="${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('supabase.co', 'nadlan.co.il') ?? 'https://nadlan.co.il'}/owner/dashboard"
               style="display:inline-block;background:#6B4F3A;color:#FDFAF7;font-size:14px;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:40px;">
              צפה בלוח הבקרה המלא →
            </a>
          </td>
        </tr>

        <!-- ── Footer ──────────────────────────────────────────── -->
        <tr>
          <td style="padding:20px 28px;border-top:1px solid #E8DDD4;text-align:center;">
            <p style="margin:0;font-size:11px;color:#C4A882;line-height:1.7;">
              NADLAN &copy; ${new Date().getFullYear()} · פלטפורמת נדל&quot;ן ישראלית<br />
              קיבלת מייל זה מכיוון שאתה בעל נכס פעיל ב-NADLAN.
            </p>
          </td>
        </tr>

      </table>
      <!-- /email card -->

    </td>
  </tr>
</table>

</body>
</html>`
}

/**
 * buildWeeklySummarySubject — generates the email subject line.
 * Personalised with name + top-level metric for higher open rates.
 */
export function buildWeeklySummarySubject(ownerName: string, totalViews: number): string {
  const firstName = ownerName.split(' ')[0]
  return `📊 ${firstName}, הנה הסיכום השבועי שלך ב-NADLAN · ${totalViews.toLocaleString('he-IL')} צפיות`
}
