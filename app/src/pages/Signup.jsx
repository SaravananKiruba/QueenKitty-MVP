import { useState } from 'react';
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box, Button, FormControl, FormLabel, Heading, Input, InputGroup, InputLeftAddon,
  Stack, Text, Link, useToast, FormErrorMessage, Card, CardBody,
} from '@chakra-ui/react';
import { useAuth } from '@/context/AuthContext';

export default function Signup() {
  const { signup } = useAuth();
  const navigate   = useNavigate();
  const toast      = useToast();
  const [params]   = useSearchParams();

  const [form, setForm] = useState({
    name: '',
    phone: '',
    password: '',
    referral_code: params.get('ref') || '',
  });
  const [errors, setErrors] = useState({});
  const [busy, setBusy]     = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    try {
      setBusy(true);
      await signup(form);
      toast({ status: 'success', title: 'Welcome to QueenKitty!' });
      navigate('/', { replace: true });
    } catch (err) {
      if (err.errors) setErrors(err.errors);
      toast({ status: 'error', title: err.message || 'Signup failed' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box minH="100vh" bg="#FFF5F8">
      {/* Gradient hero */}
      <Box
        bgGradient="linear(135deg, #E91E63 0%, #FF6B9D 100%)"
        px={6}
        pt={12}
        pb={20}
        textAlign="center"
      >
        <Text fontSize="4xl" lineHeight="1" mb={3}>👑</Text>
        <Heading size="2xl" color="white" fontFamily="heading" letterSpacing="tight">
          QueenKitty
        </Heading>
        <Text color="whiteAlpha.800" mt={2} fontSize="md">
          Free plan. No card needed.
        </Text>
      </Box>

      {/* Form card */}
      <Box px={4} mt="-28px">
        <Card rounded="2xl" shadow="xl">
          <CardBody p={6}>
            <Heading size="md" fontFamily="heading" mb={5} color="gray.800">
              Create your account
            </Heading>
            <Box as="form" onSubmit={onSubmit}>
              <Stack spacing={4}>
                <FormControl isInvalid={!!errors.name} isRequired>
                  <FormLabel fontSize="sm" color="gray.600">Your name</FormLabel>
                  <Input
                    value={form.name}
                    onChange={(e) => set('name', e.target.value)}
                    autoComplete="name"
                    placeholder="Lakshmi"
                  />
                  <FormErrorMessage>{errors.name}</FormErrorMessage>
                </FormControl>

                <FormControl isInvalid={!!errors.phone} isRequired>
                  <FormLabel fontSize="sm" color="gray.600">Mobile number</FormLabel>
                  <InputGroup>
                    <InputLeftAddon bg="gray.50" color="gray.600">+91</InputLeftAddon>
                    <Input
                      type="tel"
                      inputMode="numeric"
                      autoComplete="tel"
                      placeholder="9876543210"
                      value={form.phone}
                      onChange={(e) => set('phone', e.target.value.replace(/\D/g, ''))}
                    />
                  </InputGroup>
                  <FormErrorMessage>{errors.phone}</FormErrorMessage>
                </FormControl>

                <FormControl isInvalid={!!errors.password} isRequired>
                  <FormLabel fontSize="sm" color="gray.600">Password</FormLabel>
                  <Input
                    type="password"
                    autoComplete="new-password"
                    value={form.password}
                    onChange={(e) => set('password', e.target.value)}
                  />
                  <FormErrorMessage>{errors.password}</FormErrorMessage>
                </FormControl>

                <FormControl>
                  <FormLabel fontSize="sm" color="gray.600">Referral code (optional)</FormLabel>
                  <Input
                    value={form.referral_code}
                    onChange={(e) => set('referral_code', e.target.value.toUpperCase())}
                    placeholder="From a friend"
                  />
                </FormControl>

                <Button type="submit" size="lg" isLoading={busy} mt={1}>
                  Create account
                </Button>
              </Stack>
            </Box>
          </CardBody>
        </Card>

        <Text textAlign="center" color="gray.500" mt={5} mb={8} fontSize="sm">
          Already have an account?{' '}
          <Link as={RouterLink} to="/login" color="brand.500" fontWeight="600">
            Log in
          </Link>
        </Text>
      </Box>
    </Box>
  );
}
