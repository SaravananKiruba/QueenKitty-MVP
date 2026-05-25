import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton, ModalBody, ModalFooter,
  FormControl, FormLabel, FormErrorMessage, Input, Stack, Button, Textarea, HStack, useToast,
} from '@chakra-ui/react';
import { useEffect, useRef, useState } from 'react';
import { followupsApi, todayISO } from '@/lib/followups';

const empty = { name: '', phone: '', product_interest: '', followup_date: '', notes: '', area: '' };

/**
 * 10-second add-lead flow (CLAUDE.md Feature 1).
 * Single sheet, 5 required-ish fields, autofocus on name.
 */
export default function AddFollowupSheet({ isOpen, onClose, onCreated }) {
  const [form, setForm] = useState(empty);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  const nameRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setForm({ ...empty, followup_date: todayISO() });
      setErrors({});
      // Autofocus after open animation
      setTimeout(() => nameRef.current?.focus(), 60);
    }
  }, [isOpen]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e?.preventDefault?.();
    setSaving(true);
    setErrors({});
    try {
      const data = await followupsApi.create(form);
      toast({ status: 'success', title: 'Follow-up added', duration: 2000 });
      onCreated?.(data.followup);
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
        <ModalHeader>Add follow-up</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Stack spacing={3}>
            <FormControl isRequired isInvalid={!!errors.name}>
              <FormLabel fontSize="sm">Customer name</FormLabel>
              <Input ref={nameRef} value={form.name} onChange={set('name')} placeholder="Lakshmi" />
              <FormErrorMessage>{errors.name}</FormErrorMessage>
            </FormControl>

            <FormControl isRequired isInvalid={!!errors.phone}>
              <FormLabel fontSize="sm">Phone</FormLabel>
              <Input
                value={form.phone}
                onChange={set('phone')}
                placeholder="9876543210"
                inputMode="tel"
                type="tel"
              />
              <FormErrorMessage>{errors.phone}</FormErrorMessage>
            </FormControl>

            <FormControl isRequired isInvalid={!!errors.product_interest}>
              <FormLabel fontSize="sm">Product interest</FormLabel>
              <Input
                value={form.product_interest}
                onChange={set('product_interest')}
                placeholder="Lunch box"
              />
              <FormErrorMessage>{errors.product_interest}</FormErrorMessage>
            </FormControl>

            <FormControl isRequired isInvalid={!!errors.followup_date}>
              <FormLabel fontSize="sm">Follow-up date</FormLabel>
              <Input type="date" value={form.followup_date} onChange={set('followup_date')} />
              <FormErrorMessage>{errors.followup_date}</FormErrorMessage>
            </FormControl>

            <FormControl isInvalid={!!errors.notes}>
              <FormLabel fontSize="sm">Short note</FormLabel>
              <Textarea
                value={form.notes}
                onChange={set('notes')}
                placeholder='e.g. "After salary"'
                rows={2}
              />
              <FormErrorMessage>{errors.notes}</FormErrorMessage>
            </FormControl>

            <FormControl>
              <FormLabel fontSize="sm" color="gray.500">Area (optional)</FormLabel>
              <Input value={form.area} onChange={set('area')} placeholder="T. Nagar" />
            </FormControl>
          </Stack>
        </ModalBody>
        <ModalFooter>
          <HStack w="full" spacing={2}>
            <Button variant="ghost" onClick={onClose} flex="1">Cancel</Button>
            <Button type="submit" colorScheme="brand" isLoading={saving} flex="2">Save</Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
