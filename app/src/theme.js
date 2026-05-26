import { extendTheme } from '@chakra-ui/react';

const theme = extendTheme({
  config: { initialColorMode: 'light', useSystemColorMode: false },
  colors: {
    brand: {
      50:  '#F5F0FF',
      100: '#EDE0FF',
      200: '#D4BBFF',
      300: '#B38FFF',
      400: '#9B59E8',
      500: '#7C3AED',
      600: '#6B21A8',
      700: '#581C8E',
      800: '#431574',
      900: '#2E0F52',
    },
    gold: {
      400: '#FBBF24',
      500: '#F59E0B',
      600: '#D97706',
    },
    whatsapp: {
      50:  '#EDFDF4',
      500: '#25D366',
      600: '#1EBE5D',
    },
  },
  fonts: {
    heading: `'Poppins', 'Inter', system-ui, -apple-system, sans-serif`,
    body:    `'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif`,
  },
  styles: {
    global: {
      'html, body, #root': {
        height: '100%',
        bg: '#F5F0FF',
      },
    },
  },
  components: {
    Button: {
      defaultProps: { colorScheme: 'brand' },
      variants: {
        solid: (props) => {
          if (props.colorScheme === 'brand') {
            return {
              bgGradient: 'linear(135deg, brand.500, brand.400)',
              color: 'white',
              _hover: {
                bgGradient: 'linear(135deg, brand.600, brand.500)',
                transform: 'translateY(-1px)',
                shadow: 'md',
                _disabled: { bgGradient: 'linear(135deg, brand.500, brand.400)', transform: 'none' },
              },
              _active: {
                bgGradient: 'linear(135deg, brand.700, brand.600)',
                transform: 'translateY(0)',
              },
            };
          }
          return {};
        },
      },
    },
    Card: {
      baseStyle: {
        container: {
          bg: 'white',
          shadow: '0 2px 12px rgba(0,0,0,0.06)',
          borderRadius: '16px',
          overflow: 'hidden',
        },
      },
    },
    Input: {
      variants: {
        outline: {
          field: {
            bg: 'white',
            borderColor: 'gray.200',
            _focus: {
              borderColor: 'brand.400',
              shadow: '0 0 0 1px var(--chakra-colors-brand-400)',
            },
          },
        },
      },
    },
  },
});

export default theme;
