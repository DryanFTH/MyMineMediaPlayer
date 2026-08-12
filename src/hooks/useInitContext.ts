import { createContext, useContext } from 'react';

import { InitStatus } from '@/types/bindings';

export const InitContext = createContext<{ initStatus: InitStatus | null } | undefined>(
    undefined,
);

export const useInitContext = () => {
    const ctx = useContext(InitContext);
    if (!ctx) throw new Error('useFilters must be used inside FilterProvider');
    return ctx;
};
