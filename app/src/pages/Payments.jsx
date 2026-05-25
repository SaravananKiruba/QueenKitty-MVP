import {
  Box, Heading, Text, Stack, HStack, Avatar, Button, IconButton, Spinner, Flex,
  Tabs, TabList, TabPanels, Tab, TabPanel, Badge, useDisclosure, Card, CardBody,
  Menu, MenuButton, MenuList, MenuItem,
} from '@chakra-ui/react';
import { useCallback, useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { ordersApi, formatMoney, whatsappLink, telLink } from '@/lib/followups';
import AddOrderSheet from '@/components/AddOrderSheet';
import RecordPaymentModal from '@/components/RecordPaymentModal';

const SCOPES = [
  { key: 'due_today', label: 'Due today' },
  { key: 'pending',   label: 'All pending' },
  { key: 'all',       label: 'All orders' },
];

export default function Payments() {
  const [scope, setScope]       = useState('due_today');
  const [items, setItems]       = useState([]);
  const [summary, setSummary]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);

  const addSheet = useDisclosure();
  const [paymentTarget, setPaymentTarget] = useState(null);

  const load = useCallback(async (next = scope) => {
    setLoading(true); setError(null);
    try {
      const data = await ordersApi.list(next);
      setItems(data.orders || []);
      setSummary(data.summary || null);
    } catch (err) {
      setError(err.message || 'Could not load orders');
    } finally {
      setLoading(false);
    }
  }, [scope]);

  useEffect(() => { load(scope); }, [scope, load]);

  const onChanged = () => load(scope);

  const scopeIndex = SCOPES.findIndex((s) => s.key === scope);

  return (
    <Box maxW="md" mx="auto" px={4} pt={6} pb={28} minH="100vh">
      <HStack justify="space-between" mb={4}>
        <Button as={RouterLink} to="/" variant="ghost" size="sm">← Back</Button>
        <Heading size="md">Payments</Heading>
        <Box w="60px" />
      </HStack>

      {summary && (summary.pending_count > 0) && (
        <Card rounded="2xl" bg="red.50" mb={4} borderColor="red.100" borderWidth="1px">
          <CardBody py={3}>
            <HStack justify="space-between">
              <Box>
                <Text fontSize="xs" color="red.700">PENDING</Text>
                <Heading size="md" color="red.700">₹{formatMoney(summary.total_pending)}</Heading>
              </Box>
              <Box textAlign="right">
                <Text fontSize="xs" color="red.700">{summary.pending_count} order(s)</Text>
                {summary.due_today_count > 0 && (
                  <Badge colorScheme="red" mt={1}>{summary.due_today_count} due today</Badge>
                )}
              </Box>
            </HStack>
          </CardBody>
        </Card>
      )}

      <Tabs
        index={scopeIndex >= 0 ? scopeIndex : 0}
        onChange={(i) => setScope(SCOPES[i].key)}
        variant="soft-rounded"
        colorScheme="brand"
        isLazy
      >
        <TabList overflowX="auto" overflowY="hidden" pb={2} sx={{ scrollbarWidth: 'none' }}>
          {SCOPES.map((s) => (
            <Tab key={s.key} flexShrink={0} fontSize="sm">{s.label}</Tab>
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
                <Card rounded="2xl"><CardBody>
                  <Text color="gray.600" fontSize="sm">
                    {s.key === 'due_today'
                      ? 'No pending payments due today. Nice!'
                      : s.key === 'pending'
                        ? 'No pending payments. All cleared.'
                        : 'No orders yet. Tap + to add one.'}
                  </Text>
                </CardBody></Card>
              ) : (
                <Stack spacing={3}>
                  {items.map((o) => (
                    <OrderCard
                      key={o.id}
                      order={o}
                      onPay={() => setPaymentTarget(o)}
                      onChanged={onChanged}
                    />
                  ))}
                </Stack>
              )}
            </TabPanel>
          ))}
        </TabPanels>
      </Tabs>

      <IconButton
        aria-label="Add order"
        icon={<Text fontSize="2xl" lineHeight="1" fontWeight="bold">+</Text>}
        position="fixed"
        bottom="6"
        right={{ base: 6, md: 'calc(50% - 200px)' }}
        size="lg"
        rounded="full"
        colorScheme="brand"
        shadow="lg"
        h="60px"
        w="60px"
        onClick={addSheet.onOpen}
      />

      <AddOrderSheet
        isOpen={addSheet.isOpen}
        onClose={addSheet.onClose}
        onCreated={() => load(scope)}
      />

      <RecordPaymentModal
        isOpen={!!paymentTarget}
        onClose={() => setPaymentTarget(null)}
        order={paymentTarget}
        onSaved={() => { setPaymentTarget(null); load(scope); }}
      />
    </Box>
  );
}

