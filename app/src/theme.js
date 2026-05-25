import { extendTheme } from '@chakra-ui/react';

// QueenKitty palette: warm, friendly, WhatsApp-ish accents.
const theme = extendTheme({
  config: { initialColorMode: 'light', useSystemColorMode: false },
  colors: {
    brand: {
      50:  '#FFE5EE',
      100: '#FFB8CF',
      200: '#FF8AAF',
      300: '#FF5C8F',
      400: '#FF2E70',
      500: '#E91E63', // primary
      600: '#B8174E',
      700: '#86113A',
      800: '#550B25',
      900: '#260411',
    },
    whatsapp: {
      500: '#25D366',
      600: '#1EBE5D',
    },
  },
  fonts: {
    heading: `'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif`,
    body:    `'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif`,
  },
  styles: {
    global: {
      'html, body, #root': {
        height: '100%',
        bg: 'gray.50',
      },
    },
  },
  components: {
    Button: { defaultProps: { colorScheme: 'brand' } },
  },
});

export default theme;
