import { extendTheme } from '@chakra-ui/react';

const theme = extendTheme({
  config: { initialColorMode: 'light', useSystemColorMode: false },
  colors: {
    brand: {
      50:  '#FFF0F5',
      100: '#FFD6E7',
      200: '#FFADD0',
      300: '#FF85B8',
      400: '#FF5C9F',
      500: '#E91E63',
      600: '#C4175A',
      700: '#9C0F49',
      800: '#740A37',
      900: '#4D0525',
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
        bg: '#FFF5F8',
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
