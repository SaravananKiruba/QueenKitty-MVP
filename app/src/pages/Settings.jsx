import {
  Box, Heading, Text, Stack, HStack, Button, Spinner, Card, CardBody,
  FormControl, FormLabel, FormHelperText, Input, InputGroup, InputRightAddon,
  useToast, Flex,
} from '@chakra-ui/react';
import { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { settingsApi } from '@/lib/followups';

const CATEGORIES = [
  { key: 'kitchen', label: 'Kitchen products', hint: 'lunch boxes, masala dabba, etc.' },
  { key: 'bottle',  label: 'Water bottles',   hint: 'reusable bottles, flasks' },
  { key: 'storage', label: 'Storage products', hint: 'containers, jars, organisers' },
];

const MIN = 7;
const MAX = 365;

export default function Settings() {
  const toast = useToast();
  const [days, setDays] = useState({ kitchen: 90, bottle: 120, storage: 180 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    settingsApi.get()
      .then((data) => { if (!cancelled) setDays(data.settings.repeat_days); })
      .catch((err) => { if (!cancelled) setError(err.message || 'Could not load'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const set = (k) => (e) => {
    const v = e.target.value;
    setDays((d) => ({ ...d, [k]: v === '' ? '' : Number(v) }));
  };

  const valid = CATEGORIES.every(({ key }) => {
    const n = Number(days[key]);
    return Number.isFinite(n) && n >= MIN && n <= MAX;
  });

  const save = async () => {
    if (!valid) {
      toast({ status: 'error', title: `Each value must be between ${MIN} and ${MAX} days` });
      return;
    }
    setSaving(true);
    try {
      const data = await settingsApi.update({ repeat_days: days });
      setDays(data.settings.repeat_days);
      toast({ status: 'success', title: 'Settings saved', duration: 2000 });
    } catch (err) {
      toast({ status: 'error', title: err.message || 'Could not save' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box maxW="md" mx="auto" px={4} pt={6} pb={20} minH="100vh">
      <HStack justify="space-between" mb={4}>
        <Button as={RouterLink} to="/" variant="ghost" size="sm">← Back</Button>
        <Heading size="md">Settings</Heading>
        <Box w="60px" />
      </HStack>

      <Card rounded="2xl" mb={3}>
        <CardBody>
          <Heading size="sm" mb={1}>Repeat-order reminders</Heading>
          <Text color="gray.600" fontSize="sm">
            How many days after a sale should we remind you to follow up for a repeat order?
          </Text>
        </CardBody>
      </Card>

      {loading ? (
        <Flex justify="center" py={10}><Spinner color="brand.500" /></Flex>
      ) : error ? (
        <Card><CardBody><Text color="red.500" fontSize="sm">{error}</Text></CardBody></Card>
      ) : (
        <Card rounded="2xl">
          <CardBody>
            <Stack spacing={4}>
              {CATEGORIES.map(({ key, label, hint }) => (
                <FormControl key={key}>
                  <FormLabel fontSize="sm" mb={1}>{label}</FormLabel>
                  <InputGroup>
                    <Input
                      type="number" inputMode="numeric"
                      min={MIN} max={MAX}
                      value={days[key]}
                      onChange={set(key)}
                    />
                    <InputRightAddon>days</InputRightAddon>
                  </InputGroup>
                  <FormHelperText fontSize="xs">{hint}</FormHelperText>
                </FormControl>
              ))}

              <Button colorScheme="brand" onClick={save} isLoading={saving} isDisabled={!valid}>
                Save settings
              </Button>
              <Text fontSize="xs" color="gray.500">
                Changes apply to new orders. Existing orders keep their original reminder dates.
              </Text>
            </Stack>
          </CardBody>
        </Card>
      )}
    </Box>
  );
}
