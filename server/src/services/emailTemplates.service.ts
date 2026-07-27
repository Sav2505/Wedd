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
  const coupleTitle = `${input.brideName} ו-${input.groomName}`;
  const subject = `השלבים הבאים להפעלת החתונה שלכם | ${coupleTitle}`;

  const text =
    `שלום ${coupleTitle},\n\n` +
    'שמחים שבחרתם באפליקציה שלנו לניהול החתונה מקצה לקצה.\n' +
    `לטובת תחילת העבודה נבקש מכם להעביר תשלום בסך ${input.amountNis} ש"ח ב-BIT למספר ${input.bitPhone}.\n` +
    'לאחר קבלת התשלום נפתח עבורכם את ההרשאה ונשלח פרטי כניסה מסודרים.\n\n' +
    'תודה רבה ובהצלחה בהכנות,\nצוות המערכת';

  const html = `
    <div dir="rtl" style="font-family:Arial,sans-serif;line-height:1.7;color:#2a2a2a;">
      <p>שלום ${escapeHtml(coupleTitle)},</p>
      <p>שמחים שבחרתם באפליקציה שלנו לניהול החתונה מקצה לקצה.</p>
      <p>
        לטובת תחילת העבודה נבקש מכם להעביר תשלום בסך
        <strong>${input.amountNis} ש"ח</strong>
        ב-BIT למספר
        <strong>${escapeHtml(input.bitPhone)}</strong>.
      </p>
      <p>לאחר קבלת התשלום נפתח עבורכם את ההרשאה ונשלח פרטי כניסה מסודרים.</p>
      <p>תודה רבה ובהצלחה בהכנות,<br/>צוות המערכת</p>
    </div>
  `;

  return { to: '', subject, html, text };
}

export function buildCoupleCredentialsTemplate(input: {
  brideName: string;
  groomName: string;
  credentials: CoupleCredentials[];
}): FirstContactMailPayload {
  const coupleTitle = `${input.brideName} ו-${input.groomName}`;
  const subject = `החתונה נפתחה בהצלחה | פרטי כניסה`;

  const credentialsText = input.credentials
    .map((cred) => `- ${cred.side}: ${cred.full_name} | קוד כניסה: ${cred.code}`)
    .join('\n');

  const credentialsHtml = input.credentials
    .map(
      (cred) =>
        `<li><strong>${escapeHtml(cred.side)}:</strong> ${escapeHtml(cred.full_name)} | קוד כניסה: <strong>${escapeHtml(cred.code)}</strong></li>`,
    )
    .join('');

  const text =
    `שלום ${coupleTitle},\n\n` +
    'החתונה שלכם נפתחה במערכת בהצלחה.\n' +
    'להלן פרטי ההתחברות שלכם:\n' +
    `${credentialsText}\n\n` +
    'מאחלים לכם שימוש מהנה ומדויק במערכת,\nצוות המערכת';

  const html = `
    <div dir="rtl" style="font-family:Arial,sans-serif;line-height:1.7;color:#2a2a2a;">
      <p>שלום ${escapeHtml(coupleTitle)},</p>
      <p>החתונה שלכם נפתחה במערכת בהצלחה.</p>
      <p>להלן פרטי ההתחברות שלכם:</p>
      <ul>${credentialsHtml}</ul>
      <p>מאחלים לכם שימוש מהנה ומדויק במערכת,<br/>צוות המערכת</p>
    </div>
  `;

  return { to: '', subject, html, text };
}
