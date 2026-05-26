import { Box, HStack, Text, VStack, Avatar } from '@chakra-ui/react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

/* ── Inline SVG icon components ── */
function IconHome({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  );
}
function IconUsers({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
    </svg>
  );
}
function IconWallet({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
      <line x1="1" y1="10" x2="23" y2="10"/>
    </svg>
  );
}
function IconRefresh({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10"/>
      <polyline points="1 20 1 14 7 14"/>
      <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
    </svg>
  );
}
function IconSettings({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
    </svg>
  );
}

const NAV = [
  { to: '/',          label: 'Today',     Icon: IconHome },
  { to: '/customers', label: 'Customers', Icon: IconUsers },
  { to: '/payments',  label: 'Payments',  Icon: IconWallet },
  { to: '/repeats',   label: 'Repeats',   Icon: IconRefresh },
  { to: '/settings',  label: 'Settings',  Icon: IconSettings },
];

export function AppLayout({ children }) {
  const { pathname } = useLocation();
  const { user, logout } = useAuth();

  const isActive = (to) =>
    to === '/' ? pathname === '/' : pathname.startsWith(to);

  return (
    <Box minH="100vh" bg="#FFF5F8">

      {/* ── Tablet / Desktop Sidebar ── */}
      <Box
        display={{ base: 'none', md: 'flex' }}
        flexDir="column"
        position="fixed"
        left={0} top={0}
        h="100vh" w="220px"
        bgGradient="linear(180deg, #E91E63 0%, #C4175A 100%)"
        zIndex={200}
        py={6}
        shadow="xl"
      >
        {/* Brand */}
        <Box px={6} mb={8}>
          <HStack spacing={2} align="center">
            <Text fontSize="xl" lineHeight="1">👑</Text>
            <Text
              fontSize="lg"
              fontWeight="700"
              color="white"
              fontFamily="heading"
              letterSpacing="tight"
              lineHeight="1"
            >
              QueenKitty
            </Text>
          </HStack>
          <Text fontSize="xs" color="whiteAlpha.700" mt={2} noOfLines={1}>
            Hi, {user?.name?.split(' ')[0]} 👋
          </Text>
        </Box>

        {/* Nav items */}
        <VStack spacing={1} align="stretch" flex={1} px={3} overflowY="auto">
          {NAV.map(({ to, label, Icon }) => {
            const active = isActive(to);
            return (
              <Box
                key={to}
                as={Link}
                to={to}
                px={4}
                py={3}
                rounded="xl"
                bg={active ? 'whiteAlpha.200' : 'transparent'}
                color="white"
                _hover={{ bg: 'whiteAlpha.150', textDecoration: 'none' }}
                transition="background 0.15s"
              >
                <HStack spacing={3}>
                  <Box opacity={active ? 1 : 0.75} flexShrink={0}>
                    <Icon size={18} />
                  </Box>
                  <Text
                    fontSize="sm"
                    fontWeight={active ? '600' : '500'}
                    lineHeight="1"
                  >
                    {label}
                  </Text>
                </HStack>
              </Box>
            );
          })}
        </VStack>

        {/* User footer */}
        <Box px={6} pt={4} borderTop="1px solid" borderColor="whiteAlpha.200">
          <HStack spacing={2} mb={2}>
            <Avatar name={user?.name} size="xs" bg="whiteAlpha.300" color="white" />
            <Text fontSize="xs" color="whiteAlpha.800" noOfLines={1} flex={1}>
              {user?.name}
            </Text>
          </HStack>
          <Text
            fontSize="xs"
            color="whiteAlpha.600"
            cursor="pointer"
            onClick={logout}
            _hover={{ color: 'whiteAlpha.900' }}
            transition="color 0.15s"
          >
            Log out →
          </Text>
        </Box>
      </Box>

      {/* ── Main Content ── */}
      <Box
        ml={{ base: 0, md: '220px' }}
        pb={{ base: '72px', md: 0 }}
        minH="100vh"
      >
        <Box
          maxW={{ base: '100%', md: '2xl' }}
          mx={{ base: 0, md: 'auto' }}
        >
          {children}
        </Box>
      </Box>

      {/* ── Mobile Bottom Nav ── */}
      <Box
        display={{ base: 'flex', md: 'none' }}
        position="fixed"
        bottom={0} left={0} right={0}
        h="64px"
        bg="white"
        borderTop="1px solid"
        borderColor="gray.100"
        shadow="0 -4px 24px rgba(233,30,99,0.08)"
        zIndex={200}
        alignItems="stretch"
        sx={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        {NAV.map(({ to, label, Icon }) => {
          const active = isActive(to);
          return (
            <Box
              key={to}
              as={Link}
              to={to}
              flex={1}
              display="flex"
              flexDir="column"
              alignItems="center"
              justifyContent="center"
              gap="3px"
              color={active ? 'brand.500' : 'gray.400'}
              _hover={{ color: 'brand.400', textDecoration: 'none' }}
              transition="color 0.15s"
              position="relative"
            >
              {active && (
                <Box
                  position="absolute"
                  top={0}
                  left="25%" right="25%"
                  h="2px"
                  bgGradient="linear(90deg, brand.400, brand.600)"
                  rounded="full"
                />
              )}
              <Icon size={20} />
              <Text
                fontSize="9px"
                fontWeight={active ? '700' : '500'}
                lineHeight="1"
                letterSpacing="0.5px"
                textTransform="uppercase"
              >
                {label}
              </Text>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
