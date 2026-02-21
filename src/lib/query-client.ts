import { QueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { extractError } from './api-client';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      retry: 2,
      refetchOnWindowFocus: false,
    },
    mutations: {
      onError: (error) => {
        toast({
          title: 'Error',
          description: extractError(error),
          variant: 'destructive',
        });
      },
    },
  },
});
