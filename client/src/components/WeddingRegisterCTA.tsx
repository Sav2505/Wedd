import { Typography, Link, Box } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { motion } from 'framer-motion';

interface Props {
    variants?: any;
}

export default function WeddingRegisterCTA({ variants }: Props) {
    const content = (
        <Box sx={{ mt: 3 }}>
            <Typography
                align="center"
                sx={{
                    color: '#8A6A2B',
                    fontSize: '0.95rem',
                    fontWeight: 500,
                }}
            >
                רוצים גם לחתונה שלכם ?
            </Typography>

            <Link
                component={RouterLink}
                to="/register"
                underline="hover"
                sx={{
                    display: 'block',
                    textAlign: 'center',
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
                דברו איתנו 💍
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