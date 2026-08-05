import { CoupleCredentials, FirstContactMailPayload } from '../types';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function buildFirstContactBitTemplate(input: {
  brideName: string;
  groomName: string;
  amountNis: number;
  bitPhone: string;
}): FirstContactMailPayload {
  const coupleTitle = `${input.brideName} ו${input.groomName}`;
  const subject = `💍 החשבון שלכם כמעט מוכן | ${coupleTitle}`;

  const text =
    `שלום ${coupleTitle},\n\n` +
    'מזל טוב! 🎉\n\n' +
    'תודה שבחרתם ב-WedFlow ללוות אתכם בדרך לאחד הימים המרגשים בחייכם.\n\n' +
    `נותר רק שלב אחד קטן כדי להפעיל את החשבון שלכם - תשלום בסך ${input.amountNis} ₪ באמצעות BIT למספר ${input.bitPhone}.\n\n` +
    'מיד לאחר קבלת התשלום נפתח עבורכם את החשבון ונשלח אליכם את פרטי הכניסה כדי שתוכלו להתחיל לנהל את החתונה שלכם.\n\n' +
    'מחכים להתחיל את המסע איתכם,\nצוות WedFlow';

  const html = `
    <div dir="rtl" style="margin:0;padding:0;background:#F7F3EC;font-family:'Frank Ruhl Libre',Georgia,serif;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F7F3EC;padding:32px 16px;">
        <tr>
          <td align="center">

            <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
              style="max-width:560px;background:#fff;border-radius:18px;overflow:hidden;border:1px solid rgba(201,168,76,.3);box-shadow:0 8px 28px rgba(0,0,0,.06);">

              <!-- HEADER -->
              <tr>
                <td align="center"
                  style="background:linear-gradient(135deg,#C9A84C 0%,#B8944A 100%);padding:42px 24px;">

                  <img
                    src="https://weddingsandd.onrender.com/WedFlowIcon.svg"
                    alt="WedFlow"
                    width="74"
                    height="74"
                    style="display:block;border-radius:50%;"
                  />

                  <div
                    style="display:inline-block;margin-top:20px;padding:7px 16px;border-radius:999px;background:rgba(255,255,255,.18);color:#fff;font-size:13px;font-weight:bold;letter-spacing:.4px;">
                    ✨ החשבון שלכם כמעט מוכן
                  </div>

                  <div
                    style="
                      margin-top:22px;
                      display:inline-block;
                      background:rgba(255,255,255,.18);
                      backdrop-filter:blur(6px);
                      padding:16px 28px;
                      border-radius:16px;
                      border:1px solid rgba(255,255,255,.25);
                      box-shadow:0 8px 24px rgba(0,0,0,.08);
                    "
                  >
                    <div
                      style="
                        font-size:30px;
                        font-weight:700;
                        color:#ffffff;
                        margin-bottom:4px;
                        letter-spacing:.5px;
                      "
                    >
                      WedFlow
                    </div>

                    <div
                      style="
                        font-size:15px;
                        color:rgba(255,255,255,.95);
                        font-weight:500;
                      "
                    >
                      ניהול החתונה מקצה לקצה
                    </div>
                  </div>

                </td>
              </tr>

              <!-- BODY -->
              <tr>
                <td style="padding:38px 34px 10px;">

                  <p style="margin:0;color:#816A52;font-size:15px;">
                    מזל טוב! 🎉
                  </p>

                  <h1 style="margin:8px 0 24px;font-size:25px;line-height:1.5;color:#2A2A2A;">
                    שלום ${escapeHtml(coupleTitle)},
                  </h1>

                  <p style="margin:0 0 18px;font-size:16px;line-height:2;color:#4A4A4A;">
                    תודה שבחרתם ב-
                    <strong style="color:#B8944A;">WedFlow</strong>
                    ללוות אתכם בדרך לאחד הימים המרגשים בחייכם.
                    אנחנו מתרגשים להצטרף אליכם ולהפוך את כל ארגון החתונה
                    לפשוט, נעים ומסודר יותר.
                  </p>

                  <p style="margin:0 0 24px;font-size:16px;line-height:2;color:#4A4A4A;">
                    לאחר הפעלת החשבון תוכלו ליהנות ממערכת מלאה הכוללת
                    ניהול מוזמנים, אישורי הגעה, סידורי הושבה,
                    הזמנות דיגיטליות, גלריית תמונות משותפת ועוד.
                  </p>

                  <div style="background:#FFF9EF;border-radius:12px;padding:18px 20px;border-right:4px solid #C9A84C;">
                    <strong style="color:#B8944A;font-size:16px;">
                      🎉 החשבון שלכם כבר נוצר
                    </strong>

                    <p style="margin:10px 0 0;font-size:15px;line-height:1.8;color:#555;">
                      נותר רק שלב קטן אחד כדי להפעיל אותו ולהתחיל לתכנן את החתונה שלכם.
                    </p>
                  </div>

                </td>
              </tr>

              <!-- PAYMENT -->
              <tr>
                <td style="padding:28px 34px;">

                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                    style="background:#FFFDF9;border:1px solid rgba(201,168,76,.3);border-radius:14px;">

                    <tr>
                      <td align="center" style="padding:28px;">

                        <p style="margin:0;font-size:15px;color:#816A52;">
                          💳 סכום לתשלום
                        </p>

                        <p style="margin:14px 0 18px;font-size:36px;font-weight:700;color:#2A2A2A;">
                          ${input.amountNis} ₪
                        </p>

                        <div style="height:1px;background:rgba(201,168,76,.25);margin:18px 0;"></div>

                        <p style="margin:0 0 10px;font-size:14px;color:#816A52;">
                          תשלום באמצעות BIT
                        </p>

                        <div
                          style="display:inline-block;padding:12px 22px;background:#fff;border:1px solid rgba(201,168,76,.3);border-radius:999px;">

                          <span style="font-size:22px;font-weight:700;color:#B8944A;direction:ltr;letter-spacing:1px;">
                            ${escapeHtml(input.bitPhone)}
                          </span>

                        </div>

                        <p style="margin:20px 0 0;font-size:13px;line-height:1.8;color:#777;">
                          לאחר ביצוע התשלום נפתח עבורכם את החשבון
                          ונשלח אליכם את פרטי הכניסה במייל.
                        </p>

                      </td>
                    </tr>

                  </table>

                </td>
              </tr>

              <!-- NEXT STEPS -->
              <tr>
                <td style="padding:0 34px 34px;">

                  <div style="background:#FAFAFA;border-radius:12px;padding:22px;">

                    <p style="margin:0 0 16px;font-size:17px;font-weight:700;color:#2A2A2A;">
                      מה יקרה לאחר התשלום?
                    </p>

                    <p style="margin:8px 0;color:#4A4A4A;">✅ הפעלת החשבון שלכם</p>
                    <p style="margin:8px 0;color:#4A4A4A;">✅ פתיחת סביבת החתונה האישית</p>
                    <p style="margin:8px 0;color:#4A4A4A;">✅ שליחת פרטי הכניסה למייל</p>
                    <p style="margin:8px 0;color:#4A4A4A;">✅ אפשר להתחיל לתכנן מיד 🎉</p>

                  </div>

                </td>
              </tr>

              <!-- DIVIDER -->
              <tr>
                <td style="padding:0 34px;">
                  <div style="height:1px;background:rgba(201,168,76,.25);"></div>
                </td>
              </tr>

              <!-- FOOTER -->
              <tr>
                <td align="center" style="padding:28px 34px 34px;">

                  <p style="margin:0 0 8px;font-size:16px;color:#4A4A4A;">
                    תודה על האמון בנו 💛
                  </p>

                  <p style="margin:0 0 18px;font-size:14px;line-height:1.8;color:#777;">
                    מאחלים לכם תקופת אירוסין מרגשת והמון רגעים יפים בדרך.
                  </p>

                  <p style="margin:0;font-size:15px;font-weight:700;color:#B8944A;">
                    צוות WedFlow
                  </p>

                </td>
              </tr>

            </table>

            <p style="margin:20px 0 0;font-size:11px;color:#A89A86;text-align:center;">
              קיבלתם מייל זה מכיוון שנרשמתם למערכת WedFlow.
            </p>

          </td>
        </tr>
      </table>
    </div>
  `;

  return {
    to: '',
    subject,
    html,
    text,
  };
}

