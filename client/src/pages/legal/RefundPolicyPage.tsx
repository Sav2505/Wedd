import { Box, Container, Link, Paper, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import PublicFooter from '../../components/PublicFooter';

export default function RefundPolicyPage() {
    const contactEmail = import.meta.env.VITE_CONTACT_EMAIL || 'weddflowapp@gmail.com';

    return (
        <Box
            sx={{
                minHeight: '100dvh',
                display: 'flex',
                flexDirection: 'column',
                background:
                    'radial-gradient(ellipse at 20% 12%, rgba(224,201,122,0.12) 0%, transparent 60%),' +
                    'linear-gradient(160deg, #FAF7F2 0%, #F5EDD9 52%, #FAF7F2 100%)',
            }}
        >
            <Container maxWidth="sm" sx={{ pt: { xs: 5, sm: 7 }, pb: { xs: 2, sm: 3 } }}>
                <Stack direction="row" spacing={2} justifyContent="center" sx={{ mb: 2.5, flexWrap: 'wrap' }}>
                    <Link component={RouterLink} to="/showcase" underline="hover" sx={topLinkSx}>
                        חזרה לדף התצוגה
                    </Link>
                    <Link component={RouterLink} to="/login" underline="hover" sx={topLinkSx}>
                        התחברות
                    </Link>
                </Stack>

                <Paper
                    elevation={0}
                    sx={{
                        p: { xs: 2.25, sm: 3.5 },
                        borderRadius: 3,
                        background: 'rgba(255,255,255,0.9)',
                        border: '1px solid rgba(201,168,76,0.24)',
                    }}
                >
                    <Typography
                        variant="h4"
                        sx={{
                            fontFamily: "'Frank Ruhl Libre', serif",
                            color: '#2C1810',
                            textAlign: 'center',
                            mb: 2,
                        }}
                    >
                        מדיניות ביטולים והחזרים
                    </Typography>

                    <Stack spacing={1.2}>
                        <Typography sx={{ color: '#5C3D2E', lineHeight: 1.8 }}>
                            השימוש ב-WedFlow כרוך בתשלום חד-פעמי עבור כל אירוע.
                        </Typography>

                        <Typography sx={{ color: '#5C3D2E', lineHeight: 1.8 }}>
                            במקרה של ביטול, נשמח שתפנו אלינו מוקדם ככל האפשר כדי שנוכל לבחון את בקשתכם.
                        </Typography>

                        <Typography sx={{ color: '#5C3D2E', lineHeight: 1.8 }}>
                            הזכאות להחזר כספי תיקבע בהתאם לשלב שבו נמצא השירות, לעבודה שכבר בוצעה ולהוראות הדין.
                        </Typography>

                        <Typography sx={{ color: '#5C3D2E' }}>
                            <strong>דוא"ל:</strong>{' '}
                            <Link
                                href={`mailto:${contactEmail}`}
                                underline="hover"
                                sx={{
                                    color: '#8A6A2B',
                                    fontWeight: 600,
                                    transition: 'color 0.2s',
                                    '&:hover': {
                                        color: '#9A7833',
                                    },
                                }}
                            >
                                {contactEmail}
                            </Link>
                        </Typography>

                        <Typography sx={{ color: '#8A7565', fontSize: '0.88rem', mt: 0.4 }}>
                            ניתן לפנות אלינו בכל שאלה או בקשה בנושא ביטולים והחזרים.
                        </Typography>
                    </Stack>
                </Paper>
            </Container>

            <PublicFooter />
        </Box>
    );
}

const topLinkSx = {
    color: '#8A6A2B',
    fontSize: '0.86rem',
    fontWeight: 600,
};
