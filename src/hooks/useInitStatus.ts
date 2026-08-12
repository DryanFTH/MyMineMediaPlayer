import { useEffect, useState } from 'react';

import { useLocation } from 'react-router';

import { InitStatus, commands } from '@/types/bindings';

export default () => {
    const location = useLocation();

    const [status, setStatus] = useState<InitStatus | null>(null);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        commands
            .checkInitStatus()
            .then(value => {
                if (value.status === 'error') {
                    setStatus(null);
                    return;
                }

                setStatus(value.data);
            })
            .catch(() => {
                setStatus({
                    is_initialized: false,
                    has_store_anime_directory: false,
                    has_youtube_download_directory: false,
                });
            })
            .finally(() => setLoading(false));
    }, [location]);

    return { status, loading };
};
