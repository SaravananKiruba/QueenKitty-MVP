import { useState } from 'react';
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box, Button, FormControl, FormLabel, Heading, Input, InputGroup, InputLeftAddon,
  Stack, Text, Link, useToast, FormErrorMessage,
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
    <Box maxW="sm" mx="auto" px={5} py={10}>
      <Stack spacing={6}>
        <Stack spacing={1} textAlign="center">
          <Heading size="lg" color="brand.500">Create your account</Heading>
          <Text color="gray.600">Free plan. No card needed.</Text>
        </Stack>

        <Box as="form" onSubmit={onSubmit} bg="white" p={6} rounded="2xl" shadow="sm">
          <Stack spacing={4}>
            <FormControl isInvalid={!!errors.name} isRequired>
              <FormLabel>Your name</FormLabel>
              <Input
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                autoComplete="name"
                placeholder="Lakshmi"
              />
              <FormErrorMessage>{errors.name}</FormErrorMessage>
            </FormControl>

            <FormControl isInvalid={!!errors.phone} isRequired>
              <FormLabel>Mobile number</FormLabel>
              <InputGroup>
                <InputLeftAddon>+91</InputLeftAddon>
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
              <FormLabel>Password</FormLabel>
              <Input
                type="password"
                autoComplete="new-password"
                value={form.password}
                onChange={(e) => set('password', e.target.value)}
              />
              <FormErrorMessage>{errors.password}</FormErrorMessage>
            </FormControl>

            <FormControl>
              <FormLabel>Referral code (optional)</FormLabel>
              <Input
                value={form.referral_code}
                onChange={(e) => set('referral_code', e.target.value.toUpperCase())}
                placeholder="From a friend"
              />
            </FormControl>

            <Button type="submit" size="lg" isLoading={busy}>Create account</Button>
          </Stack>
        </Box>

        <Text textAlign="center" color="gray.600">
          Already have an account?{' '}
          <Link as={RouterLink} to="/login" color="brand.500" fontWeight="semibold">
            Log in
          </Link>
        </Text>
      </Stack>
    </Box>
  );
}
