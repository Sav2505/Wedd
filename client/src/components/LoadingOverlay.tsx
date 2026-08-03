import { useEffect, useState } from 'react';
import {
    Backdrop,
    CircularProgress,
    Paper,
    Typography,
    Snackbar,
    Alert,
    Box,
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
                    backdropFilter: 'blur(10px)',
                    background: 'rgba(253, 251, 244, 0.40)', // Warm romantic touch
                }}
            >
                <Paper
                    elevation={0}
                    sx={{
                        px: 5,
                        py: 5,
                        borderRadius: 6,
                        textAlign: 'center',
                        minWidth: 320,
                        border: '1px solid rgba(201,168,76,0.3)',
                        background: 'linear-gradient(135deg, rgba(255,255,255,0.92) 0%, rgba(255, 252, 245, 0.96) 100%)',
                        boxShadow: '0 16px 40px rgba(154,120,51,0.15), inset 0 1px 0 rgba(255,255,255,0.8)',
                    }}
                >
                    <Box sx={{ position: 'relative', display: 'inline-flex', mb: 3 }}>
                        <CircularProgress
                            size={56}
                            thickness={3.6}
                            sx={{
                                color: '#C9A84C',
                            }}
                        />
                        <Box
                            sx={{
                                top: 0,
                                left: 0,
                                bottom: 0,
                                right: 0,
                                position: 'absolute',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <Typography sx={{ fontSize: '1.25rem', userSelect: 'none' }}>✨</Typography>
                        </Box>
                    </Box>

                    <Typography
                        sx={{
                            fontWeight: 700,
                            fontSize: '1.15rem',
                            color: '#2C1810',
                            fontFamily: "'Frank Ruhl Libre', serif",
                            letterSpacing: '0.01em',
                        }}
                    >
                        {message}
                    </Typography>

                    <Typography
                        variant="body2"
                        sx={{
                            mt: 1.2,
                            color: '#A08070',
                            fontWeight: 400,
                            letterSpacing: '0.02em',
                        }}
                    >
                        כמה רגעים והכל מוכן...
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