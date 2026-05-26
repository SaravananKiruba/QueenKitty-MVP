/**
 * CustomerSearchSelector
 * Reusable, debounced customer search widget.
 *
 * Calls existing GET /customers?q= (already tenant-safe, LIKE search).
 * When the seller selects a result, onSelect(customer) is called.
 * The parent form keeps its own editable fields — this only triggers auto-fill.
 *
 * Used in: AddFollowupSheet, AddOrderSheet
 */

import {
  Box, Input, InputGroup, InputLeftElement, InputRightElement,
  List, ListItem, Text, Spinner, HStack, Icon,
} from '@chakra-ui/react';
import { useState, useRef, useEffect, useCallback } from 'react';
import { customersApi } from '@/lib/followups';

export default function CustomerSearchSelector({
  onSelect,
  placeholder = 'Search by name or phone…',
  label       = null,
}) {
  const [query,   setQuery]   = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open,    setOpen]    = useState(false);
  const timer    = useRef(null);
  const wrapRef  = useRef(null);

  const doSearch = useCallback(async (q) => {
    if (q.trim().length < 2) { setResults([]); setOpen(false); return; }
    setLoading(true);
    try {
      const data = await customersApi.search(q);
      setResults(data.customers || []);
      setOpen(true);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => doSearch(val), 300);
  };

  const pick = (customer) => {
    setQuery('');
    setResults([]);
    setOpen(false);
    onSelect(customer);
  };

  const clear = () => {
    setQuery('');
    setResults([]);
    setOpen(false);
    clearTimeout(timer.current);
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <Box position="relative" ref={wrapRef}>
      {label && (
        <Text fontSize="xs" color="blue.500" fontWeight="semibold" mb={1}>
          {label}
        </Text>
      )}
      <InputGroup>
        <InputLeftElement pointerEvents="none">
          {/* Inline SVG magnifier — no icon lib dependency */}
          <Box as="svg" viewBox="0 0 24 24" w="4" h="4" fill="none" stroke="currentColor"
               strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" color="blue.400">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </Box>
        </InputLeftElement>

        <Input
          value={query}
          onChange={handleChange}
          onFocus={() => query.trim().length >= 2 && setOpen(true)}
          placeholder={placeholder}
          bg="blue.50"
          borderColor="blue.200"
          _placeholder={{ color: 'blue.400', fontSize: 'sm' }}
          _focus={{ borderColor: 'blue.400', boxShadow: '0 0 0 1px var(--chakra-colors-blue-400)' }}
          fontSize="sm"
          pl="9"
        />

        {loading && (
          <InputRightElement>
            <Spinner size="xs" color="blue.400" />
          </InputRightElement>
        )}
        {!loading && query.length > 0 && (
          <InputRightElement cursor="pointer" onClick={clear} color="gray.400" fontSize="xs">
            ✕
          </InputRightElement>
        )}
      </InputGroup>

      {/* Results dropdown */}
      {open && results.length > 0 && (
        <List
          position="absolute"
          zIndex={200}
          bg="white"
          w="full"
          boxShadow="lg"
          rounded="lg"
          mt={1}
          maxH="180px"
          overflowY="auto"
          border="1px solid"
          borderColor="blue.100"
        >
          {results.map((c) => (
            <ListItem
              key={c.id}
              px={3}
              py={2.5}
              cursor="pointer"
              _hover={{ bg: 'blue.50' }}
              _active={{ bg: 'blue.100' }}
              onClick={() => pick(c)}
            >
              <Text fontWeight="semibold" fontSize="sm" lineHeight="short">{c.name}</Text>
              <Text fontSize="xs" color="gray.500">
                {c.phone}{c.area ? ` · ${c.area}` : ''}
              </Text>
            </ListItem>
          ))}
        </List>
      )}

      {/* Empty state */}
      {open && results.length === 0 && !loading && query.trim().length >= 2 && (
        <Box
          position="absolute"
          zIndex={200}
          bg="white"
          w="full"
          boxShadow="md"
          rounded="lg"
          mt={1}
          px={3}
          py={2.5}
          border="1px solid"
          borderColor="gray.200"
        >
          <Text fontSize="sm" color="gray.400">No customers found — add below</Text>
        </Box>
      )}
    </Box>
  );
}
