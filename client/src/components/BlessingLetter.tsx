import { Box, Typography } from '@mui/material';
import FavoriteBorderOutlinedIcon from '@mui/icons-material/FavoriteBorderOutlined';

export default function BlessingLetter({ content, sender, recipient, tone = 0 }: {
    content: string;
    sender: string;
    recipient?: string;
    tone?: number;
}) {
    const backgrounds = ['#FFFEFB', '#F5F8F5', '#FFF6F5'];
    return (
        <Box component="article" dir="rtl" sx={{
            position: 'relative', p: { xs: 2.5, sm: 3.5 }, borderRadius: 1,
            bgcolor: backgrounds[tone % backgrounds.length],
            backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 31px, rgba(154,120,51,0.035) 32px)',
            border: '1px solid rgba(154,120,51,0.18)',
            boxShadow: '0 8px 24px rgba(44,24,16,0.06)', overflowWrap: 'anywhere',
        }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#9A7833', mb: 2 }}>
                <FavoriteBorderOutlinedIcon sx={{ fontSize: 19 }} />
                <Box sx={{ height: '1px', flex: 1, bgcolor: 'rgba(154,120,51,0.22)' }} />
            </Box>
            {recipient && <Typography sx={{ fontFamily: "'Frank Ruhl Libre', serif", color: '#9A7833', fontSize: '1.1rem', mb: 1.5 }}>
                ל{recipient},
            </Typography>}
            <Typography sx={{ fontFamily: "'Frank Ruhl Libre', serif", fontSize: '1.2rem', lineHeight: 1.9, color: '#3C3430', whiteSpace: 'pre-wrap' }}>
                {content}
            </Typography>
            <Typography sx={{ mt: 2.5, color: '#756458', fontSize: '0.85rem' }}>באהבה,</Typography>
            <Typography sx={{ fontFamily: "'Frank Ruhl Libre', serif", color: '#73552B', fontWeight: 700, fontSize: '1.15rem', mt: 0.25 }}>
                {sender}
            </Typography>
        </Box>
    );
}