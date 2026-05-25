import {
  Card, CardBody, Stack, HStack, Text, Badge, IconButton, Button, Box,
  Menu, MenuButton, MenuList, MenuItem, useDisclosure,
  AlertDialog, AlertDialogBody, AlertDialogFooter, AlertDialogHeader,
  AlertDialogContent, AlertDialogOverlay, Link,
} from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';
import { useRef, useState } from 'react';
import { followupsApi, whatsappLink, telLink } from '@/lib/followups';

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

  return (
    <Card rounded="2xl" shadow="sm" borderWidth={overdue ? '1px' : 0} borderColor="red.200">
      <CardBody>
        <Stack spacing={3}>
          <HStack justify="space-between" align="start">
            <Box>
              <HStack spacing={2} mb={1}>
                <Badge
                  colorScheme={overdue ? 'red' : followup.is_completed ? 'green' : 'brand'}
                  rounded="full"
                  px={2}
                >
                  {followup.is_completed ? 'Done' : relativeDay(followup.followup_date)}
                </Badge>
                <Text fontSize="xs" color="gray.500">{formatDate(followup.followup_date)}</Text>
              </HStack>
              <Text fontWeight="bold" fontSize="lg" lineHeight="short">
                <Link as={RouterLink} to={`/customers/${followup.customer_id}`} _hover={{ textDecoration: 'underline' }}>
                  {followup.customer_name}
                </Link>
              </Text>
              <Text color="gray.700" fontSize="sm">{followup.product_interest}</Text>
              {followup.notes && (
                <Text color="gray.500" fontSize="sm" fontStyle="italic" mt={1}>
                  “{followup.notes}”
                </Text>
              )}
            </Box>

            <Menu>
              <MenuButton as={IconButton} variant="ghost" size="sm" aria-label="More"
                icon={<Text fontSize="lg" lineHeight="1">⋮</Text>} />
              <MenuList>
                <MenuItem onClick={() => act(() => followupsApi.snooze(followup.id, 1))}>
                  Snooze 1 day
                </MenuItem>
                <MenuItem onClick={() => act(() => followupsApi.snooze(followup.id, 3))}>
                  Snooze 3 days
                </MenuItem>
                <MenuItem onClick={() => act(() => followupsApi.snooze(followup.id, 7))}>
                  Snooze 1 week
                </MenuItem>
                <MenuItem color="red.500" onClick={openConfirm}>Delete</MenuItem>
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
              >
                WhatsApp
              </Button>
              <Button
                as="a"
                href={telLink(followup.customer_phone)}
                variant="outline"
                size="sm"
                flex="1"
              >
                Call
              </Button>
              <Button
                size="sm"
                variant="solid"
                colorScheme="green"
                isLoading={busy}
                onClick={() => act(() => followupsApi.done(followup.id))}
                flex="1"
              >
                Done
              </Button>
            </HStack>
          )}
        </Stack>
      </CardBody>

      <AlertDialog isOpen={confirmOpen} leastDestructiveRef={cancelRef} onClose={closeConfirm} isCentered>
        <AlertDialogOverlay>
          <AlertDialogContent rounded="2xl" mx={4}>
            <AlertDialogHeader fontSize="md">Delete follow-up?</AlertDialogHeader>
            <AlertDialogBody fontSize="sm" color="gray.600">
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
