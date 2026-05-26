/**
 * ProductSearchSelector
 * Reusable, debounced product search widget.
 *
 * Calls GET /products?q= which returns:
 *   - System products (user_id IS NULL, visible to all)
 *   - Seller-custom products (seller's own)
 *
 * When the seller selects a product, onSelect(product) is called.
 * The parent form keeps its own editable fields — this only triggers auto-fill.
 * Seller can always ignore this and type freely in the product_name Input below.
 *
 * Used in: AddOrderSheet
 */

import {
  Box, Input, InputGroup, InputLeftElement, InputRightElement,
  List, ListItem, Text, Spinner, Badge,
} from '@chakra-ui/react';
import { useState, useRef, useEffect, useCallback } from 'react';
import { productsApi } from '@/lib/followups';

const CATEGORY_LABELS = {
  kitchen: 'Kitchen',
  bottle:  'Bottle',
  storage: 'Storage',
  other:   'Other',
};

export default function ProductSearchSelector({
  onSelect,
  placeholder = 'Product name or code…',
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
      const data = await productsApi.search(q);
      setResults(data.products || []);
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

  const pick = (product) => {
    setQuery('');
    setResults([]);
    setOpen(false);
    onSelect(product);
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
        <Text fontSize="xs" color="green.600" fontWeight="semibold" mb={1}>
          {label}
        </Text>
      )}
      <InputGroup>
        <InputLeftElement pointerEvents="none">
          {/* Inline SVG box/product icon */}
          <Box as="svg" viewBox="0 0 24 24" w="4" h="4" fill="none" stroke="currentColor"
               strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" color="green.500">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          </Box>
        </InputLeftElement>

        <Input
          value={query}
          onChange={handleChange}
          onFocus={() => query.trim().length >= 2 && setOpen(true)}
          placeholder={placeholder}
          bg="green.50"
          borderColor="green.200"
          _placeholder={{ color: 'green.500', fontSize: 'sm' }}
          _focus={{ borderColor: 'green.400', boxShadow: '0 0 0 1px var(--chakra-colors-green-400)' }}
          fontSize="sm"
          pl="9"
        />

        {loading && (
          <InputRightElement>
            <Spinner size="xs" color="green.500" />
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
          maxH="200px"
          overflowY="auto"
          border="1px solid"
          borderColor="green.100"
        >
          {results.map((p) => (
            <ListItem
              key={p.id}
              px={3}
              py={2.5}
              cursor="pointer"
              _hover={{ bg: 'green.50' }}
              _active={{ bg: 'green.100' }}
              onClick={() => pick(p)}
            >
              <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                <Text fontWeight="semibold" fontSize="sm" lineHeight="short" flex="1" mr={2}>
                  {p.product_name}
                </Text>
                <Badge
                  colorScheme={p.is_system ? 'blue' : 'purple'}
                  fontSize="2xs"
                  flexShrink={0}
                >
                  {p.is_system ? 'system' : 'custom'}
                </Badge>
              </Box>
              <Box display="flex" gap={2} mt={0.5} alignItems="center">
                {p.product_code && (
                  <Text fontSize="xs" color="gray.500">{p.product_code}</Text>
                )}
                <Text fontSize="xs" color="gray.400">
                  {CATEGORY_LABELS[p.category] || p.category}
                </Text>
                {p.default_price != null && (
                  <Text fontSize="xs" color="green.600" fontWeight="medium">
                    ₹{Number(p.default_price).toLocaleString()}
                  </Text>
                )}
                {p.mrp != null && p.mrp !== p.default_price && (
                  <Text fontSize="xs" color="gray.400" textDecoration="line-through">
                    ₹{Number(p.mrp).toLocaleString()}
                  </Text>
                )}
              </Box>
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
          <Text fontSize="sm" color="gray.400">No products found — type below</Text>
        </Box>
      )}
    </Box>
  );
}
