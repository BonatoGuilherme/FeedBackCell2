import { useState, useCallback } from 'react';
import { api } from '@/src/lib/api';

export function useApi() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const request = useCallback(async (method: 'GET' | 'POST' | 'PUT' | 'DELETE', endpoint: string, data?: any) => {
    setLoading(true);
    setError(null);

    try {
      let result;
      
      if (method === 'GET') {
        result = await api.get(endpoint);
      } else if (method === 'POST') {
        result = await api.post(endpoint, data);
      } else if (method === 'PUT') {
        result = await api.put(endpoint, data);
      } else if (method === 'DELETE') {
        result = await api.delete(endpoint);
      }

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { request, loading, error };
}
