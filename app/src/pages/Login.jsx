import { useState } from 'react';
import { Link as RouterLink, useNavigate, useLocation } from 'react-router-dom';
import {
  Box, Button, FormControl, FormLabel, Heading, Input, InputGroup, InputLeftAddon,
  Stack, Text, Link, useToast, FormErrorMessage, Card, CardBody,
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
    <Box minH="100vh" bg="#FFF5F8">
      {/* Gradient hero */}
      <Box
        bgGradient="linear(135deg, #E91E63 0%, #FF6B9D 100%)"
        px={6}
        pt={16}
        pb={20}
        textAlign="center"
      >
        <Text fontSize="4xl" lineHeight="1" mb={3}>ðŸ‘‘</Text>
        <Heading size="2xl" color="white" fontFamily="heading" letterSpacing="tight">
          QueenKitty
        </Heading>
        <Text color="whiteAlpha.800" mt={2} fontSize="md">
          Never miss a follow-up again
        </Text>
      </Box>

      {/* Form card lifts over gradient */}
      <Box px={4} mt="-28px">
        <Card rounded="2xl" shadow="xl">
          <CardBody p={6}>
            <Heading size="md" fontFamily="heading" mb={5} color="gray.800">
              Welcome back
            </Heading>
            <Box as="form" onSubmit={onSubmit}>
              <Stack spacing={4}>
                <FormControl isInvalid={!!errors.phone} isRequired>
                  <FormLabel fontSize="sm" color="gray.600">Mobile number</FormLabel>
                  <InputGroup>
                    <InputLeftAddon bg="gray.50" color="gray.600">+91</InputLeftAddon>
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
                  <FormLabel fontSize="sm" color="gray.600">Password</FormLabel>
                  <Input
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <FormErrorMessage>{errors.password}</FormErrorMessage>
                </FormControl>

                <Button type="submit" size="lg" isLoading={busy} mt={1}>
                  Log in
                </Button>
              </Stack>
            </Box>
          </CardBody>
        </Card>

        <Text textAlign="center" color="gray.500" mt={5} fontSize="sm">
          New to QueenKitty?{' '}
          <Link as={RouterLink} to="/signup" color="brand.500" fontWeight="600">
            Create an account
          </Link>
        </Text>
      </Box>
    </Box>
  );
}

