import {
  Box, Heading, Text, Stack, HStack, Avatar, Button, IconButton, Spinner,
  Card, CardBody, Badge, Flex, useDisclosure, useToast,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton, ModalBody,
  ModalFooter, FormControl, FormLabel, Input, Textarea, Divider,
  Menu, MenuButton, MenuList, MenuItem,
} from '@chakra-ui/react';
import { useCallback, useEffect, useState } from 'react';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
import { customersApi, whatsappLink, telLink, formatMoney } from '@/lib/followups';
import AddFollowupSheet from '@/components/AddFollowupSheet';
import AddOrderSheet from '@/components/AddOrderSheet';

export default function CustomerProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [customer, setCustomer] = useState(null);
  const [events, setEvents]     = useState([]);
  const [stats, setStats]       = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);

  const addSheet  = useDisclosure();
  const orderSheet = useDisclosure();
  const editModal = useDisclosure();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await customersApi.timeline(id);
      setCustomer(data.customer);
      setEvents(data.events || []);
      setStats(data.stats || null);
    } catch (err) {
      setError(err.message || 'Could not load customer');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const remove = async () => {
    if (!window.confirm('Delete this customer and all their history?')) return;
    try {
      await customersApi.remove(id);
      toast({ status: 'success', title: 'Customer deleted', duration: 2000 });
      navigate('/customers');
    } catch (err) {
      toast({ status: 'error', title: err.message || 'Delete failed' });
    }
  };

  if (loading) {
    return <Flex justify="center" py={20}><Spinner color="brand.500" /></Flex>;
  }
  if (error || !customer) {
    return (
      <Box px={4} py={6}>
        <Button as={RouterLink} to="/customers" variant="ghost" mb={4}>← Customers</Button>
        <Card><CardBody><Text color="red.500">{error || 'Not found'}</Text></CardBody></Card>
      </Box>
    );
  }

  return (
    <Box minH={{ md: '100vh' }}>
      {/* Gradient header with customer info */}
      <Box
        bgGradient="linear(135deg, #E91E63 0%, #FF6B9D 100%)"
        px={5} pt={{ base: 6, md: 8 }} pb={20}
      >
        <HStack justify="space-between" mb={5}>
          <Button
            as={RouterLink}
            to="/customers"
            size="sm"
            bg="whiteAlpha.200"
            color="white"
            _hover={{ bg: 'whiteAlpha.300' }}
            rounded="lg"
          >
            ← Back
          </Button>
        <Menu>
          <MenuButton as={IconButton} variant="ghost" size="sm" aria-label="More"
            icon={<Text fontSize="lg" lineHeight="1">⋮</Text>} />
          <MenuList>
            <MenuItem onClick={editModal.onOpen}>Edit details</MenuItem>
            <MenuItem color="red.500" onClick={remove}>Delete customer</MenuItem>
          </MenuList>
        </Menu>
        </HStack>

        {/* Customer info in gradient */}
        <HStack spacing={3} align="start">
          <Avatar name={customer.name} bg="whiteAlpha.300" color="white" size="xl"
            border="3px solid" borderColor="whiteAlpha.400" />
          <Box flex="1">
            <Heading size="lg" color="white" fontFamily="heading">{customer.name}</Heading>
            <Text color="whiteAlpha.800" fontSize="sm">{customer.phone}</Text>
            {customer.area && <Text color="whiteAlpha.700" fontSize="sm">{customer.area}</Text>}
          </Box>
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
        pb={24}
        minH="60vh"
      >
        {/* Action buttons */}
        <Card rounded="2xl" mb={4}>
          <CardBody py={3}>
            <HStack spacing={2}>
              <Button
                as="a"
                href={whatsappLink(customer.phone)}
                target="_blank"
                rel="noopener noreferrer"
                colorScheme="whatsapp"
                size="sm"
                flex="1"
              >
                WhatsApp
              </Button>
              <Button as="a" href={telLink(customer.phone)} variant="outline" size="sm" flex="1">
                Call
              </Button>
              <Button colorScheme="brand" size="sm" flex="1" onClick={addSheet.onOpen}>
                + Follow-up
              </Button>
            </HStack>
            <Button mt={2} colorScheme="green" size="sm" w="full" onClick={orderSheet.onOpen}>
              + Record order
            </Button>
          </CardBody>
        </Card>

        {/* Stats */}
        {stats && (
          <HStack spacing={2} mb={4} overflowX="auto" sx={{ scrollbarWidth: 'none' }}>
            <StatPill label="Open" value={stats.open_followups} />
            <StatPill label="Done" value={stats.done_followups} />
            <StatPill label="Orders" value={stats.total_orders} />
            {stats.pending_total > 0 && (
              <StatPill label="Pending" value={`₹${formatMoney(stats.pending_total)}`} tone="red" />
            )}
          </HStack>
        )}

        {/* Timeline */}
        <Heading size="sm" mb={3} color="gray.600" fontWeight="600" textTransform="uppercase" letterSpacing="wider" fontSize="xs">
          Timeline
        </Heading>
        {events.length === 0 ? (
          <Card rounded="2xl">
            <CardBody>
              <Text color="gray.500" fontSize="sm">
                No history yet. Add a follow-up to start tracking.
              </Text>
            </CardBody>
          </Card>
        ) : (
          <Timeline events={events} />
        )}

        {customer.notes && (
          <>
            <Divider my={5} />
            <Heading size="sm" mb={2} color="gray.600" fontWeight="600" textTransform="uppercase" letterSpacing="wider" fontSize="xs">
              Notes
            </Heading>
            <Card rounded="2xl"><CardBody>
              <Text fontSize="sm" whiteSpace="pre-wrap">{customer.notes}</Text>
            </CardBody></Card>
          </>
        )}
      </Box>

      <AddFollowupSheet
        isOpen={addSheet.isOpen}
        onClose={addSheet.onClose}
        onCreated={load}
      />

      <AddOrderSheet
        isOpen={orderSheet.isOpen}
        onClose={orderSheet.onClose}
        customer={customer}
        onCreated={load}
      />

      <EditCustomerModal
        isOpen={editModal.isOpen}
        onClose={editModal.onClose}
        customer={customer}
        onSaved={(c) => { setCustomer(c); editModal.onClose(); }}
      />
    </Box>
  );
}