export function buildAdminNewWeddingRequestTemplate(input: {
  brideName: string;
  groomName: string;
  weddingDate: string;
  email: string;
  phone?: string | null;
}): FirstContactMailPayload {
  const coupleTitle = `${input.brideName} ו${input.groomName}`;
  const subject = `🔔 הרשמה חדשה - ${coupleTitle}`;

  const text =
    `התקבלה בקשת הרשמה חדשה למערכת.\n\n` +
    `כלה: ${input.brideName}\n` +
    `חתן: ${input.groomName}\n` +
    `תאריך חתונה: ${input.weddingDate}\n` +
    `טלפון: ${input.phone ?? '-'}\n` +
    `אימייל: ${input.email}\n\n` +
    `יש להיכנס לפאנל הניהול לצורך המשך הטיפול.`;

  const html = `
<div dir="rtl" style="margin:0;padding:0;background:#F6F4EF;font-family:Arial,sans-serif;">

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
<tr>
<td align="center">

<table role="presentation" width="100%" cellpadding="0" cellspacing="0"
style="
max-width:620px;
background:#ffffff;
border-radius:18px;
overflow:hidden;
border:1px solid rgba(201,168,76,.25);
box-shadow:0 8px 28px rgba(0,0,0,.06);
">

<!-- HEADER -->
<tr>
<td
align="center"
style="
background:linear-gradient(135deg,#C9A84C,#B8944A);
padding:38px;
">

<img
src="https://weddingsandd.onrender.com/WedFlowIcon.svg"
alt="WedFlow"
width="74"
height="74"
style="display:block;border-radius:50%;"
/>

<div
style="
margin-top:22px;
display:inline-block;
padding:16px 28px;
background:rgba(255,255,255,.18);
border-radius:14px;
border:1px solid rgba(255,255,255,.25);
">

<div
style="
font-size:28px;
font-weight:bold;
color:#fff;
">
WedFlow
</div>

<div
style="
margin-top:4px;
color:#fff;
font-size:15px;
">
התקבלה הרשמה חדשה
</div>

</div>

</td>
</tr>

<!-- BODY -->
<tr>
<td style="padding:36px;">

<h2
style="
margin:0 0 12px;
font-size:24px;
color:#2A2A2A;
">
🎉 התקבלה בקשת הרשמה חדשה
</h2>

<p
style="
margin:0 0 28px;
font-size:15px;
line-height:1.8;
color:#555;
">
זוג חדש נרשם למערכת וממתין לפתיחת החתונה.
להלן כל הפרטים:
</p>

<table
width="100%"
cellpadding="0"
cellspacing="0"
style="
background:#FFFDF8;
border:1px solid rgba(201,168,76,.3);
border-radius:14px;
overflow:hidden;
">

<tr>
<td style="padding:18px 24px;border-bottom:1px solid #EEE;">
👰 <strong>שם הכלה</strong>
</td>

<td align="left" style="padding:18px 24px;border-bottom:1px solid #EEE;">
${escapeHtml(input.brideName)}
</td>
</tr>

<tr>
<td style="padding:18px 24px;border-bottom:1px solid #EEE;">
🤵 <strong>שם החתן</strong>
</td>

<td align="left" style="padding:18px 24px;border-bottom:1px solid #EEE;">
${escapeHtml(input.groomName)}
</td>
</tr>

<tr>
<td style="padding:18px 24px;border-bottom:1px solid #EEE;">
📅 <strong>תאריך החתונה</strong>
</td>

<td align="left" style="padding:18px 24px;border-bottom:1px solid #EEE;">
${escapeHtml(input.weddingDate)}
</td>
</tr>

<tr>
<td style="padding:18px 24px;">
📧 <strong>אימייל</strong>
</td>

<td align="left" style="padding:18px 24px;">
${escapeHtml(input.email)}
</td>
</tr>

<tr>
<td style="padding:18px 24px;border-bottom:1px solid #EEE;">
📞 <strong>טלפון</strong>
</td>

<td align="left" style="padding:18px 24px;border-bottom:1px solid #EEE;">
${escapeHtml(input.phone ?? '-')}
</td>
</tr>

</table>

<div
style="
margin-top:28px;
padding:18px;
background:#FFF8E9;
border-right:4px solid #C9A84C;
border-radius:10px;
">

<strong style="color:#B8944A;">
⏳ סטטוס:
</strong>

<span style="color:#555;">
ממתין לאישור ופתיחת החתונה.
</span>

</div>

<div style="text-align:center;margin-top:34px;">

<a
href="https://weddingsandd.onrender.com/admin/wedding-requests"
style="
display:inline-block;
background:#C9A84C;
color:#fff;
padding:15px 34px;
border-radius:10px;
text-decoration:none;
font-weight:bold;
font-size:15px;
">
פתח את בקשת ההרשמה
</a>

</div>

</td>
</tr>

<!-- FOOTER -->
<tr>
<td
align="center"
style="
padding:24px;
background:#FAFAFA;
font-size:12px;
color:#888;
">

הודעה אוטומטית ממערכת WedFlow

</td>
</tr>

</table>

</td>
</tr>
</table>

</div>
`;

  return {
    to: '',
    subject,
    html,
    text,
  };
}

