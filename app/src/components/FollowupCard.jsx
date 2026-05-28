import {
  Card, CardBody, Stack, HStack, Text, Badge, IconButton, Button, Box,
  Menu, MenuButton, MenuList, MenuItem, useDisclosure,
  AlertDialog, AlertDialogBody, AlertDialogFooter, AlertDialogHeader,
  AlertDialogContent, AlertDialogOverlay, Link,
} from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';
import { useRef, useState } from 'react';
import { followupsApi, whatsappLink, telLink } from '@/lib/followups';
import AddOrderSheet from '@/components/AddOrderSheet';

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short' });
}

function relativeDay(iso) {
  if (!iso) return '';
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = new Date(iso + 'T00:00:00');
  const diff = Math.round((d - today) / 86400000);
  if (diff === 0)  return 'Today';
  if (diff === 1)  return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  if (diff < 0)    return `${-diff}d overdue`;
  return `in ${diff}d`;
}

export default function FollowupCard({ followup, onChanged, onDeleted }) {
  const [busy, setBusy] = useState(false);
  const { isOpen: confirmOpen, onOpen: openConfirm, onClose: closeConfirm } = useDisclosure();
  const { isOpen: orderOpen, onOpen: openOrder, onClose: closeOrder } = useDisclosure();
  const cancelRef = useRef(null);

  const overdue = !followup.is_completed
    && followup.followup_date < new Date().toISOString().slice(0, 10);

  const waMessage = `Hi ${followup.customer_name}, just checking in about the ${followup.product_interest}.`;

  const act = async (fn) => {
    setBusy(true);
    try {
      const data = await fn();
      onChanged?.(data.followup);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    closeConfirm();
    setBusy(true);
    try {
      await followupsApi.remove(followup.id);
      onDeleted?.(followup.id);
    } finally {
      setBusy(false);
    }
  };

  const handleOrderCreated = async (order) => {
    closeOrder();
    // Mark followup as done after order is created
    await act(() => followupsApi.done(followup.id));
  };

  return (
    <Card
      rounded="2xl"
      borderLeft="4px solid"
      borderColor={followup.is_completed ? 'green.300' : overdue ? 'red.400' : 'brand.400'}
      shadow="0 2px 12px rgba(0,0,0,0.06)"
      _hover={{ shadow: '0 4px 20px rgba(233,30,99,0.10)', transform: 'translateY(-1px)' }}
      transition="all 0.15s"
    >
      <CardBody>
        <Stack spacing={3}>
          <HStack justify="space-between" align="start">
            <Box flex={1}>
              <HStack spacing={2} mb={1} flexWrap="wrap">
                <Badge
                  colorScheme={overdue ? 'red' : followup.is_completed ? 'green' : 'brand'}
                  rounded="full"
                  px={2}
                  fontSize="11px"
                  fontWeight="600"
                >
                  {followup.is_completed ? '✓ Done' : relativeDay(followup.followup_date)}
                </Badge>
                <Text fontSize="xs" color="gray.400" fontWeight="500">{formatDate(followup.followup_date)}</Text>
              </HStack>
              <Text fontWeight="700" fontSize="md" lineHeight="short" color="gray.800">
                <Link as={RouterLink} to={`/customers/${followup.customer_id}`}
                  _hover={{ textDecoration: 'underline', color: 'brand.500' }}>
                  {followup.customer_name}
                </Link>
              </Text>
              <Text color="gray.600" fontSize="sm" fontWeight="500">{followup.product_interest}</Text>
              {followup.notes && (
                <Text color="gray.400" fontSize="sm" fontStyle="italic" mt={1} noOfLines={2}>
                  "{followup.notes}"
                </Text>
              )}
            </Box>

            <Menu>
              <MenuButton as={IconButton} variant="ghost" size="sm" aria-label="More"
                color="gray.400"
                _hover={{ color: 'gray.600', bg: 'gray.50' }}
                icon={<Text fontSize="lg" lineHeight="1">⋮</Text>} />
              <MenuList shadow="lg" rounded="xl">
                <MenuItem rounded="lg" onClick={() => act(() => followupsApi.snooze(followup.id, 1))}>Snooze 1 day</MenuItem>
                <MenuItem rounded="lg" onClick={() => act(() => followupsApi.snooze(followup.id, 3))}>Snooze 3 days</MenuItem>
                <MenuItem rounded="lg" onClick={() => act(() => followupsApi.snooze(followup.id, 7))}>Snooze 1 week</MenuItem>
                <MenuItem rounded="lg" color="red.500" onClick={openConfirm}>Delete</MenuItem>
              </MenuList>
            </Menu>
          </HStack>

          {!followup.is_completed && (
            <HStack spacing={2}>
              <Button
                as="a"
                href={whatsappLink(followup.customer_phone, waMessage)}
                target="_blank"
                rel="noopener noreferrer"
                colorScheme="whatsapp"
                size="sm"
                flex="1"
                rounded="lg"
              >
                WhatsApp
              </Button>
              <Button
                as="a"
                href={telLink(followup.customer_phone)}
                variant="outline"
                size="sm"
                flex="1"
                rounded="lg"
                borderColor="gray.200"
              >
                Call
              </Button>
              <Button
                colorScheme="green"
                size="sm"
                onClick={openOrder}
                flex="1"
                rounded="lg"
              >
                ✓ Done
              </Button>
            </HStack>
          )}
        </Stack>
      </CardBody>

      {/* Quick Order Sheet (pre-filled from followup) */}
      <AddOrderSheet
        isOpen={orderOpen}
        onClose={closeOrder}
        onCreated={handleOrderCreated}
        customer={{
          id: followup.customer_id,
          name: followup.customer_name,
          phone: followup.customer_phone,
        }}
        prefillProduct={followup.product_interest}
      />

      <AlertDialog isOpen={confirmOpen} leastDestructiveRef={cancelRef} onClose={closeConfirm} isCentered>
        <AlertDialogOverlay>
          <AlertDialogContent rounded="2xl" mx={4} shadow="2xl">
            <AlertDialogHeader fontSize="md" fontFamily="heading">Delete follow-up?</AlertDialogHeader>
            <AlertDialogBody fontSize="sm" color="gray.500">
              This cannot be undone.
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={closeConfirm} variant="ghost">Cancel</Button>
              <Button colorScheme="red" onClick={remove} ml={2}>Delete</Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Card>
  );
}
