import { useEffect, useState } from 'react';
import {
    Backdrop,
    CircularProgress,
    Paper,
    Typography,
    Snackbar,
    Alert,
} from '@mui/material';

interface LoadingOverlayProps {
    open: boolean;
    message?: string;
    result?: 'success' | 'error' | null;
    resultMessage?: string;
    duration?: number;
    onResultShown?: () => void;
}

export default function LoadingOverlay({
    open,
    message = 'טוען...',
    result = null,
    resultMessage = '',
    duration = 2500,
    onResultShown,
}: LoadingOverlayProps) {
    const [toastOpen, setToastOpen] = useState(false);
    const [displayResult, setDisplayResult] = useState<'success' | 'error' | null>(null);

    useEffect(() => {
        if (!result) return;

        setDisplayResult(result);
        setToastOpen(true);

        const timer = setTimeout(() => {
            setToastOpen(false);
        }, duration);

        return () => clearTimeout(timer);

    }, [result, duration]);

    return (
        <>
            <Backdrop
                open={open}
                sx={{
                    zIndex: (theme) => theme.zIndex.modal + 2,
                    backdropFilter: 'blur(6px)',
                    background: 'rgba(255,255,255,.45)',
                }}
            >
                <Paper
                    elevation={10}
                    sx={{
                        px: 5,
                        py: 4,
                        borderRadius: 4,
                        textAlign: 'center',
                        minWidth: 300,
                    }}
                >

                    <CircularProgress
                        size={48}
                        sx={{
                            color: '#C9A84C',
                            mb: 2,
                        }}
                    />


                    <Typography
                        sx={{
                            fontWeight: 700,
                            fontSize: '1rem',
                        }}
                    >
                        {message}
                    </Typography>


                    <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mt: 1 }}
                    >
                        פעולה זו עשויה להימשך מספר שניות...
                    </Typography>

                </Paper>
            </Backdrop>


            <Snackbar
                open={toastOpen}
                onClose={() => {
                    setToastOpen(false);
                    setTimeout(() => {
                        setDisplayResult(null);
                        onResultShown?.();
                    }, 300);
                }}
                anchorOrigin={{
                    vertical: 'top',
                    horizontal: 'center',
                }}
            >
                <Alert
                    severity={displayResult === 'success' ? 'success' : 'error'}
                    variant="filled"
                    sx={{
                        fontWeight: 600,
                        fontSize: '1rem',
                        borderRadius: 3,
                    }}
                >
                    {resultMessage}
                </Alert>
            </Snackbar>
        </>
    );
}