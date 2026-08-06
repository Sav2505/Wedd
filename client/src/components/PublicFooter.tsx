import { Box, Link, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

type Props = {
    overlay?: boolean;
};

export default function PublicFooter({ overlay = false }: Props) {
    const year = new Date().getFullYear();

    return (
        <Box
            component="footer"
            sx={{
                width: '100%',
                px: 2,
                py: overlay ? 1.5 : 3,
                mt: overlay ? 0 : 2,
                position: overlay ? 'absolute' : 'static',
                bottom: overlay ? 0 : 'auto',
                left: 0,
                zIndex: 3,
                background: overlay
                    ? 'linear-gradient(180deg, rgba(250,247,242,0) 0%, rgba(250,247,242,0.88) 60%, rgba(250,247,242,0.94) 100%)'
                    : 'transparent',
            }}
        >
            <Box
                sx={{
                    maxWidth: 960,
                    mx: 'auto',
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: { xs: 1, sm: 1.5 },
                    rowGap: 0.75,
                }}
            >
                <Link component={RouterLink} to="/terms" underline="hover" sx={linkSx}>
                    תנאי שימוש
                </Link>

                <Link component={RouterLink} to="/privacy" underline="hover" sx={linkSx}>
                    מדיניות פרטיות
                </Link>

                <Link component={RouterLink} to="/contact" underline="hover" sx={linkSx}>
                    יצירת קשר
                </Link>

                <Link component={RouterLink} to="/delete-account" underline="hover" sx={linkSx}>
                    מחיקת חשבון ומידע אישי
                </Link>

                <Link component={RouterLink} to="/refunds" underline="hover" sx={linkSx}>
                    מדיניות ביטולים והחזרים
                </Link>

                <Typography sx={{ color: 'rgba(108,84,67,0.78)', fontSize: '0.72rem' }}>
                    © WedFlow {year}
                </Typography>
            </Box>
        </Box>
    );
}

const linkSx = {
    color: 'rgba(108,84,67,0.82)',
    fontSize: '0.72rem',
    letterSpacing: '0.01em',
    transition: 'color 0.2s ease',
    '&:hover': {
        color: '#6B5240',
    },
};
