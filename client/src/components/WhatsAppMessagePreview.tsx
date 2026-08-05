import { Box, Typography } from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

type Props = {
  header: string;
  body: string;
  buttonLabel?: string;
  image?: string;
  maxBubbleWidth?: number;
  footerText?: string;
  onButtonClick?: () => void;
};

export default function WhatsAppMessagePreview({
  header,
  body,
  buttonLabel,
  image,
  maxBubbleWidth = 320,
  footerText = '* לתצוגה בלבד - הנתונים יוחלפו אוטומטית בפועל',
  onButtonClick,
}: Props) {
  return (
    <Box
      sx={{
        mt: 1,
        p: 1.5,
        borderRadius: 2.5,
        background: 'linear-gradient(160deg, #E5DDD5, #EDE5DA)',
        border: '1px solid rgba(0,0,0,0.06)',
      }}
    >
      <Box
        sx={{
          maxWidth: maxBubbleWidth,
          mx: 'auto',
          background: '#fff',
          borderRadius: '10px',
          borderTopRightRadius: 0,
          boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
          overflow: 'hidden',
          position: 'relative',
          '&::after': {
            content: '""',
            position: 'absolute',
            top: 0,
            right: -8,
            width: 0,
            height: 0,
            borderStyle: 'solid',
            borderWidth: '0 0 10px 10px',
            borderColor: 'transparent transparent transparent #fff',
          },
        }}
      >
        <Box sx={{ p: 1.5, pb: 1 }}>
          {image === 'none' ? null : image ? (
            <Box
              component="img"
              src={image}
              alt="Invitation"
              sx={{
                width: '100%',
                maxHeight: 380,
                objectFit: 'cover',
                display: 'block',
                borderRadius: 1.5,
                mb: 1.2,
                border: '1px solid rgba(0,0,0,0.08)',
              }}
            />
          ) : (
            <Box
              sx={{
                mb: 1.2,
                height: 180,
                borderRadius: 1.5,
                border: '1px dashed rgba(0,0,0,.18)',
                bgcolor: '#F7F7F7',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                color: '#777',
              }}
            >
              <UploadFileIcon sx={{ fontSize: 42, mb: 1, opacity: 0.7 }} />
              <Typography fontSize="0.8rem" fontWeight={600}>
                תמונת ההזמנה
              </Typography>
              <Typography variant="caption">
                תוצג כאן לאחר העלאה
              </Typography>
            </Box>
          )}

          <Typography sx={{ fontWeight: 700, fontSize: '0.88rem', color: '#111B21', mb: 0.75 }}>
            {header}
          </Typography>
          <Typography sx={{ whiteSpace: 'pre-line', fontSize: '0.83rem', color: '#111B21', lineHeight: 1.5 }}>
            {body}
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
            <Typography variant="caption" sx={{ color: '#667781', fontSize: '0.66rem', display: 'flex', alignItems: 'center', gap: 0.3 }}>
              12:00
              <CheckCircleIcon sx={{ fontSize: 12, color: '#53BDEB' }} />
            </Typography>
            <Typography variant="caption" sx={{ color: '#667781', fontSize: '0.66rem' }}>
              WedFlow
            </Typography>
          </Box>
        </Box>

        {buttonLabel && (
          <Box
            role={onButtonClick ? 'button' : undefined}
            onClick={onButtonClick}
            sx={{
              borderTop: '1px solid rgba(0,0,0,0.08)',
              textAlign: 'center',
              py: 1,
              color: '#00A5F4',
              fontWeight: 600,
              fontSize: '0.83rem',
              cursor: onButtonClick ? 'pointer' : 'default',
              transition: 'background-color 0.2s ease, color 0.2s ease',
              '&:hover': onButtonClick
                ? {
                  backgroundColor: 'rgba(0,165,244,0.08)',
                  color: '#0087CA',
                }
                : undefined,
            }}
          >
            {buttonLabel}
          </Box>
        )}
      </Box>

      <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', color: '#5a5959', mt: 1 }}>
        {footerText}
      </Typography>
    </Box>
  );
}