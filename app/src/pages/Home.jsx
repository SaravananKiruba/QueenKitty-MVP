import {
  Box, Heading, Text, Stack, Button, HStack, Avatar, IconButton, Spinner,
  Tabs, TabList, TabPanels, Tab, TabPanel, Badge, useDisclosure, Card, CardBody,
  Flex,
} from '@chakra-ui/react';
import { useCallback, useEffect, useState } from 'react';
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
  const { user } = useAuth();
  const [scope, setScope]     = useState('today');
  const [items, setItems]     = useState([]);
  const [counts, setCounts]   = useState({ today: 0, upcoming: 0, overdue: 0, done: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const { isOpen, onOpen, onClose } = useDisclosure();

  const load = useCallback(async (next = scope) => {
    setLoading(true); setError(null);
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

  const refreshCounts = () =>
    followupsApi.list(scope).then((d) => setCounts(d.counts || {})).catch(() => {});

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
  const todayDate = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  return (
    <Box minH={{ md: '100vh' }}>
      {/* Gradient hero header */}
      <Box
        bgGradient="linear(135deg, #E91E63 0%, #FF6B9D 100%)"
        px={5}
        pt={{ base: 7, md: 8 }}
        pb={24}
      >
        <HStack justify="space-between" align="start">
          <Box>
            <Text
              fontSize="xs"
              color="whiteAlpha.800"
              fontWeight="600"
              textTransform="uppercase"
              letterSpacing="wider"
            >
              {todayDate}
            </Text>
            <Heading
              size="lg"
              color="white"
              fontFamily="heading"
              mt={1}
            >
              Hey, {user?.name?.split(' ')[0]} 👋
            </Heading>
            <Text fontSize="sm" color="whiteAlpha.800" mt={0.5}>
              Here are your follow-ups
            </Text>
          </Box>
          <Avatar
            name={user?.name}
            bg="whiteAlpha.300"
            color="white"
            size="md"
            border="2px solid"
            borderColor="whiteAlpha.400"
          />
        </HStack>

        {/* Quick-stat chips */}
        <HStack mt={6} spacing={2} overflowX="auto" sx={{ scrollbarWidth: 'none' }}>
          <StatChip label="Today"    value={counts.today}    accent="rgba(255,255,255,0.22)" />
          <StatChip label="Overdue"  value={counts.overdue}  accent="rgba(255,80,80,0.32)" />
          <StatChip label="Upcoming" value={counts.upcoming} accent="rgba(255,255,255,0.14)" />
        </HStack>
      </Box>

      {/* Card panel pulls up over the gradient */}
      <Box
        bg="#FFF5F8"
        borderTopLeftRadius="28px"
        borderTopRightRadius="28px"
        mt="-22px"
        pt={5}
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
          <TabList overflowX="auto" overflowY="hidden" pb={2} sx={{ scrollbarWidth: 'none' }}>
            {SCOPES.map((s) => (
              <Tab key={s.key} flexShrink={0} fontSize="sm" fontWeight="500">
                {s.label}
                {counts[s.key] > 0 && (
                  <Badge
                    ml={2}
                    colorScheme={s.key === 'overdue' ? 'red' : 'brand'}
                    rounded="full"
                    fontSize="10px"
                  >
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
      </Box>

      {/* Floating action button */}
      <IconButton
        aria-label="Add follow-up"
        icon={<Text fontSize="2xl" lineHeight="1" fontWeight="bold" color="white">+</Text>}
        position="fixed"
        bottom={{ base: '80px', md: '32px' }}
        right={{ base: 5, md: 5 }}
        size="lg"
        rounded="full"
        bgGradient="linear(135deg, brand.500, brand.400)"
        shadow="0 4px 20px rgba(233,30,99,0.45)"
        h="60px" w="60px"
        _hover={{
          shadow: '0 6px 24px rgba(233,30,99,0.55)',
          transform: 'scale(1.06)',
          bgGradient: 'linear(135deg, brand.600, brand.500)',
        }}
        _active={{ transform: 'scale(0.97)' }}
        transition="all 0.2s"
        onClick={onOpen}
      />

      <AddFollowupSheet isOpen={isOpen} onClose={onClose} onCreated={handleCreated} />
    </Box>
  );
}

function StatChip({ label, value, accent }) {
  return (
    <Box
      flexShrink={0}
      bg={accent}
      rounded="2xl"
      px={4}
      py={2}
      backdropFilter="blur(4px)"
      border="1px solid"
      borderColor="whiteAlpha.200"
    >
      <Text fontSize="10px" color="whiteAlpha.800" fontWeight="600" textTransform="uppercase" letterSpacing="wider">
        {label}
      </Text>
      <Text fontSize="2xl" fontWeight="700" color="white" lineHeight="1.1">{value}</Text>
    </Box>
  );
}

function EmptyState({ scope, onAdd }) {
  const copy = {
    today:    { emoji: '✨', title: 'All clear for today', body: 'Add a customer to start tracking follow-ups.' },
    overdue:  { emoji: '🎉', title: 'No overdue follow-ups', body: 'Great job staying on top of things!' },
    upcoming: { emoji: '📅', title: 'No upcoming follow-ups', body: 'Plan ahead by scheduling a follow-up.' },
    done:     { emoji: '✅', title: 'No completed follow-ups yet', body: 'Marked-done items will appear here.' },
  }[scope] || { emoji: '📋', title: 'Nothing here', body: '' };

  return (
    <Card rounded="2xl">
      <CardBody>
        <Stack spacing={3} align="start">
          <Text fontSize="3xl">{copy.emoji}</Text>
          <Heading size="sm" fontFamily="heading">{copy.title}</Heading>
          <Text color="gray.500" fontSize="sm">{copy.body}</Text>
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
