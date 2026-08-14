import { useEffect, useMemo, useState } from 'react';

import { Loader2 } from 'lucide-react';

import { AnimeByGenreResults } from '@/components/library/genre/AnimeByGenreResults';
import { GenrePicker } from '@/components/library/genre/GenrePicker';
import { SelectedGenresBar } from '@/components/library/genre/SelectedGenresBar';
import { type Genre, commands } from '@/types/bindings';

export default function GenreLibraryPage() {
    const [genres, setGenres] = useState<Genre[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [selectedGenres, setSelectedGenres] = useState<Genre[]>([]);

    useEffect(() => {
        let mounted = true;
        (async () => {
            setLoading(true);
            const result = await commands.getGenreListLibrary();
            if (!mounted) return;

            if (result.status === 'ok') {
                setGenres(result.data);
            } else {
                setLoadError('Gagal memuat daftar genre');
            }
            setLoading(false);
        })();
        return () => {
            mounted = false;
        };
    }, []);

    const selectedIds = useMemo(
        () => new Set(selectedGenres.map(g => g.id)),
        [selectedGenres],
    );

    function toggleGenre(genre: Genre) {
        setSelectedGenres(prev =>
            prev.some(g => g.id === genre.id)
                ? prev.filter(g => g.id !== genre.id)
                : [...prev, genre],
        );
    }

    function removeGenre(genre: Genre) {
        setSelectedGenres(prev => prev.filter(g => g.id !== genre.id));
    }

    if (loading) {
        return (
            <Loader2 className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-5 w-5 animate-spin text-muted-foreground' />
        );
    }

    if (loadError) {
        return (
            <div className='mx-auto max-w-4xl px-6 py-10 text-sm text-muted-foreground'>
                {loadError}
            </div>
        );
    }

    return (
        <div className='mx-auto w-full max-w-5xl px-6 py-10 pb-16'>
            <div className='mb-6 flex flex-col gap-1.5'>
                <h1
                    className='text-2xl font-semibold leading-tight text-foreground'
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                    Genre
                </h1>
                <p className='text-sm text-muted-foreground/70'>
                    Pilih satu atau lebih genre untuk melihat anime di library
                </p>
            </div>

            <GenrePicker
                genres={genres}
                selectedIds={selectedIds}
                onToggle={toggleGenre}
            />

            <SelectedGenresBar
                genres={selectedGenres}
                onRemove={removeGenre}
                onClear={() => setSelectedGenres([])}
            />

            <AnimeByGenreResults selectedGenreIds={selectedGenres.map(g => g.id)} />
        </div>
    );
}
