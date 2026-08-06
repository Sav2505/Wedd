import { Box, Container, Link, Paper, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import PublicFooter from '../../components/PublicFooter';

export type LegalSection = {
  heading: string;
  paragraphs: string[];
};

type Props = {
  title: string;
  subtitle: string;
  sections: LegalSection[];
};

export default function LegalPageLayout({ title, subtitle, sections }: Props) {
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
      <Container maxWidth="md" sx={{ pt: { xs: 5, sm: 7 }, pb: { xs: 2, sm: 3 } }}>
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
            p: { xs: 2.25, sm: 4 },
            borderRadius: 3,
            background: 'rgba(255,255,255,0.9)',
            border: '1px solid rgba(201,168,76,0.24)',
          }}
        >
          <Typography
            variant="h4"
            align="center"
            sx={{
              fontFamily: "'Frank Ruhl Libre', serif",
              color: '#2C1810',
              mb: 1,
            }}
          >
            {title}
          </Typography>
          <Typography
            align="center"
            sx={{ color: '#6F5547', maxWidth: 680, mx: 'auto', mb: 3, lineHeight: 1.75 }}
          >
            {subtitle}
          </Typography>

          <Stack spacing={2.4}>
            {sections.map((section) => (
              <Box key={section.heading}>
                <Typography
                  variant="h6"
                  sx={{
                    fontFamily: "'Frank Ruhl Libre', serif",
                    fontWeight: 700,
                    fontSize: '1.08rem',
                    color: '#4D382A',
                    mb: 0.65,
                  }}
                >
                  {section.heading}
                </Typography>
                {section.paragraphs.map((paragraph, index) => (
                  <Typography key={index} sx={{ color: '#5C3D2E', lineHeight: 1.86, mb: 0.85 }}>
                    {paragraph}
                  </Typography>
                ))}
              </Box>
            ))}
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
