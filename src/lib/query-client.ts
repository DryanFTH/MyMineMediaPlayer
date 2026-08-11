import { QueryClient } from '@tanstack/react-query';

const DEFAULT_STALE_TIME = 5 * 60 * 1000;
const DEFAULT_GC_TIME = 30 * 60 * 1000;

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: DEFAULT_STALE_TIME,
            gcTime: DEFAULT_GC_TIME,
            refetchOnWindowFocus: false,
            retry: (failureCount, error) => {
                if (error instanceof Error) {
                    return failureCount < 1;
                }
                return false;
            },
            retryDelay: attempt => Math.min(1000 * 2 ** attempt, 5000),
        },
        mutations: {
            retry: 0,
        },
    },
});
