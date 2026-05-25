import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton, ModalBody, ModalFooter,
  FormControl, FormLabel, Input, InputGroup, InputLeftAddon, Stack, HStack, Button,
  Text, Checkbox, useToast,
} from '@chakra-ui/react';
import { useEffect, useState } from 'react';
import { ordersApi, formatMoney } from '@/lib/followups';

/**
 * Record a payment against an existing order.
 * - Defaults to the pending amount (one-tap "mark fully paid").
 * - Partial payments supported.
 */
export default function RecordPaymentModal({ isOpen, onClose, order, onSaved }) {
  const [amount, setAmount]     = useState('');
  const [markPaid, setMarkPaid] = useState(true);
  const [saving, setSaving]     = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (isOpen && order) {
      const pending = Number(order.pending_amount || 0);
      setAmount(pending > 0 ? String(pending) : '');
      setMarkPaid(true);
    }
  }, [isOpen, order]);

  if (!order) return null;
  const pending = Number(order.pending_amount || 0);

  const submit = async (e) => {
    e?.preventDefault?.();
    setSaving(true);
    try {
      const payload = markPaid
        ? { mark_paid: true }
        : { amount: Number(amount) };
      const data = await ordersApi.recordPayment(order.id, payload);
      toast({ status: 'success', title: 'Payment recorded', duration: 2000 });
      onSaved?.(data.order);
      onClose();
    } catch (err) {
      toast({ status: 'error', title: err.message || 'Could not save' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm" isCentered>
      <ModalOverlay />
      <ModalContent as="form" onSubmit={submit} rounded="2xl" mx={4}>
        <ModalHeader>Record payment</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Stack spacing={3}>
            <Text fontSize="sm" color="gray.600">
              <strong>{order.customer_name}</strong> · {order.product_name}
            </Text>
            <Text fontSize="sm">
              Pending: <strong>₹{formatMoney(pending)}</strong> of ₹{formatMoney(order.amount)}
            </Text>

            <Checkbox isChecked={markPaid} onChange={(e) => setMarkPaid(e.target.checked)}>
              Mark fully paid
            </Checkbox>

            {!markPaid && (
              <FormControl>
                <FormLabel fontSize="sm">Amount received</FormLabel>
                <InputGroup>
                  <InputLeftAddon>₹</InputLeftAddon>
                  <Input
                    autoFocus
                    type="number" inputMode="decimal"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder={String(pending)}
                  />
                </InputGroup>
              </FormControl>
            )}
          </Stack>
        </ModalBody>
        <ModalFooter>
          <HStack w="full" spacing={2}>
            <Button variant="ghost" onClick={onClose} flex="1">Cancel</Button>
            <Button type="submit" colorScheme="green" isLoading={saving} flex="2">Save</Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
