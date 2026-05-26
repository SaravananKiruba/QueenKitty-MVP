import {
  Box, Heading, Text, Stack, HStack, Button, Spinner, Card, CardBody,
  FormControl, FormLabel, FormHelperText, Input, InputGroup, InputRightAddon,
  useToast, Flex,
} from '@chakra-ui/react';
import { useEffect, useState } from 'react';
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
    <Box minH={{ md: '100vh' }}>
      {/* Gradient header */}
      <Box
        bgGradient="linear(135deg, #E91E63 0%, #FF6B9D 100%)"
        px={5} pt={{ base: 7, md: 8 }} pb={16}
      >
        <Heading size="lg" color="white" fontFamily="heading">Settings</Heading>
        <Text fontSize="sm" color="whiteAlpha.800" mt={0.5}>Repeat order reminder cadence</Text>
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
        <Card rounded="2xl" mb={4} shadow="none" bg="brand.50" borderWidth="1px" borderColor="brand.100">
          <CardBody py={3}>
            <Text fontSize="sm" color="brand.700">
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
                    <FormLabel fontSize="sm" fontWeight="600" color="gray.700" mb={1}>{label}</FormLabel>
                    <InputGroup>
                      <Input
                        type="number"
                        inputMode="numeric"
                        min={MIN} max={MAX}
                        value={days[key]}
                        onChange={set(key)}
                        bg="white"
                      />
                      <InputRightAddon bg="gray.50" color="gray.500">days</InputRightAddon>
                    </InputGroup>
                    <FormHelperText fontSize="xs" color="gray.400">{hint}</FormHelperText>
                  </FormControl>
                ))}

                <Button colorScheme="brand" onClick={save} isLoading={saving} isDisabled={!valid} size="lg">
                  Save settings
                </Button>
                <Text fontSize="xs" color="gray.400">
                  Changes apply to new orders only.
                </Text>
              </Stack>
            </CardBody>
          </Card>
        )}
      </Box>
    </Box>
  );
}
