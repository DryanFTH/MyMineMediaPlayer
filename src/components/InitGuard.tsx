import { Navigate, useLocation } from 'react-router';

import { InitContext } from '@/hooks/useInitContext';
import useInitStatus from '@/hooks/useInitStatus';

export default ({ children }: { children: React.ReactNode }) => {
    const { status, loading } = useInitStatus();
    const location = useLocation();

    if (loading) {
        return <div>Loading...</div>;
    }

    const needInit = !status?.is_initialized || !status?.has_store_anime_directory;

    if (needInit && location.pathname !== '/onboarding') {
        return <Navigate to='/onboarding' replace />;
    }

    if (!needInit && location.pathname === '/onboarding') {
        return <Navigate to='/' replace />;
    }

    return <InitContext value={{ initStatus: status }}>{children}</InitContext>;
};
