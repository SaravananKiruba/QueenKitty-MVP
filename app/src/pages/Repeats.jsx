import {
  Box, Heading, Text, Stack, HStack, Avatar, Button, IconButton, Spinner, Flex,
  Tabs, TabList, TabPanels, Tab, TabPanel, Badge, Card, CardBody,
  Menu, MenuButton, MenuList, MenuItem,
} from '@chakra-ui/react';
import { useCallback, useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { repeatsApi, whatsappLink, telLink } from '@/lib/followups';

const SCOPES = [
  { key: 'due',      label: 'Due now' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'all',      label: 'All' },
];

const CATEGORY_LABEL = {
  kitchen: 'Kitchen', bottle: 'Water bottle', storage: 'Storage', other: 'Other',
};

export default function Repeats() {
  const [scope, setScope]   = useState('due');
  const [items, setItems]   = useState([]);
  const [counts, setCounts] = useState({ due: 0, upcoming: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  const load = useCallback(async (next = scope) => {
    setLoading(true); setError(null);
    try {
      const data = await repeatsApi.list(next);
      setItems(data.repeats || []);
      setCounts(data.counts || { due: 0, upcoming: 0 });
    } catch (err) {
      setError(err.message || 'Could not load reminders');
    } finally {
      setLoading(false);
    }
  }, [scope]);

  useEffect(() => { load(scope); }, [scope, load]);

  const scopeIndex = SCOPES.findIndex((s) => s.key === scope);

  return (
    <Box minH={{ md: '100vh' }}>
      {/* Gradient header */}
      <Box
        bgGradient="linear(135deg, #E91E63 0%, #FF6B9D 100%)"
        px={5} pt={{ base: 7, md: 8 }} pb={16}
      >
        <HStack justify="space-between" align="start">
          <Box>
            <Heading size="lg" color="white" fontFamily="heading">Repeat Orders</Heading>
            <Text fontSize="sm" color="whiteAlpha.800" mt={0.5}>Re-engage customers on time</Text>
          </Box>
          <Button
            as={RouterLink}
            to="/settings"
            size="xs"
            bg="whiteAlpha.200"
            color="white"
            _hover={{ bg: 'whiteAlpha.300' }}
            rounded="lg"
          >
            Settings
          </Button>
        </HStack>
      </Box>

      {/* Content lifts over gradient */}
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
        <Tabs
          index={scopeIndex >= 0 ? scopeIndex : 0}
          onChange={(i) => setScope(SCOPES[i].key)}
          variant="soft-rounded"
          colorScheme="brand"
          isLazy
        >
          <TabList overflowX="auto" pb={2} sx={{ scrollbarWidth: 'none' }}>
            {SCOPES.map((s) => (
              <Tab key={s.key} flexShrink={0} fontSize="sm" fontWeight="500">
                {s.label}
                {(s.key === 'due' || s.key === 'upcoming') && counts[s.key] > 0 && (
                  <Badge ml={2} colorScheme={s.key === 'due' ? 'red' : 'brand'} rounded="full" fontSize="10px">
                    {counts[s.key]}
                  </Badge>
                )}
              </Tab>
            ))}
          </TabList>

          <TabPanels>
            {SCOPES.map((s) => (
              <TabPanel key={s.key} px={0} pt={3}>
                {loading ? (
                  <Flex justify="center" py={10}><Spinner color="brand.500" /></Flex>
                ) : error ? (
                  <Card><CardBody><Text color="red.500" fontSize="sm">{error}</Text></CardBody></Card>
                ) : items.length === 0 ? (
                  <EmptyState scope={s.key} />
                ) : (
                  <Stack spacing={3}>
                    {items.map((r) => (
                      <RepeatCard key={r.id} item={r} onChanged={() => load(scope)} />
                    ))}
                  </Stack>
                )}
              </TabPanel>
            ))}
          </TabPanels>
        </Tabs>
      </Box>
    </Box>
  );
}

function RepeatCard({ item, onChanged }) {
  const overdue = item.next_repeat_date <= new Date().toISOString().slice(0, 10);
  const days    = Number(item.days_since_order || 0);

  const waMessage =
    `Hi ${item.customer_name}, hope you're doing well! It's been ${days} days since you bought the ${item.product_name}. ` +
    `Would you like to reorder?`;

  const snooze = async (n) => { await repeatsApi.snooze(item.id, n); onChanged?.(); };
  const dismiss = async () => {
    if (!window.confirm('Stop reminding for this product?')) return;
    await repeatsApi.dismiss(item.id);
    onChanged?.();
  };

  return (
    <Card rounded="2xl" shadow="sm" borderWidth={overdue ? '1px' : 0} borderColor="red.200">
      <CardBody>
        <Stack spacing={3}>
          <HStack justify="space-between" align="start">
            <HStack align="start">
              <Avatar name={item.customer_name} size="sm" bg="brand.500" color="white" />
              <Box>
                <Text fontWeight="bold" lineHeight="short">
                  <RouterLink to={`/customers/${item.customer_id}`}>
                    Contact {item.customer_name}
                  </RouterLink>
                </Text>
                <Text fontSize="sm" color="gray.700">
                  Last order {days}d ago · {item.product_name}
                </Text>
                <HStack mt={1} spacing={2}>
                  <Badge colorScheme={overdue ? 'red' : 'brand'} rounded="full">
                    {overdue ? 'Due' : `Due ${item.next_repeat_date}`}
                  </Badge>
                  <Badge variant="subtle" rounded="full">
                    {CATEGORY_LABEL[item.product_category] || item.product_category}
                  </Badge>
                </HStack>
              </Box>
            </HStack>

            <Menu>
              <MenuButton as={IconButton} variant="ghost" size="sm" aria-label="More"
                icon={<Text fontSize="lg" lineHeight="1">⋮</Text>} />
              <MenuList>
                <MenuItem onClick={() => snooze(7)}>Snooze 1 week</MenuItem>
                <MenuItem onClick={() => snooze(14)}>Snooze 2 weeks</MenuItem>
                <MenuItem onClick={() => snooze(30)}>Snooze 1 month</MenuItem>
                <MenuItem color="red.500" onClick={dismiss}>Stop reminding</MenuItem>
              </MenuList>
            </Menu>
          </HStack>

          <HStack spacing={2}>
            <Button
              as="a"
              href={whatsappLink(item.customer_phone, waMessage)}
              target="_blank"
              rel="noopener noreferrer"
              colorScheme="whatsapp"
              size="sm"
              flex="1"
            >
              WhatsApp
            </Button>
            <Button as="a" href={telLink(item.customer_phone)} variant="outline" size="sm" flex="1">
              Call
            </Button>
            <Button
              as={RouterLink}
              to={`/customers/${item.customer_id}`}
              colorScheme="brand"
              size="sm"
              flex="1"
            >
              Open
            </Button>
          </HStack>
        </Stack>
      </CardBody>
    </Card>
  );
}

function EmptyState({ scope }) {
  const copy = {
    due:      { title: 'No reminders due', body: 'You\'re all caught up. New repeat reminders show up here.' },
    upcoming: { title: 'No upcoming reminders', body: 'When orders age past your cadence, they appear here.' },
    all:      { title: 'No repeat reminders yet', body: 'Record an order with a category to start the cycle.' },
  }[scope] || { title: 'Nothing here', body: '' };

  return (
    <Card rounded="2xl">
      <CardBody>
        <Stack spacing={2}>
          <Heading size="sm">{copy.title}</Heading>
          <Text color="gray.600" fontSize="sm">{copy.body}</Text>
        </Stack>
      </CardBody>
    </Card>
  );
}
