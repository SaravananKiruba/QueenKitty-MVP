import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton, ModalBody, ModalFooter,
  FormControl, FormLabel, FormErrorMessage, Input, Stack, Button, HStack, Select,
  InputGroup, InputLeftAddon, useToast, Divider, Text,
} from '@chakra-ui/react';
import { useEffect, useRef, useState } from 'react';
import { ordersApi, todayISO, PRODUCT_CATEGORIES } from '@/lib/followups';
import CustomerSearchSelector from '@/components/CustomerSearchSelector';
import ProductSearchSelector from '@/components/ProductSearchSelector';

const empty = {
  name: '', phone: '',
  product_name: '', product_category: 'other',
  amount: '', paid_amount: '',
  order_date: '', payment_reminder_date: '',
};

/**
 * Add an order. If `customer` is passed, name+phone are hidden and the
 * order is attached to that customer. Otherwise the API upserts a new one.
 */
export default function AddOrderSheet({ isOpen, onClose, onCreated, customer = null }) {
  const [form, setForm] = useState(empty);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const productRef = useRef(null);
  const nameRef    = useRef(null);
  const toast = useToast();

  useEffect(() => {
    if (isOpen) {
      setForm({ ...empty, order_date: todayISO() });
      setErrors({});
      setTimeout(() => (customer ? productRef : nameRef).current?.focus(), 60);
    }
  }, [isOpen, customer]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e?.preventDefault?.();
    setSaving(true);
    setErrors({});
    try {
      const payload = {
        ...form,
        amount:      form.amount === '' ? 0 : Number(form.amount),
        paid_amount: form.paid_amount === '' ? 0 : Number(form.paid_amount),
      };
      if (customer) payload.customer_id = customer.id;
      // Drop empty optional dates so backend uses defaults
      if (!payload.payment_reminder_date) delete payload.payment_reminder_date;

      const data = await ordersApi.create(payload);
      toast({ status: 'success', title: 'Order saved', duration: 2000 });
      onCreated?.(data.order);
      onClose();
    } catch (err) {
      setErrors(err.errors || {});
      toast({ status: 'error', title: err.message || 'Could not save', duration: 3000 });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size={{ base: 'full', md: 'md' }} motionPreset="slideInBottom">
      <ModalOverlay />
      <ModalContent as="form" onSubmit={submit} rounded={{ base: 0, md: '2xl' }}>
        <ModalHeader>{customer ? `Add order — ${customer.name}` : 'Add order'}</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Stack spacing={3}>
            {!customer && (
              <>
                {/* ── Optional: search existing customer to auto-fill name+phone ── */}
                <CustomerSearchSelector
                  label="Search existing customer (optional)"
                  placeholder="Name or phone…"
                  onSelect={(c) =>
                    setForm((f) => ({
                      ...f,
                      name:  c.name  || f.name,
                      phone: c.phone || f.phone,
                    }))
                  }
                />
                <HStack spacing={2} align="center">
                  <Divider />
                  <Text fontSize="xs" color="gray.400" whiteSpace="nowrap">or add new</Text>
                  <Divider />
                </HStack>
                {/* ── End customer search ──────────────────────────────────────── */}

                <FormControl isRequired isInvalid={!!errors.name}>
                  <FormLabel fontSize="sm">Customer name</FormLabel>
                  <Input ref={nameRef} value={form.name} onChange={set('name')} placeholder="Lakshmi" />
                  <FormErrorMessage>{errors.name}</FormErrorMessage>
                </FormControl>
                <FormControl isRequired isInvalid={!!errors.phone}>
                  <FormLabel fontSize="sm">Phone</FormLabel>
                  <Input value={form.phone} onChange={set('phone')} type="tel" inputMode="tel" placeholder="9876543210" />
                  <FormErrorMessage>{errors.phone}</FormErrorMessage>
                </FormControl>
              </>
            )}

            {/* ── Optional: search product master to auto-fill name + amount ── */}
            <ProductSearchSelector
              label="Search product (optional)"
              placeholder="Product name or code…"
              onSelect={(p) =>
                setForm((f) => ({
                  ...f,
                  product_name:     p.product_name || f.product_name,
                  product_category: p.category     || f.product_category,
                  // Pre-fill amount from MRP only when seller hasn't typed one yet
                  amount: f.amount === '' && p.default_price ? String(p.default_price) : f.amount,
                }))
              }
            />
            <HStack spacing={2} align="center">
              <Divider />
              <Text fontSize="xs" color="gray.400" whiteSpace="nowrap">or type manually</Text>
              <Divider />
            </HStack>
            {/* ── End product search ───────────────────────────────────────────── */}

            <FormControl isRequired isInvalid={!!errors.product_name}>
              <FormLabel fontSize="sm">Product</FormLabel>
              <Input ref={productRef} value={form.product_name} onChange={set('product_name')} placeholder="Lunch box" />
              <FormErrorMessage>{errors.product_name}</FormErrorMessage>
            </FormControl>

            <FormControl>
              <FormLabel fontSize="sm">Category</FormLabel>
              <Select value={form.product_category} onChange={set('product_category')}>
                {PRODUCT_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </Select>
            </FormControl>

            <HStack>
              <FormControl isRequired isInvalid={!!errors.amount}>
                <FormLabel fontSize="sm">Order amount</FormLabel>
                <InputGroup>
                  <InputLeftAddon>₹</InputLeftAddon>
                  <Input value={form.amount} onChange={set('amount')} type="number" inputMode="decimal" placeholder="500" />
                </InputGroup>
                <FormErrorMessage>{errors.amount}</FormErrorMessage>
              </FormControl>
              <FormControl isInvalid={!!errors.paid_amount}>
                <FormLabel fontSize="sm">Paid now</FormLabel>
                <InputGroup>
                  <InputLeftAddon>₹</InputLeftAddon>
                  <Input value={form.paid_amount} onChange={set('paid_amount')} type="number" inputMode="decimal" placeholder="0" />
                </InputGroup>
                <FormErrorMessage>{errors.paid_amount}</FormErrorMessage>
              </FormControl>
            </HStack>

            <HStack>
              <FormControl isInvalid={!!errors.order_date}>
                <FormLabel fontSize="sm">Order date</FormLabel>
                <Input type="date" value={form.order_date} onChange={set('order_date')} />
                <FormErrorMessage>{errors.order_date}</FormErrorMessage>
              </FormControl>
              <FormControl isInvalid={!!errors.payment_reminder_date}>
                <FormLabel fontSize="sm">Remind on</FormLabel>
                <Input type="date" value={form.payment_reminder_date} onChange={set('payment_reminder_date')} />
                <FormErrorMessage>{errors.payment_reminder_date}</FormErrorMessage>
              </FormControl>
            </HStack>
          </Stack>
        </ModalBody>
        <ModalFooter>
          <HStack w="full" spacing={2}>
            <Button variant="ghost" onClick={onClose} flex="1">Cancel</Button>
            <Button type="submit" colorScheme="brand" isLoading={saving} flex="2">Save order</Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
