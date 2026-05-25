import {
  Box, Heading, Text, Stack, HStack, Avatar, Button, Input, InputGroup, InputLeftElement,
  Card, CardBody, Spinner, Flex,
} from '@chakra-ui/react';
import { useEffect, useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { customersApi } from '@/lib/followups';

export default function Customers() {
  const [q, setQ]             = useState('');
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  // Simple debounce
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
    <Box maxW="md" mx="auto" px={4} pt={6} pb={20} minH="100vh">
      <HStack justify="space-between" mb={4}>
        <Button as={RouterLink} to="/" variant="ghost" size="sm">← Back</Button>
        <Heading size="md">Customers</Heading>
        <Box w="60px" />
      </HStack>

      <InputGroup mb={4}>
        <InputLeftElement pointerEvents="none" color="gray.400"><Text>🔍</Text></InputLeftElement>
        <Input
          placeholder="Search name or phone"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </InputGroup>

      {loading ? (
        <Flex justify="center" py={10}><Spinner color="brand.500" /></Flex>
      ) : error ? (
        <Card><CardBody><Text color="red.500" fontSize="sm">{error}</Text></CardBody></Card>
      ) : items.length === 0 ? (
        <Card rounded="2xl"><CardBody>
          <Text color="gray.600" fontSize="sm">
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
              shadow="sm"
              _hover={{ shadow: 'md', transform: 'translateY(-1px)' }}
              transition="all 0.15s"
            >
              <CardBody py={3}>
                <HStack>
                  <Avatar name={c.name} size="sm" bg="brand.500" color="white" />
                  <Box flex="1">
                    <Text fontWeight="semibold">{c.name}</Text>
                    <Text color="gray.500" fontSize="sm">
                      {c.phone}{c.area ? ` · ${c.area}` : ''}
                    </Text>
                  </Box>
                  <Text color="gray.400">›</Text>
                </HStack>
              </CardBody>
            </Card>
          ))}
        </Stack>
      )}
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
