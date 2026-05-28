import { createTheme, ThemeOptions } from '@mui/material/styles';

const palette = {
  primary: {
    main:        '#C9A84C',
    light:       '#E0C97A',
    dark:        '#9A7833',
    contrastText:'#FFFFFF',
  },
  secondary: {
    main:        '#5C3D2E',
    light:       '#8B6650',
    dark:        '#2C1810',
    contrastText:'#FAF7F2',
  },
  background: {
    default: '#FAF7F2',
    paper:   '#FFFFFF',
  },
  text: {
    primary:   '#2C1810',
    secondary: '#5C3D2E',
    disabled:  '#A08070',
  },
  error: {
    main: '#B94040',
  },
  divider: 'rgba(201,168,76,0.2)',
};

const themeOptions: ThemeOptions = {
  direction: 'rtl',
  palette,
  typography: {
    fontFamily: "'Heebo', sans-serif",
    h1: { fontFamily: "'Frank Ruhl Libre', serif", fontWeight: 700 },
    h2: { fontFamily: "'Frank Ruhl Libre', serif", fontWeight: 700 },
    h3: { fontFamily: "'Frank Ruhl Libre', serif", fontWeight: 700 },
    h4: { fontFamily: "'Frank Ruhl Libre', serif", fontWeight: 500 },
    h5: { fontFamily: "'Frank Ruhl Libre', serif", fontWeight: 500 },
    h6: { fontFamily: "'Frank Ruhl Libre', serif", fontWeight: 500 },
    button: { fontFamily: "'Heebo', sans-serif", fontWeight: 600, letterSpacing: 0.5 },
  },
  shape: { borderRadius: 16 },
  shadows: [
    'none',
    '0 2px 8px rgba(44,24,16,0.06)',
    '0 4px 16px rgba(44,24,16,0.08)',
    '0 6px 24px rgba(44,24,16,0.10)',
    '0 8px 32px rgba(44,24,16,0.12)',
    '0 10px 40px rgba(44,24,16,0.14)',
    ...Array(19).fill('none'),
  ] as ThemeOptions['shadows'],
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 50,
          textTransform: 'none',
          fontSize: '1rem',
          padding: '10px 32px',
          transition: 'all 0.25s ease',
          '&:hover': { transform: 'translateY(-1px)' },
          '&:active': { transform: 'translateY(0)' },
        },
        containedPrimary: {
          background: 'linear-gradient(135deg, #E0C97A 0%, #C9A84C 50%, #9A7833 100%)',
          boxShadow: '0 4px 16px rgba(201,168,76,0.35)',
          '&:hover': {
            background: 'linear-gradient(135deg, #E8D48C 0%, #D4B25A 50%, #A88040 100%)',
            boxShadow: '0 6px 20px rgba(201,168,76,0.45)',
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 12,
            background: 'rgba(255,255,255,0.7)',
            '& fieldset': { borderColor: 'rgba(201,168,76,0.35)' },
            '&:hover fieldset': { borderColor: '#C9A84C' },
            '&.Mui-focused fieldset': {
              borderColor: '#C9A84C',
              borderWidth: 2,
            },
          },
          '& .MuiInputLabel-root.Mui-focused': { color: '#C9A84C' },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 24,
          boxShadow: '0 8px 40px rgba(44,24,16,0.12)',
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          fontFamily: "'Heebo', sans-serif",
          fontWeight: 500,
          textTransform: 'none',
          fontSize: '0.95rem',
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: {
          backgroundColor: '#C9A84C',
          height: 3,
          borderRadius: 3,
        },
      },
    },
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          fontFamily: "'Heebo', sans-serif",
          backgroundColor: '#FAF7F2',
        },
      },
    },
  },
};

export const theme = createTheme(themeOptions);
