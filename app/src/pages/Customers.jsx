import {
  Box, Heading, Text, Stack, HStack, Avatar, Input, InputGroup, InputLeftElement,
  Card, CardBody, Spinner, Flex,
} from '@chakra-ui/react';
import { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { customersApi } from '@/lib/followups';

export default function Customers() {
  const [q, setQ]             = useState('');
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  const debouncedQ = useDebounced(q, 250);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    customersApi.list(debouncedQ)
      .then((data) => { if (!cancelled) setItems(data.customers || []); })
      .catch((err) => { if (!cancelled) setError(err.message || 'Could not load'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [debouncedQ]);

  return (
    <Box minH={{ md: '100vh' }}>
      {/* Gradient header */}
      <Box
        bgGradient="linear(135deg, #E91E63 0%, #FF6B9D 100%)"
        px={5} pt={{ base: 7, md: 8 }} pb={16}
      >
        <Heading size="lg" color="white" fontFamily="heading">Customers</Heading>
        <Text fontSize="sm" color="whiteAlpha.800" mt={0.5}>
          {items.length > 0 ? `${items.length} customer${items.length !== 1 ? 's' : ''}` : 'Your address book'}
        </Text>
      </Box>

      {/* Search + list card pulls up */}
      <Box
        bg="#FFF5F8"
        borderTopLeftRadius="28px"
        borderTopRightRadius="28px"
        mt="-14px"
        pt={4}
        px={4}
        pb={6}
        minH="60vh"
      >
        <InputGroup mb={4}>
          <InputLeftElement pointerEvents="none" color="gray.400">
            <Text fontSize="sm">🔍</Text>
          </InputLeftElement>
          <Input
            bg="white"
            placeholder="Search name or phone"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            rounded="xl"
            border="none"
            shadow="0 2px 8px rgba(0,0,0,0.06)"
            _focus={{ shadow: '0 0 0 2px var(--chakra-colors-brand-300)' }}
          />
        </InputGroup>

        {loading ? (
          <Flex justify="center" py={10}><Spinner color="brand.500" /></Flex>
        ) : error ? (
          <Card><CardBody><Text color="red.500" fontSize="sm">{error}</Text></CardBody></Card>
        ) : items.length === 0 ? (
          <Card rounded="2xl"><CardBody>
            <Text color="gray.500" fontSize="sm">
              {q ? 'No customers match that search.' : 'No customers yet. Add a follow-up to create one.'}
            </Text>
          </CardBody></Card>
        ) : (
          <Stack spacing={2}>
            {items.map((c) => (
              <Card
                key={c.id}
                as={RouterLink}
                to={`/customers/${c.id}`}
                rounded="xl"
                _hover={{ shadow: '0 4px 20px rgba(233,30,99,0.12)', transform: 'translateY(-1px)', textDecoration: 'none' }}
                transition="all 0.15s"
              >
                <CardBody py={3} px={4}>
                  <HStack>
                    <Avatar name={c.name} size="sm" bg="brand.500" color="white" />
                    <Box flex="1">
                      <Text fontWeight="600" color="gray.800">{c.name}</Text>
                      <Text color="gray.500" fontSize="sm">
                        {c.phone}{c.area ? ` · ${c.area}` : ''}
                      </Text>
                    </Box>
                    <Text color="gray.300" fontSize="lg">›</Text>
                  </HStack>
                </CardBody>
              </Card>
            ))}
          </Stack>
        )}
      </Box>
    </Box>
  );
}

function useDebounced(value, ms) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}