export function buildCoupleCredentialsTemplate(input: {
  brideName: string;
  groomName: string;
  credentials: CoupleCredentials[];
}): FirstContactMailPayload {
  const coupleTitle = `${input.brideName} ו${input.groomName}`;
  const subject = `🎉 החתונה שלכם מוכנה! ברוכים הבאים ל-WedFlow`;

  const normalizeLoginName = (fullName: string): string => {
    const parts = fullName.trim().split(/\s+/);
    return parts.length >= 2 ? fullName : `${parts[0]} ${parts[0]}`;
  };

  const credentialsText = input.credentials
    .map(
      (cred) =>
        `${cred.side}\nשם משתמש: ${normalizeLoginName(
          cred.full_name,
        )}\nקוד כניסה: ${cred.code}`,
    )
    .join('\n\n');

  const credentialsHtml = input.credentials
    .map((cred) => {
      const loginName = normalizeLoginName(cred.full_name);

      const icon = cred.side === 'כלה' ? '👰' : '🤵';

      return `
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                style="
                    margin-bottom:22px;
                    background:#FFFDF8;
                    border:1px solid rgba(201,168,76,.28);
                    border-radius:14px;
                    overflow:hidden;
                ">

                <tr>
                    <td
                        style="
                            background:#F9F3E4;
                            padding:14px 20px;
                            font-size:17px;
                            font-weight:700;
                            color:#B8944A;
                        "
                    >
                        ${icon} התחברות ${escapeHtml(cred.side)}
                    </td>
                </tr>

                <tr>
                    <td style="padding:22px;">

                        <p style="margin:0 0 8px;color:#777;font-size:13px;">
                            שם משתמש
                        </p>

                        <div
                            style="
                                background:#fff;
                                border:1px solid #E7D9AF;
                                border-radius:10px;
                                padding:14px 18px;
                                font-size:18px;
                                font-weight:700;
                                color:#2A2A2A;
                                margin-bottom:18px;
                            "
                        >
                            ${escapeHtml(loginName)}
                        </div>

                        <p style="margin:0 0 8px;color:#777;font-size:13px;">
                            קוד כניסה
                        </p>

                        <div
                            style="
                                background:linear-gradient(135deg,#C9A84C,#B8944A);
                                color:#fff;
                                border-radius:10px;
                                padding:16px;
                                text-align:center;
                                font-size:28px;
                                font-weight:700;
                                letter-spacing:4px;
                            "
                        >
                            ${escapeHtml(cred.code)}
                        </div>

                    </td>
                </tr>

            </table>
            `;
    })
    .join('');

  const text =
    `שלום ${coupleTitle},\n\n` +
    `ברוכים הבאים ל-WedFlow!\n\n` +
    `החשבון שלכם הופעל בהצלחה.\n\n` +
    `${credentialsText}\n\n` +
    `כדי להתחבר:\n` +
    `1. היכנסו לאתר.\n` +
    `2. הזינו את שם המשתמש שקיבלתם.\n` +
    `3. הזינו את קוד הכניסה.\n\n` +
    `מאחלים לכם תכנון קל, נעים ומרגש!\n` +
    `צוות WedFlow`;

  const html = `
<div dir="rtl" style="margin:0;padding:0;background:#F6F4EF;font-family:Arial,sans-serif;">

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:34px 16px;">
<tr>
<td align="center">

<table
role="presentation"
width="100%"
cellpadding="0"
cellspacing="0"
style="
max-width:620px;
background:#fff;
border-radius:18px;
overflow:hidden;
border:1px solid rgba(201,168,76,.28);
box-shadow:0 8px 28px rgba(0,0,0,.06);
">

<!-- HEADER -->
<tr>
<td
align="center"
style="
background:linear-gradient(135deg,#C9A84C,#B8944A);
padding:42px;
">

<img
src="https://weddingsandd.onrender.com/WedFlowIcon.svg"
width="74"
height="74"
alt="WedFlow"
style="display:block;border-radius:50%;"
/>

<div
style="
margin-top:22px;
display:inline-block;
padding:16px 28px;
background:rgba(255,255,255,.18);
border-radius:16px;
border:1px solid rgba(255,255,255,.25);
">

<div
style="
font-size:30px;
font-weight:700;
color:#fff;
">
🎉 ברוכים הבאים ל-WedFlow
</div>

<div
style="
margin-top:6px;
font-size:15px;
color:#fff;
">
החתונה שלכם מוכנה להתחיל
</div>

</div>

</td>
</tr>

<!-- BODY -->
<tr>
<td style="padding:38px;">

<h2
style="
margin:0 0 18px;
font-size:24px;
color:#2A2A2A;
">
שלום ${escapeHtml(coupleTitle)}! 💛
</h2>

<p
style="
margin:0 0 24px;
font-size:16px;
line-height:2;
color:#555;
">
בשמחה רבה אנחנו מודיעים שהחשבון שלכם הופעל בהצלחה!
<br><br>
מעכשיו תוכלו לנהל את כל החתונה שלכם במקום אחד -
בקלות, בנוחות ובכל זמן.
</p>

<div
style="
background:#FFF8E9;
border-right:4px solid #C9A84C;
border-radius:10px;
padding:22px;
margin-bottom:30px;
">

<div
style="
font-weight:700;
font-size:17px;
color:#B8944A;
margin-bottom:14px;
">
✨ מה מחכה לכם?
</div>

<div style="line-height:2;color:#555;">
✔ ניהול רשימת מוזמנים<br>
✔ שליחת הזמנות דיגיטליות<br>
✔ אישורי הגעה בזמן אמת<br>
✔ סידורי הושבה<br>
✔ גלריית תמונות משותפת<br>
✔ ניהול משימות והוצאות
</div>

</div>

${credentialsHtml}

<div
style="
background:#F8F8F8;
border-radius:12px;
padding:22px;
margin-top:10px;
">

<div
style="
font-size:18px;
font-weight:700;
margin-bottom:14px;
color:#2A2A2A;
">
🔑 איך מתחברים?
</div>

<div
style="
line-height:2;
color:#555;
font-size:15px;
">
1️⃣ היכנסו לעמוד ההתחברות במערכת.<br>
2️⃣ הזינו את <strong>שם המשתמש</strong> שקיבלתם למעלה.<br>
3️⃣ הזינו את <strong>קוד הכניסה</strong> המתאים.<br>
4️⃣ התחילו לתכנן את החתונה שלכם. 🎉
</div>

</div>

<div
style="
margin-top:26px;
padding:18px;
background:#FFFDF8;
border:1px solid rgba(201,168,76,.25);
border-radius:10px;
">

💡 <strong>טיפ קטן</strong><br><br>

כל אחד מבני הזוג יכול להתחבר מהמכשיר שלו באמצעות פרטי ההתחברות האישיים.
כל שינוי שתבצעו יתעדכן באופן מיידי אצל שניכם.

</div>

<div style="text-align:center;margin-top:34px;">

<a
href="https://weddingsandd.onrender.com/login"
style="
display:inline-block;
background:#C9A84C;
color:white;
padding:16px 34px;
border-radius:10px;
font-size:16px;
font-weight:bold;
text-decoration:none;
">
כניסה למערכת
</a>

</div>

</td>
</tr>

<!-- FOOTER -->
<tr>
<td
align="center"
style="
padding:28px;
background:#FAFAFA;
">

<p
style="
margin:0;
font-size:15px;
color:#555;
">
מאחלים לכם תקופת אירוסין מרגשת והמון רגעים יפים בדרך. 💛
</p>

<p
style="
margin:10px 0 0;
font-weight:700;
color:#B8944A;
">
צוות WedFlow
</p>

</td>
</tr>

</table>

</td>
</tr>
</table>

</div>
`;

  return {
    to: '',
    subject,
    html,
    text,
  };
}

