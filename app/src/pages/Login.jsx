import { useState } from 'react';
import { Link as RouterLink, useNavigate, useLocation } from 'react-router-dom';
import {
  Box, Button, FormControl, FormLabel, Heading, Input, InputGroup, InputLeftAddon,
  Stack, Text, Link, useToast, FormErrorMessage,
} from '@chakra-ui/react';
import { useAuth } from '@/context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const toast     = useToast();

  const [phone, setPhone]       = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy]         = useState(false);
  const [errors, setErrors]     = useState({});

  const onSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    const next = {};
    if (!/^\d{10,15}$/.test(phone)) next.phone = 'Enter a valid mobile number';
    if (password.length < 6) next.password = 'Password is too short';
    if (Object.keys(next).length) { setErrors(next); return; }

    setBusy(true);
    try {
      await login(phone, password);
      const from = location.state?.from?.pathname || '/';
      navigate(from, { replace: true });
    } catch (err) {
      toast({ status: 'error', title: err.message || 'Login failed', duration: 4000 });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box maxW="sm" mx="auto" px={5} py={10}>
      <Stack spacing={6}>
        <Stack spacing={1} textAlign="center">
          <Heading size="lg" color="brand.500">QueenKitty</Heading>
          <Text color="gray.600">Never miss a follow-up again.</Text>
        </Stack>

        <Box as="form" onSubmit={onSubmit} bg="white" p={6} rounded="2xl" shadow="sm">
          <Stack spacing={4}>
            <FormControl isInvalid={!!errors.phone} isRequired>
              <FormLabel>Mobile number</FormLabel>
              <InputGroup>
                <InputLeftAddon>+91</InputLeftAddon>
                <Input
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  placeholder="9876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                />
              </InputGroup>
              <FormErrorMessage>{errors.phone}</FormErrorMessage>
            </FormControl>

            <FormControl isInvalid={!!errors.password} isRequired>
              <FormLabel>Password</FormLabel>
              <Input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <FormErrorMessage>{errors.password}</FormErrorMessage>
            </FormControl>

            <Button type="submit" size="lg" isLoading={busy}>Log in</Button>
          </Stack>
        </Box>

        <Text textAlign="center" color="gray.600">
          New to QueenKitty?{' '}
          <Link as={RouterLink} to="/signup" color="brand.500" fontWeight="semibold">
            Create an account
          </Link>
        </Text>
      </Stack>
    </Box>
  );
}
