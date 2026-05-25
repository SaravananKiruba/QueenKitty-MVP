import {
  Box, Heading, Text, Stack, Button, HStack, Avatar, IconButton, Spinner,
  Tabs, TabList, TabPanels, Tab, TabPanel, Badge, useDisclosure, Card, CardBody,
  Flex,
} from '@chakra-ui/react';
import { useCallback, useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { followupsApi } from '@/lib/followups';
import FollowupCard from '@/components/FollowupCard';
import AddFollowupSheet from '@/components/AddFollowupSheet';

const SCOPES = [
  { key: 'today',    label: 'Today' },
  { key: 'overdue',  label: 'Overdue' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'done',     label: 'Done' },
];

export default function Home() {
  const { user, logout } = useAuth();
  const [scope, setScope]       = useState('today');
  const [items, setItems]       = useState([]);
  const [counts, setCounts]     = useState({ today: 0, upcoming: 0, overdue: 0, done: 0 });
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const { isOpen, onOpen, onClose } = useDisclosure();

  const load = useCallback(async (next = scope) => {
    setLoading(true);
    setError(null);
    try {
      const data = await followupsApi.list(next);
      setItems(data.followups || []);
      setCounts(data.counts || {});
    } catch (err) {
      setError(err.message || 'Could not load follow-ups');
    } finally {
      setLoading(false);
    }
  }, [scope]);

  useEffect(() => { load(scope); }, [scope, load]);

  const refreshCounts = () => {
    followupsApi.list(scope).then((d) => setCounts(d.counts || {})).catch(() => {});
  };

  const handleCreated = () => load(scope);
  const handleChanged = (updated) => {
    setItems((prev) => {
      const stillFits = belongsInScope(updated, scope);
      if (!stillFits) return prev.filter((f) => f.id !== updated.id);
      return prev.map((f) => (f.id === updated.id ? updated : f));
    });
    refreshCounts();
  };
  const handleDeleted = (id) => {
    setItems((prev) => prev.filter((f) => f.id !== id));
    refreshCounts();
  };

  const scopeIndex = SCOPES.findIndex((s) => s.key === scope);

  return (
    <Box maxW="md" mx="auto" px={4} pt={6} pb={28} minH="100vh">
      <HStack justify="space-between" mb={5}>
        <HStack>
          <Avatar name={user?.name} bg="brand.500" color="white" />
          <Box>
            <Text fontSize="sm" color="gray.500">Welcome back</Text>
            <Heading size="md">{user?.name}</Heading>
          </Box>
        </HStack>
        <HStack spacing={1}>
          <Button as={RouterLink} to="/payments" size="sm" variant="ghost">Payments</Button>
          <Button as={RouterLink} to="/customers" size="sm" variant="ghost">Customers</Button>
          <Button size="sm" variant="ghost" onClick={logout}>Log out</Button>
        </HStack>
      </HStack>

      <Tabs
        index={scopeIndex >= 0 ? scopeIndex : 0}
        onChange={(i) => setScope(SCOPES[i].key)}
        variant="soft-rounded"
        colorScheme="brand"
        isLazy
      >
        <TabList overflowX="auto" overflowY="hidden" pb={2} sx={{ scrollbarWidth: 'none' }}>
          {SCOPES.map((s) => (
            <Tab key={s.key} flexShrink={0} fontSize="sm">
              {s.label}
              {counts[s.key] > 0 && (
                <Badge ml={2} colorScheme={s.key === 'overdue' ? 'red' : 'brand'} rounded="full">
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
                <EmptyState scope={s.key} onAdd={onOpen} />
              ) : (
                <Stack spacing={3}>
                  {items.map((f) => (
                    <FollowupCard
                      key={f.id}
                      followup={f}
                      onChanged={handleChanged}
                      onDeleted={handleDeleted}
                    />
                  ))}
                </Stack>
              )}
            </TabPanel>
          ))}
        </TabPanels>
      </Tabs>

      <IconButton
        aria-label="Add follow-up"
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
        onClick={onOpen}
      />

      <AddFollowupSheet isOpen={isOpen} onClose={onClose} onCreated={handleCreated} />
    </Box>
  );
}

function EmptyState({ scope, onAdd }) {
  const copy = {
    today:    { title: 'Nothing for today', body: 'Add a customer to start tracking follow-ups.' },
    overdue:  { title: 'No overdue follow-ups', body: 'Great job staying on top of things.' },
    upcoming: { title: 'No upcoming follow-ups', body: 'Plan a follow-up for next week.' },
    done:     { title: 'No completed follow-ups yet', body: 'Marked-done items will appear here.' },
  }[scope] || { title: 'Nothing here', body: '' };

  return (
    <Card rounded="2xl" shadow="sm">
      <CardBody>
        <Stack spacing={3} align="start">
          <Heading size="sm">{copy.title}</Heading>
          <Text color="gray.600" fontSize="sm">{copy.body}</Text>
          {scope !== 'done' && (
            <Button onClick={onAdd} size="sm">+ Add follow-up</Button>
          )}
        </Stack>
      </CardBody>
    </Card>
  );
}

function belongsInScope(f, scope) {
  const today = new Date().toISOString().slice(0, 10);
  switch (scope) {
    case 'today':    return f.status === 'pending' && f.followup_date === today;
    case 'overdue':  return f.status === 'pending' && f.followup_date <  today;
    case 'upcoming': return f.status === 'pending' && f.followup_date >  today;
    case 'done':     return f.status === 'done';
    default:         return true;
  }
}
