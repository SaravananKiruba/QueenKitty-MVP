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
    <Box minH={{ md: '100vh' }}>
      {/* Gradient header */}
      <Box
        bgGradient="linear(135deg, #E91E63 0%, #FF6B9D 100%)"
        px={5} pt={{ base: 7, md: 8 }} pb={16}
      >
        <Heading size="lg" color="white" fontFamily="heading">Payments</Heading>
        {summary && summary.pending_count > 0 ? (
          <Text fontSize="sm" color="whiteAlpha.800" mt={0.5}>
            ₹{formatMoney(summary.total_pending)} pending · {summary.pending_count} order(s)
          </Text>
        ) : (
          <Text fontSize="sm" color="whiteAlpha.800" mt={0.5}>Track and collect payments</Text>
        )}
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
        {summary && summary.pending_count > 0 && (
          <Card rounded="2xl" bg="red.50" mb={4} borderColor="red.100" borderWidth="1px" shadow="none">
            <CardBody py={3}>
              <HStack justify="space-between">
                <Box>
                  <Text fontSize="xs" color="red.700" fontWeight="600" textTransform="uppercase" letterSpacing="wider">
                    Total Pending
                  </Text>
                  <Heading size="md" color="red.600">₹{formatMoney(summary.total_pending)}</Heading>
                </Box>
                <Box textAlign="right">
                  <Text fontSize="sm" color="red.600" fontWeight="500">{summary.pending_count} order(s)</Text>
                  {summary.due_today_count > 0 && (
                    <Badge colorScheme="red" mt={1} rounded="full">{summary.due_today_count} due today</Badge>
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
              <Tab key={s.key} flexShrink={0} fontSize="sm" fontWeight="500">{s.label}</Tab>
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
                    <Text color="gray.500" fontSize="sm">
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
      </Box>

      <IconButton
        aria-label="Add order"
        icon={<Text fontSize="2xl" lineHeight="1" fontWeight="bold" color="white">+</Text>}
        position="fixed"
        bottom={{ base: '80px', md: '32px' }}
        right={{ base: 5, md: 5 }}
        size="lg"
        rounded="full"
        bgGradient="linear(135deg, brand.500, brand.400)"
        shadow="0 4px 20px rgba(233,30,99,0.45)"
        h="60px" w="60px"
        _hover={{ shadow: '0 6px 24px rgba(233,30,99,0.55)', transform: 'scale(1.06)', bgGradient: 'linear(135deg, brand.600, brand.500)' }}
        _active={{ transform: 'scale(0.97)' }}
        transition="all 0.2s"
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