function StatPill({ label, value, tone = 'gray' }) {
  return (
    <Box
      rounded="2xl"
      px={4}
      py={2}
      bg={tone === 'red' ? 'red.50' : 'brand.50'}
      color={tone === 'red' ? 'red.700' : 'brand.700'}
      flexShrink={0}
      border="1px solid"
      borderColor={tone === 'red' ? 'red.100' : 'brand.100'}
    >
      <Text fontSize="9px" fontWeight="600" textTransform="uppercase" letterSpacing="wider"
        color={tone === 'red' ? 'red.500' : 'brand.400'}>
        {label}
      </Text>
      <Text fontWeight="700" fontSize="md" lineHeight="1.2">{value}</Text>
    </Box>
  );
}

function Timeline({ events }) {
  return (
    <Stack spacing={0} position="relative">
      {events.map((ev, i) => (
        <TimelineRow key={i} event={ev} isLast={i === events.length - 1} />
      ))}
    </Stack>
  );
}

const TYPE_META = {
  customer_added:   { dot: 'gray.400',     icon: '👤', tone: 'gray' },
  followup_created: { dot: 'brand.400',    icon: '📌', tone: 'brand' },
  followup_done:    { dot: 'green.400',    icon: '✓',  tone: 'green' },
  order_placed:     { dot: 'whatsapp.500', icon: '🛒', tone: 'whatsapp' },
  payment_pending:  { dot: 'red.400',      icon: '₹',  tone: 'red' },
};

function TimelineRow({ event, isLast }) {
  const meta = TYPE_META[event.type] || TYPE_META.customer_added;
  return (
    <HStack align="stretch" spacing={3}>
      <Flex direction="column" align="center" w="28px" flexShrink={0}>
        <Flex
          w="28px" h="28px" rounded="full"
          bg={meta.dot} color="white"
          align="center" justify="center" fontSize="sm" fontWeight="bold"
        >
          {meta.icon}
        </Flex>
        {!isLast && <Box flex="1" w="2px" bg="gray.200" my={1} />}
      </Flex>
      <Box flex="1" pb={5}>
        <Text fontWeight="semibold" fontSize="sm" lineHeight="short">{event.title}</Text>
        {event.subtitle && (
          <Text color="gray.600" fontSize="sm">{event.subtitle}</Text>
        )}
        <Text color="gray.400" fontSize="xs" mt={1}>{formatWhen(event.at)}</Text>
      </Box>
    </HStack>
  );
}

function EditCustomerModal({ isOpen, onClose, customer, onSaved }) {
  const [form, setForm] = useState(customer);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => { setForm(customer); }, [customer, isOpen]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    setSaving(true);
    try {
      const data = await customersApi.update(customer.id, {
        name:  form.name,
        phone: form.phone,
        area:  form.area || '',
        notes: form.notes || '',
      });
      toast({ status: 'success', title: 'Saved', duration: 2000 });
      onSaved(data.customer);
    } catch (err) {
      toast({ status: 'error', title: err.message || 'Could not save' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size={{ base: 'full', md: 'md' }} motionPreset="slideInBottom">
      <ModalOverlay />
      <ModalContent rounded={{ base: 0, md: '2xl' }}>
        <ModalHeader>Edit customer</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Stack spacing={3}>
            <FormControl><FormLabel fontSize="sm">Name</FormLabel>
              <Input value={form?.name || ''} onChange={set('name')} /></FormControl>
            <FormControl><FormLabel fontSize="sm">Phone</FormLabel>
              <Input value={form?.phone || ''} onChange={set('phone')} inputMode="tel" /></FormControl>
            <FormControl><FormLabel fontSize="sm">Area</FormLabel>
              <Input value={form?.area || ''} onChange={set('area')} /></FormControl>
            <FormControl><FormLabel fontSize="sm">Notes</FormLabel>
              <Textarea rows={3} value={form?.notes || ''} onChange={set('notes')} /></FormControl>
          </Stack>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" onClick={onClose} mr={2}>Cancel</Button>
          <Button colorScheme="brand" onClick={save} isLoading={saving}>Save</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

function formatWhen(ts) {
  const d     = new Date(ts);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const dDay  = new Date(ts); dDay.setHours(0, 0, 0, 0);
  const diff  = Math.round((today - dDay) / 86400000);
  const time  = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  if (diff === 0) return `Today, ${time}`;
  if (diff === 1) return `Yesterday, ${time}`;
  if (diff < 7)   return `${diff}d ago`;
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}

