import { Routes, Route, Navigate } from 'react-router-dom';
import Login from '@/pages/Login';
import Signup from '@/pages/Signup';
import Home from '@/pages/Home';
import Customers from '@/pages/Customers';
import CustomerProfile from '@/pages/CustomerProfile';
import Payments from '@/pages/Payments';
import Repeats from '@/pages/Repeats';
import Settings from '@/pages/Settings';
import ProtectedRoute from '@/components/ProtectedRoute';
import { AppLayout } from '@/components/AppLayout';

function Protected({ children }) {
  return (
    <ProtectedRoute>
      <AppLayout>{children}</AppLayout>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login"  element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      <Route path="/"              element={<Protected><Home /></Protected>} />
      <Route path="/customers"     element={<Protected><Customers /></Protected>} />
      <Route path="/customers/:id" element={<Protected><CustomerProfile /></Protected>} />
      <Route path="/payments"      element={<Protected><Payments /></Protected>} />
      <Route path="/repeats"       element={<Protected><Repeats /></Protected>} />
      <Route path="/settings"      element={<Protected><Settings /></Protected>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
