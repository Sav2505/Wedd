import { Typography, Link, Box } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { motion } from 'framer-motion';

interface Props {
    variants?: any;
    mt?: number;
}

const DEFAULT_MT = 3;

export default function WeddingRegisterCTA({ variants, mt }: Props) {
    const content = (
        <Box sx={{ mt: mt ?? DEFAULT_MT }}>
            <Typography
                align="center"
                sx={{
                    color: '#8A6A2B',
                    fontSize: '0.95rem',
                    fontWeight: 500,
                }}
            >
                מתחתנים בקרוב & אהבתם את האפליקציה שלנו ?
            </Typography>

            <Link
                component={RouterLink}
                to="/showcase"
                sx={{
                    display: 'block',
                    textAlign: 'center',
                    textDecoration: 'none',
                    mt: 0.5,
                    fontWeight: 700,
                    fontSize: '1rem',
                    color: '#C9A84C',
                    transition: '.2s',
                    '&:hover': {
                        color: '#9A7833',
                        textDecoration: 'none',
                    },
                }}
            >
                לחצו כאן לפרטים 💍
            </Link>
        </Box>
    );

    if (variants) {
        return (
            <motion.div variants={variants}>
                {content}
            </motion.div>
        );
    }

    return content;
}