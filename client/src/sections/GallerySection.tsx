import { Box, Typography } from '@mui/material';
import { motion } from 'framer-motion';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import { fadeUp, fadeUpCard, staggerContainer, scrollReveal, palette } from '../shared/animations';

// Decorative "polaroid" placeholders — deliberately abstract (icon + gradient),
// not real photos, since this is a marketing mockup of the feature.
const rotations = [-6, 4, -3, 7, -8, 3];

export default function GallerySection() {
    return (
        <Box sx={{ px: 2, py: { xs: 7, sm: 10 }, overflow: 'hidden' }}>
            <motion.div {...scrollReveal} variants={staggerContainer} style={{ maxWidth: 720, margin: '0 auto' }}>
                <motion.div variants={fadeUp}>
                    <Typography sx={{ color: palette.gold, fontWeight: 700, textAlign: 'center', letterSpacing: '0.04em', mb: 1 }}>
                        📸 גלריה משותפת
                    </Typography>
                    <Typography
                        align="center"
                        sx={{
                            fontFamily: "'Frank Ruhl Libre', serif",
                            fontWeight: 700,
                            fontSize: { xs: '1.5rem', sm: '1.9rem' },
                            color: palette.textDark,
                            mb: 1.5,
                        }}
                    >
                        כל הרגעים היפים, במקום אחד
                    </Typography>
                    <Typography align="center" sx={{ color: palette.textMuted, fontSize: '0.95rem', mb: { xs: 5, sm: 6 } }}>
                        כל אורח יכול להעלות ולשתף תמונות מהאירוע — כולם רואים הכל, בלי לחפש בקבוצות
                    </Typography>
                </motion.div>

                <Box
                    sx={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        justifyContent: 'center',
                        gap: { xs: 2, sm: 3 },
                    }}
                >
                    {rotations.map((rot, i) => (
                        <motion.div
                            key={i}
                            variants={fadeUpCard}
                            whileHover={{ rotate: 0, scale: 1.06, zIndex: 5 }}
                            style={{ rotate: `${rot}deg` }}
                        >
                            <Box
                                sx={{
                                    width: { xs: 92, sm: 118 },
                                    height: { xs: 108, sm: 138 },
                                    p: 0.9,
                                    background: '#fff',
                                    borderRadius: '4px',
                                    boxShadow: '0 6px 18px rgba(44,24,16,0.14)',
                                }}
                            >
                                <Box
                                    sx={{
                                        width: '100%',
                                        height: { xs: 78, sm: 100 },
                                        borderRadius: '2px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        background: `linear-gradient(135deg, rgba(224,201,122,${0.35 + (i % 3) * 0.1}) 0%, rgba(201,168,76,${0.5 + (i % 2) * 0.15}) 100%)`,
                                    }}
                                >
                                    <PhotoCameraIcon sx={{ color: 'rgba(255,255,255,0.85)', fontSize: 26 }} />
                                </Box>
                            </Box>
                        </motion.div>
                    ))}
                </Box>
            </motion.div>
        </Box>
    );
}