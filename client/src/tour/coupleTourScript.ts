export type CoupleTourStep = {
  id: string;
  tabIndex: number;
  anchorId: string;
  title: string;
  body: string;
  actionLabel?: string;
};

export const COUPLE_TOUR_STEPS: CoupleTourStep[] = [
  {
    id: 'welcome-tabs',
    tabIndex: 0,
    anchorId: 'couple-tabs',
    title: 'ברוכים הבאים למערכת הניהול שלכם',
    body: 'נסייר יחד בכל הכלים המרכזיים לניהול החתונה שלכם בצורה פשוטה וברורה. אפשר להתקדם צעד-צעד וגם לדלג ולהמשיך אחר כך.',
    actionLabel: 'נתחיל',
  },
  {
    id: 'event-info-main',
    tabIndex: 0,
    anchorId: 'event-couple-names',
    title: 'טאב פרטי האירוע',
    body: 'כאן מעדכנים את פרטי האירוע המדויקים. מה שתשמרו כאן ישוקף בצורה ברורה לאורחים באפליקציה.',
  },
  {
    id: 'event-info-location',
    tabIndex: 0,
    anchorId: 'event-location-map',
    title: 'מיקום מדויק לניווט',
    body: 'לחיצה על המפה קובעת נקודה מדויקת לטובת ניווט נוח (Waze/Maps), כדי שהאורחים יגיעו בקלות ובזמן.',
  },
  {
    id: 'event-info-bit',
    tabIndex: 0,
    anchorId: 'event-bit-links',
    title: 'קישורי מתנה ב-BIT',
    body: 'אפשר להוסיף כאן קישורי מתנה אישיים של החתן והכלה, שיוצגו לאורחים באופן נקי ונגיש.',
  },
  {
    id: 'event-info-save',
    tabIndex: 0,
    anchorId: 'event-save-button',
    title: 'שמירה ועדכון מיידי',
    body: 'בסיום עדכון פרטים, לוחצים שמירה כדי שכל המידע באפליקציית האורחים יתעדכן מיד.',
  },
  {
    id: 'message-main',
    tabIndex: 1,
    anchorId: 'message-textarea',
    title: 'הודעה לאורחים',
    body: 'כאן כותבים הודעה שכל האורחים יראו דרך הלינק האישי שלהם. מומלץ טקסט קצר, חם וברור.',
  },
  {
    id: 'message-preview',
    tabIndex: 1,
    anchorId: 'message-preview',
    title: 'תצוגה מקדימה',
    body: 'לפני שמירה, אפשר לראות איך המסר ייראה אצל האורחים כדי לוודא שהכל מדויק.',
  },
  {
    id: 'tasks-overview',
    tabIndex: 2,
    anchorId: 'tasks-summary',
    title: 'מעקב משימות ותקציב',
    body: 'כאן תקבלו תמונת מצב ברורה של משימות, הוצאות, הכנסות ומתנות במקום אחד.',
  },
  {
    id: 'tasks-add',
    tabIndex: 2,
    anchorId: 'tasks-add-button',
    title: 'הוספת משימה חדשה',
    body: 'לוחצים על כפתור הפלוס כדי להוסיף משימה. במודל ההוספה מגדירים ספק, סטטוס, עלויות ומקדמות.',
  },
  {
    id: 'tasks-smart-venue',
    tabIndex: 2,
    anchorId: 'tasks-table',
    title: 'חישוב חכם לקטגוריית אולם',
    body: 'כשבוחרים קטגוריית אולם, המערכת מחשבת בצורה חכמה עלות צפויה לפי אישורי ההגעה וההתחייבות לאולם.',
  },
  {
    id: 'tasks-gifts',
    tabIndex: 2,
    anchorId: 'tasks-gifts-table',
    title: 'מתנות מהאורחים',
    body: 'בטבלה הזו מזינים סכום מתנה וסוג תשלום (מזומן, ביט, צק ועוד) לניהול פיננסי מסודר.',
  },
  {
    id: 'tasks-budget',
    tabIndex: 2,
    anchorId: 'tasks-budget-analytics',
    title: 'התפלגות הוצאות',
    body: 'בתחתית העמוד תראו את התפלגות ההוצאות בפועל כדי לקבל החלטות חכמות בזמן אמת.',
  },
  {
    id: 'guests-overview',
    tabIndex: 3,
    anchorId: 'guests-toolbar',
    title: 'אורחים והזמנות',
    body: 'כאן מנהלים את כלל המוזמנים, קבוצות, אישורי הגעה ותזמון הודעות בצורה מרוכזת וברורה.',
  },
  {
    id: 'guests-add',
    tabIndex: 3,
    anchorId: 'guests-add-button',
    title: 'הוספת אורח',
    body: 'בלחיצה על הוסף אורח ממלאים פרטים בסיסיים ומצרפים לקבוצה מתאימה, כדי לשמור על סדר ונוחות.',
  },
  {
    id: 'guests-group',
    tabIndex: 3,
    anchorId: 'guests-new-group-button',
    title: 'יצירת קבוצות חכמות',
    body: 'כפתור קבוצה חדשה עוזר לארגן משפחות וחברים בקבוצות, ואז לעבוד מהר יותר על הרשימות.',
  },
  {
    id: 'guests-whatsapp',
    tabIndex: 3,
    anchorId: 'guests-whatsapp-button',
    title: 'תזמון הודעות WhatsApp',
    body: 'מכאן פותחים את מודל התזמון: מאשרים הרשאה למערכת, ואז שולחים לאורחים לינק ישיר ואלגנטי לאישור הגעה.',
  },
  {
    id: 'seating-overview',
    tabIndex: 4,
    anchorId: 'seating-floorplan',
    title: 'טאב הושבה',
    body: 'כאן בונים את מפת הישיבה: מוסיפים שולחנות, גוררים למיקום מדויק ומייצרים חוויית הגעה ברורה לאורחים.',
  },
  {
    id: 'seating-add-table',
    tabIndex: 4,
    anchorId: 'seating-add-table-button',
    title: 'הוספת שולחן',
    body: 'לחיצה על הוסף שולחן תפתח יצירה מהירה של שולחן חדש. לאחר מכן אפשר לערוך, לגרור ולשבץ אורחים.',
  },
  {
    id: 'seating-publish',
    tabIndex: 4,
    anchorId: 'seating-publish-toggle',
    title: 'שליטה בפרסום לאורחים',
    body: 'המתג הזה קובע מתי האורחים יוכלו לראות את סידור ההושבה שלהם דרך הלינק האישי.',
  },
  {
    id: 'gallery-main',
    tabIndex: 5,
    anchorId: 'gallery-dropzone',
    title: 'טאב גלריה משותפת',
    body: 'במקום לפזר תמונות בוואטסאפ, כולם משתפים כאן במקום אחד. זו הגלריה המשותפת של האירוע.',
  },
  {
    id: 'gallery-grid',
    tabIndex: 5,
    anchorId: 'gallery-grid',
    title: 'שיתוף אחרי האירוע',
    body: 'אחרי האירוע תישלח הודעת תודה עם קישור ישיר לגלריה, כך שכל מי שאישר הגעה יוכל להוסיף תמונות בקלות.',
    actionLabel: 'סיום הסיור',
  },
];
