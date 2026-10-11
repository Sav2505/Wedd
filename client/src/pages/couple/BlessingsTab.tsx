import { useEffect, useState } from 'react';
import { Alert, Box, Button, IconButton, Skeleton, Tooltip, Typography } from '@mui/material';
import FavoriteBorderOutlinedIcon from '@mui/icons-material/FavoriteBorderOutlined';
import RefreshOutlinedIcon from '@mui/icons-material/RefreshOutlined';
import { getBlessings, type GuestBlessing } from '../../services/guests.service';
import BlessingLetter from '../../components/BlessingLetter';

export default function BlessingsTab() {
    const [blessings, setBlessings] = useState<GuestBlessing[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [reload, setReload] = useState(0);

    useEffect(() => {
        let cancelled = false;
        getBlessings().then((data) => {
            if (!cancelled) { setBlessings(data); setError(''); }
        }).catch((reason: Error) => {
            if (!cancelled) setError(reason.message);
        }).finally(() => {
            if (!cancelled) setLoading(false);
        });
        return () => { cancelled = true; };
    }, [reload]);

    function refresh() {
        setLoading(true);
        setReload((value) => value + 1);
    }

    return (
        <Box component="section" dir="rtl" sx={{ px: { xs: 2.5, sm: 3.5 }, py: 3, minHeight: '60vh' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, mb: 3 }}>
                <Box>
                    <Typography component="h1" sx={{ fontFamily: "'Frank Ruhl Libre', serif", fontSize: '1.8rem', color: '#73552B' }}>ברכות מהאורחים</Typography>
                    <Typography sx={{ color: '#806D61', fontSize: '0.85rem', mt: 0.5 }}>
                        {loading ? 'אוספים את המילים החמות...' : `${blessings.length} ברכות מהאנשים שלכם`}
                    </Typography>
                </Box>
                <Tooltip title="רענון ברכות"><span><IconButton aria-label="רענון ברכות" disabled={loading} onClick={refresh} sx={{ color: '#9A7833' }}><RefreshOutlinedIcon /></IconButton></span></Tooltip>
            </Box>
            {error && <Alert severity="error" sx={{ mb: 3 }} action={<Button color="inherit" disabled={loading} onClick={refresh}>נסו שוב</Button>}>{error}</Alert>}
            {loading ? <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 3 }}>
                {[0, 1, 2, 3].map((index) => <Skeleton key={index} variant="rectangular" height={index % 2 ? 230 : 300} sx={{ borderRadius: 1 }} />)}
            </Box> : !blessings.length && !error ? <Box sx={{ textAlign: 'center', py: 8 }}>
                <FavoriteBorderOutlinedIcon sx={{ fontSize: 42, color: '#C9A84C', mb: 2 }} />
                <Typography sx={{ fontFamily: "'Frank Ruhl Libre', serif", color: '#73552B', fontSize: '1.4rem', mb: 1 }}>המילים הראשונות עוד בדרך</Typography>
                <Typography sx={{ color: '#806D61', fontSize: '0.9rem' }}>כשהאורחים ישלחו לכם ברכות, הן יחכו כאן.</Typography>
            </Box> : <Box sx={{ columnCount: { xs: 1, sm: 2 }, columnGap: '28px', py: 1 }}>
                {blessings.map((blessing, index) => <Box key={blessing.id} sx={{
                    breakInside: 'avoid', mb: 3.5, pt: { xs: 0, sm: index === 0 ? 3 : 0 },
                    transform: { xs: 'none', sm: `rotate(${index % 2 ? 1 : -1}deg)` },
                }}>
                    <BlessingLetter content={blessing.blessing ?? ''} sender={blessing.full_name} tone={index} />
                </Box>)}
            </Box>}
        </Box>
    );
}