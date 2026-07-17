// ─── Shared motion variants for the Wedding Showcase page ───
// Kept identical in spirit to the variants already used in
// WeddingRegisterPage.tsx, so the two pages feel like one flow.

export const staggerContainer = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: { staggerChildren: 0.12, delayChildren: 0.1 },
    },
};

export const fadeUp = {
    hidden: { opacity: 0, y: 28 },
    show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' as const } },
};

export const fadeUpCard = {
    hidden: { opacity: 0, y: 40, scale: 0.97 },
    show: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: { duration: 0.7, ease: 'easeOut' as const },
    },
};

export const fadeIn = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { duration: 0.8, ease: 'easeOut' as const } },
};

// Props to spread onto a motion.div so every section animates in
// once, as it scrolls into view (not just on first mount).
export const scrollReveal = {
    initial: 'hidden',
    whileInView: 'show',
    viewport: { once: true, amount: 0.25 },
};

// Colors shared across the showcase (kept in one place so every
// section stays in sync with the register page's palette).
export const palette = {
    goldLight: '#E0C97A',
    gold: '#C9A84C',
    goldDark: '#9A7833',
    textDark: '#2C1810',
    textMuted: '#8A6A2B',
    textFaint: '#A08070',
    cream: '#FAF7F2',
    creamDark: '#F5EDD9',
};