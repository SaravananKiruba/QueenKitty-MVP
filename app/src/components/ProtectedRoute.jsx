import { Navigate, useLocation } from 'react-router-dom';
import { Center, Spinner } from '@chakra-ui/react';
import { useAuth } from '@/context/AuthContext';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <Center h="100dvh">
        <Spinner size="lg" color="brand.500" />
      </Center>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}
