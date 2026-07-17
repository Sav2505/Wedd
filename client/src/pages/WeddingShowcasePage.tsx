import { Box } from '@mui/material';
import FallingPetals from '../components/FallingPetals';
import ShowcaseHero from '../sections/ShowcaseHero';
import WhyLoveIt from '../sections/WhyLoveIt';
// import CoupleDashboardSection from '../sections/CoupleDashboardSection';
import RsvpTimelineSection from '../sections/RsvpTimelineSection';
import GuestExperienceSection from '../sections/GuestExperienceSection';
import GallerySection from '../sections/GallerySection';
import PricingSection from '../sections/PricingSection';
import FinalCTASection from '../sections/FinalCTASection';
import StickyMobileCTA from '../components/StickyMobileCTA';
import { useEffect } from 'react';

// ─── Wedding Showcase / Landing page ───────────────────────
// Sits between "לחצו כאן לפרטים" on the login screen and the
// existing /register form. Tells the story of the product before
// asking for contact details, using the same visual language as
// WeddingRegisterPage (gold gradients, glassmorphism cards,
// Frank Ruhl Libre display type, falling petals).
//
// Route suggestion: <Route path="/showcase" element={<WeddingShowcasePage />} />

export default function WeddingShowcasePage() {
    // React Router doesn't reset scroll position between route changes,
    // so arriving here from a page that was scrolled down would otherwise
    // land mid-page instead of at the hero. Force it to the top on mount.
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    return (
        <Box
            sx={{
                position: 'relative',
                overflowX: 'hidden',
                background:
                    'radial-gradient(ellipse at 20% 10%, rgba(224,201,122,0.15) 0%, transparent 60%),' +
                    'radial-gradient(ellipse at 80% 30%, rgba(201,168,76,0.12) 0%, transparent 55%),' +
                    'radial-gradient(ellipse at 60% 90%, rgba(245,237,217,0.4) 0%, transparent 60%),' +
                    'linear-gradient(160deg, #FAF7F2 0%, #F5EDD9 50%, #FAF7F2 100%)',
            }}
        >
            <FallingPetals />

            <ShowcaseHero />
            <WhyLoveIt />
            {/* <CoupleDashboardSection /> */}
            <RsvpTimelineSection />
            <GuestExperienceSection />
            <GallerySection />
            <PricingSection />
            <FinalCTASection />

            <StickyMobileCTA />
        </Box>
    );
}