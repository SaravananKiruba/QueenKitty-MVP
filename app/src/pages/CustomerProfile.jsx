import {
  Box, Heading, Text, Stack, HStack, Avatar, Button, IconButton, Spinner,
  Card, CardBody, Badge, Flex, useDisclosure, useToast,
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton, ModalBody,
  ModalFooter, FormControl, FormLabel, Input, Textarea, Divider,
  Menu, MenuButton, MenuList, MenuItem,
} from '@chakra-ui/react';
import { useCallback, useEffect, useState } from 'react';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
import { customersApi, whatsappLink, telLink } from '@/lib/followups';
import AddFollowupSheet from '@/components/AddFollowupSheet';

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
      <Box maxW="md" mx="auto" px={4} py={6}>
        <Button as={RouterLink} to="/" variant="ghost" mb={4}>← Back</Button>
        <Card><CardBody><Text color="red.500">{error || 'Not found'}</Text></CardBody></Card>
      </Box>
    );
  }

  return (
    <Box maxW="md" mx="auto" px={4} pt={4} pb={28} minH="100vh">
      <HStack justify="space-between" mb={3}>
        <Button as={RouterLink} to="/" variant="ghost" size="sm">← Back</Button>
        <Menu>
          <MenuButton as={IconButton} variant="ghost" size="sm" aria-label="More"
            icon={<Text fontSize="lg" lineHeight="1">⋮</Text>} />
          <MenuList>
            <MenuItem onClick={editModal.onOpen}>Edit details</MenuItem>
            <MenuItem color="red.500" onClick={remove}>Delete customer</MenuItem>
          </MenuList>
        </Menu>
      </HStack>

      {/* Header */}
      <Card rounded="2xl" shadow="sm" mb={4}>
        <CardBody>
          <HStack spacing={3} align="start">
            <Avatar name={customer.name} bg="brand.500" color="white" size="lg" />
            <Box flex="1">
              <Heading size="md">{customer.name}</Heading>
              <Text color="gray.600" fontSize="sm">{customer.phone}</Text>
              {customer.area && (
                <Text color="gray.500" fontSize="sm">{customer.area}</Text>
              )}
            </Box>
          </HStack>

          <HStack mt={4} spacing={2}>
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
      <Heading size="sm" mb={3} color="gray.700">Timeline</Heading>
      {events.length === 0 ? (
        <Card rounded="2xl">
          <CardBody>
            <Text color="gray.600" fontSize="sm">
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
          <Heading size="sm" mb={2} color="gray.700">Notes</Heading>
          <Card rounded="2xl"><CardBody>
            <Text fontSize="sm" whiteSpace="pre-wrap">{customer.notes}</Text>
          </CardBody></Card>
        </>
      )}

      <AddFollowupSheet
        isOpen={addSheet.isOpen}
        onClose={addSheet.onClose}
        // Prefill is via empty sheet; future improvement: pass customer_id.
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
      rounded="full"
      px={4}
      py={2}
      bg={tone === 'red' ? 'red.50' : 'gray.100'}
      color={tone === 'red' ? 'red.700' : 'gray.700'}
      flexShrink={0}
    >
      <Text fontSize="xs" color={tone === 'red' ? 'red.600' : 'gray.500'}>{label}</Text>
      <Text fontWeight="bold" fontSize="sm">{value}</Text>
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
  if (!ts) return '';
  const d = new Date(ts.replace(' ', 'T'));
  if (Number.isNaN(+d)) return ts;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const dDay  = new Date(d);  dDay.setHours(0, 0, 0, 0);
  const diff  = Math.round((today - dDay) / 86400000);
  const time  = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  if (diff === 0) return `Today, ${time}`;
  if (diff === 1) return `Yesterday, ${time}`;
  if (diff < 7)   return `${diff}d ago`;
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatMoney(n) {
  return Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