function OrderCard({ order, onPay, onChanged }) {
  const pending = Number(order.pending_amount || 0);
  const isPaid  = pending <= 0;
  const reminderOverdue = !isPaid && order.payment_reminder_date
    && order.payment_reminder_date < new Date().toISOString().slice(0, 10);

  const waMessage = `Hi ${order.customer_name}, gentle reminder — ₹${formatMoney(pending)} is pending for ${order.product_name}. Thank you!`;

  const remove = async () => {
    if (!window.confirm('Delete this order?')) return;
    await ordersApi.remove(order.id);
    onChanged?.();
  };

  const snooze = async (days) => {
    await ordersApi.snooze(order.id, days);
    onChanged?.();
  };

  return (
    <Card
      rounded="2xl"
      shadow="sm"
      borderWidth={reminderOverdue ? '1px' : 0}
      borderColor="red.200"
    >
      <CardBody>
        <Stack spacing={3}>
          <HStack justify="space-between" align="start">
            <HStack align="start">
              <Avatar name={order.customer_name} size="sm" bg="brand.500" color="white" />
              <Box>
                <Text fontWeight="bold" lineHeight="short">
                  <RouterLink to={`/customers/${order.customer_id}`}>
                    {order.customer_name}
                  </RouterLink>
                </Text>
                <Text color="gray.700" fontSize="sm">{order.product_name}</Text>
                <HStack mt={1} spacing={2}>
                  <Badge colorScheme={isPaid ? 'green' : 'red'} rounded="full">
                    {isPaid ? 'Paid' : `₹${formatMoney(pending)} pending`}
                  </Badge>
                  {!isPaid && order.payment_reminder_date && (
                    <Text fontSize="xs" color={reminderOverdue ? 'red.500' : 'gray.500'}>
                      Remind {order.payment_reminder_date}
                    </Text>
                  )}
                </HStack>
              </Box>
            </HStack>

            <Menu>
              <MenuButton as={IconButton} variant="ghost" size="sm" aria-label="More"
                icon={<Text fontSize="lg" lineHeight="1">⋮</Text>} />
              <MenuList>
                {!isPaid && <MenuItem onClick={() => snooze(1)}>Snooze 1 day</MenuItem>}
                {!isPaid && <MenuItem onClick={() => snooze(3)}>Snooze 3 days</MenuItem>}
                {!isPaid && <MenuItem onClick={() => snooze(7)}>Snooze 1 week</MenuItem>}
                <MenuItem color="red.500" onClick={remove}>Delete order</MenuItem>
              </MenuList>
            </Menu>
          </HStack>

          <Text fontSize="xs" color="gray.500">
            ₹{formatMoney(order.paid_amount)} of ₹{formatMoney(order.amount)} paid · ordered {order.order_date}
          </Text>

          {!isPaid && (
            <HStack spacing={2}>
              <Button
                as="a"
                href={whatsappLink(order.customer_phone, waMessage)}
                target="_blank"
                rel="noopener noreferrer"
                colorScheme="whatsapp"
                size="sm"
                flex="1"
              >
                Remind
              </Button>
              <Button as="a" href={telLink(order.customer_phone)} variant="outline" size="sm" flex="1">
                Call
              </Button>
              <Button colorScheme="green" size="sm" flex="1" onClick={onPay}>
                Record ₹
              </Button>
            </HStack>
          )}
        </Stack>
      </CardBody>
    </Card>
  );
}