// ---------------------------------------------------------------------------
// buildTomorrowWhatsappNotificationEmail
// ---------------------------------------------------------------------------

export interface TomorrowWhatsappScheduledMessage {
  templateName: 'wedding_confirmation' | 'wedding_reminder' | 'wedding_day_before' | 'wedding_post_thanks';
  sendAt: string;
  recipientCount: number;
  messageHeader: string;
  messageBody: string;
}

export function buildTomorrowWhatsappNotificationEmail(input: {
  brideName: string;
  groomName: string;
  totalGuests: number;
  confirmedGuests: number;
  pendingGuests: number;
  notComingGuests: number;
  scheduledMessages: TomorrowWhatsappScheduledMessage[];
  /** 'מחר' for normal case, 'מחרתיים' when today is Friday and sends fall on Sunday */
  sendLabel: 'מחר' | 'מחרתיים';
}): { html: string; text: string; subject: string } {
  const coupleTitle = `${input.brideName} ו${input.groomName}`;
  const sl = input.sendLabel;
  const subject = `💬 ${sl} ישלחו הודעות WhatsApp למוזמנים | ${coupleTitle}`;

  const templateLabels: Record<string, string> = {
    wedding_confirmation: '📨 הזמנה לחתונה',
    wedding_reminder: '🔔 תזכורת לאישור הגעה',
    wedding_day_before: '❤️ הודעת יום לפני החתונה',
    wedding_post_thanks: '💛 הודעת תודה אחרי החתונה',
  };

  const messagesHtml = input.scheduledMessages
    .map((msg) => {
      const bodyHtml = escapeHtml(msg.messageBody)
        .split('\n')
        .map((line) => line.trim())
        .join('<br>');

      return `
<div style="margin-bottom:28px;">
  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:10px;">
    <tr>
      <td style="padding:10px 14px;background:#FFF8E9;border-right:4px solid #C9A84C;border-radius:8px;">
        <div style="font-size:15px;font-weight:700;color:#B8944A;">${templateLabels[msg.templateName] ?? msg.templateName}</div>
        <div style="font-size:13px;color:#777;margin-top:4px;">שליחה: ${escapeHtml(msg.sendAt)} | ${msg.recipientCount} נמענים</div>
      </td>
    </tr>
  </table>
  <div style="
    max-width:380px;
    background:#dcf8c6;
    border-radius:12px 12px 2px 12px;
    padding:12px 16px;
    font-family:Arial,sans-serif;
    font-size:13.5px;
    line-height:1.7;
    color:#111;
    box-shadow:0 1px 3px rgba(0,0,0,.14);
    margin-right:auto;
  ">
    <div style="font-weight:700;margin-bottom:6px;">${escapeHtml(msg.messageHeader)}</div>
    <div>${bodyHtml}</div>
    <div style="
      margin-top:8px;
      background:#25d366;
      color:#fff;
      border-radius:6px;
      padding:5px 10px;
      font-size:12px;
      font-weight:700;
      display:inline-block;
    ">לאישור הגעה ←</div>
  </div>
</div>`;
    })
    .join('');

  const summaryRowsHtml = input.scheduledMessages
    .map(
      (msg) => `
    <tr>
      <td style="padding:10px 14px;border-bottom:1px solid #eee;">${templateLabels[msg.templateName] ?? msg.templateName}</td>
      <td style="padding:10px 14px;border-bottom:1px solid #eee;">${escapeHtml(msg.sendAt)}</td>
      <td style="padding:10px 14px;border-bottom:1px solid #eee;text-align:center;"><b>${msg.recipientCount}</b></td>
    </tr>`,
    )
    .join('');

  const html = `
<div dir="rtl" style="margin:0;padding:0;background:#F8F5EF;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
<tr><td align="center">

<table role="presentation" width="100%" cellpadding="0" cellspacing="0"
  style="max-width:620px;background:#fff;border-radius:18px;overflow:hidden;border:1px solid rgba(201,168,76,.28);box-shadow:0 8px 28px rgba(0,0,0,.06);">

<!-- HEADER -->
<tr>
  <td align="center" style="background:linear-gradient(135deg,#C9A84C,#B8944A);padding:38px;">
    <img src="https://weddingsandd.onrender.com/WedFlowIcon.svg" alt="WedFlow" width="70" height="70" style="display:block;border-radius:50%;margin:0 auto;"/>
    <div style="margin-top:20px;display:inline-block;padding:16px 28px;background:rgba(255,255,255,.18);border-radius:14px;border:1px solid rgba(255,255,255,.25);">
      <div style="font-size:28px;font-weight:700;color:#fff;">WedFlow</div>
      <div style="margin-top:4px;font-size:15px;color:#fff;">💬 ${sl} ישלחו הודעות WhatsApp</div>
    </div>
  </td>
</tr>

<!-- BODY -->
<tr>
<td style="padding:36px 36px 10px;">

  <h2 style="margin:0 0 16px;font-size:23px;color:#2A2A2A;">שלום ${escapeHtml(coupleTitle)}! 💛</h2>

  <p style="margin:0 0 22px;font-size:15px;line-height:1.9;color:#555;">
    רצינו להודיע לכם ש${sl} מערכת <b>WedFlow</b> תשלח אוטומטית הודעות WhatsApp למוזמנים שלכם.
    <br>אין צורך לבצע שום פעולה — אנחנו כבר נדאג לכל השאר ✨
  </p>

  <h3 style="margin:0 0 12px;font-size:17px;color:#2A2A2A;">📅 הודעות שיישלחו ${sl}</h3>
  <table style="width:100%;border-collapse:collapse;margin-bottom:28px;">
    <thead>
      <tr style="background:#faf5e8;">
        <th style="padding:10px 14px;text-align:right;font-size:13px;">סוג הודעה</th>
        <th style="padding:10px 14px;text-align:right;font-size:13px;">שעת שליחה</th>
        <th style="padding:10px 14px;text-align:center;font-size:13px;">נמענים</th>
      </tr>
    </thead>
    <tbody>${summaryRowsHtml}</tbody>
  </table>

  <h3 style="margin:0 0 16px;font-size:17px;color:#2A2A2A;">👀 כך תיראה ההודעה למוזמנים שלכם</h3>
  ${messagesHtml}

  <hr style="margin:28px 0;border:none;border-top:1px solid #eee;">

  <h3 style="margin:0 0 12px;font-size:17px;color:#2A2A2A;">📊 מצב רשימת המוזמנים</h3>
  <table style="width:100%;font-size:15px;line-height:2.2;">
    <tr><td>👥 סה"כ מוזמנים</td><td align="left"><b>${input.totalGuests}</b></td></tr>
    <tr><td>✅ אישרו הגעה</td><td align="left"><b>${input.confirmedGuests}</b></td></tr>
    <tr><td>⏳ ממתינים לאישור</td><td align="left"><b>${input.pendingGuests}</b></td></tr>
    <tr><td>❌ לא מגיעים</td><td align="left"><b>${input.notComingGuests}</b></td></tr>
  </table>

</td>
</tr>

<!-- FOOTER -->
<tr>
  <td align="center" style="padding:28px;background:#FAFAFA;">
    <p style="margin:0 0 6px;font-size:15px;color:#555;">מאחלים לכם חתונה מרגשת ובלתי נשכחת 💛</p>
    <p style="margin:0;font-weight:700;color:#B8944A;">צוות WedFlow</p>
  </td>
</tr>

</table>

<p style="margin:18px 0 0;font-size:11px;color:#A89A86;text-align:center;">
  קיבלתם מייל זה כי ${sl} מתוכננת שליחת הודעות WhatsApp לאורחי החתונה שלכם במערכת WedFlow.
</p>

</td></tr>
</table>
</div>
`;

  const summaryText = input.scheduledMessages
    .map(
      (msg) =>
        `${templateLabels[msg.templateName] ?? msg.templateName}\nשליחה: ${msg.sendAt} | ${msg.recipientCount} נמענים`,
    )
    .join('\n\n');

  const text =
    `שלום ${coupleTitle},\n\n` +
    `${sl} מערכת WedFlow תשלח הודעות WhatsApp למוזמנים שלכם.\n\n` +
    `הודעות שיישלחו:\n\n${summaryText}\n\n` +
    `------------------------\n\n` +
    `מצב רשימת המוזמנים:\n` +
    `סה"כ מוזמנים: ${input.totalGuests}\n` +
    `אישרו: ${input.confirmedGuests}\n` +
    `ממתינים: ${input.pendingGuests}\n` +
    `לא מגיעים: ${input.notComingGuests}\n\n` +
    `אין צורך לבצע שום פעולה.\n` +
    `המערכת תבצע את השליחה באופן אוטומטי.\n\n` +
    `WedFlow\nהחתונה שלכם. בלי כאבי ראש.`;

  return { html, text, subject };
}