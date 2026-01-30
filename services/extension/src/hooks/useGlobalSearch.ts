import { useState, useEffect } from 'react';
import { api } from '../shared/api';
import { Message } from '../shared/types';

export function useGlobalSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.trim().length >= 2) {
        setLoading(true);
        try {
          const response = await api.searchMessages(query);
          setResults(response.data);
        } catch (error) {
          console.error('Search failed:', error);
          setResults([]);
        } finally {
          setLoading(false);
        }
      } else {
        setResults([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const clear = () => {
    setQuery('');
    setResults([]);
  };

  return { query, setQuery, results, loading, clear };
}
