import { useEffect, useRef, useState } from 'react';

import { useNavigate } from 'react-router';

import { useQueryClient } from '@tanstack/react-query';
import {
    AlertCircle,
    Archive,
    Check,
    ChevronDown,
    FileVideo,
    ImageOff,
    Loader2,
    Search as SearchIcon,
    Sparkles,
    Wand2,
    X,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import {
    type AnimeInformation,
    type ArchiveEntry,
    type EpisodeWithStatus,
    type GenreInformation,
    type RenameMapping,
    type SearchAnime,
    commands,
} from '@/types/bindings';

type MappingRow = {
    original_path: string;
    size: number;
    display: string;
    suffix: string;
    extension: string;
};

type SubmitPhase = 'idle' | 'saving' | 'extracting' | 'done' | 'error';

function basename(path: string) {
    const normalized = path.replace(/\\/g, '/');
    const parts = normalized.split('/');
    return parts[parts.length - 1] || path;
}

function extensionOf(filename: string) {
    const idx = filename.lastIndexOf('.');
    return idx > 0 ? filename.slice(idx) : '';
}

// Pecah "Otakudesu_FK.BU--01_360p.mp4" menjadi:
//   display: "Episode 1", suffix: "_360p", extension: ".mp4"
// Jika pola tidak cocok, fallback ke nama file tanpa extension sebagai
// display dan suffix kosong (extension tetap dipertahankan).
function parseArchiveFilename(
    path: string,
): Pick<MappingRow, 'display' | 'suffix' | 'extension'> {
    const base = basename(path);
    const extension = extensionOf(base) || '.mp4';
    const withoutExt = extension ? base.slice(0, base.length - extension.length) : base;

    const animeSepIndex = withoutExt.indexOf('--');
    if (animeSepIndex === -1) {
        return { display: withoutExt, suffix: '', extension };
    }

    const afterAnime = withoutExt.slice(animeSepIndex + 2); // "01_360p"
    const resSepIndex = afterAnime.lastIndexOf('_');
    if (resSepIndex === -1) {
        return { display: afterAnime, suffix: '', extension };
    }

    const episodePart = afterAnime.slice(0, resSepIndex); // "01"
    const resolutionPart = afterAnime.slice(resSepIndex + 1); // "360p"
    const episodeNumber = parseInt(episodePart, 10);
    const display = Number.isNaN(episodeNumber)
        ? episodePart
        : `Episode ${episodeNumber}`;

    return { display, suffix: `_${resolutionPart}`, extension };
}

function finalMappingName(m: Pick<MappingRow, 'display' | 'suffix' | 'extension'>) {
    return `${m.display.trim().replace(/\s+/g, '_')}${m.suffix}${m.extension}`;
}

function finalMappingBaseName(m: Pick<MappingRow, 'display' | 'suffix'>) {
    return `${m.display.trim().replace(/\s+/g, '_')}${m.suffix}`;
}

const ID_TO_EN_MONTH: Record<string, string> = {
    Jan: 'Jan',
    Feb: 'Feb',
    Mar: 'Mar',
    Apr: 'Apr',
    Mei: 'May',
    Jun: 'Jun',
    Jul: 'Jul',
    Agu: 'Aug',
    Ags: 'Aug',
    Sep: 'Sep',
    Okt: 'Oct',
    Nov: 'Nov',
    Des: 'Dec',
};

function translateIndonesianDate(dateStr: string) {
    if (!dateStr) return dateStr;
    const match = dateStr.match(/^([A-Za-z]+)(\s.*)$/);
    if (!match) return dateStr;

    const [, month, rest] = match;
    const key = month.charAt(0).toUpperCase() + month.slice(1).toLowerCase();
    const translated = ID_TO_EN_MONTH[key];
    return translated ? `${translated}${rest}` : dateStr;
}

function formatBytes(bytes: number) {
    const mb = bytes / (1024 * 1024);
    return mb >= 1 ? `${mb.toFixed(1)} MB` : `${(bytes / 1024).toFixed(0)} KB`;
}

export default () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const searchWrapRef = useRef<HTMLDivElement>(null);

    const [archiveEntries, setArchiveEntries] = useState<ArchiveEntry[] | null>(null);
    const [mappings, setMappings] = useState<MappingRow[]>([]);
    const [pickingArchive, setPickingArchive] = useState(false);
    const [archiveError, setArchiveError] = useState<string | null>(null);

    const [searchOpen, setSearchOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [debouncedQuery, setDebouncedQuery] = useState('');
    const [searchResults, setSearchResults] = useState<SearchAnime[]>([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [searchError, setSearchError] = useState<string | null>(null);
    const [searched, setSearched] = useState(false);
    const [fetchingInfo, setFetchingInfo] = useState(false);
    const [filledFrom, setFilledFrom] = useState<string | null>(null);
    const [fetchedEpisodes, setFetchedEpisodes] = useState<EpisodeWithStatus[]>([]);

    const [animeFolder, setAnimeFolder] = useState('');
    const [judul, setJudul] = useState('');
    const [japanese, setJapanese] = useState('');
    const [score, setScore] = useState('');
    const [produser, setProduser] = useState('');
    const [tipe, setTipe] = useState('');
    const [status, setStatus] = useState('');
    const [tanggalRilis, setTanggalRilis] = useState('');
    const [studio, setStudio] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [sinopsis, setSinopsis] = useState('');

    const [genreOptions, setGenreOptions] = useState<GenreInformation[]>([]);
    const [selectedGenres, setSelectedGenres] = useState<GenreInformation[]>([]);
    const [genrePickerOpen, setGenrePickerOpen] = useState(false);

    const [submitPhase, setSubmitPhase] = useState<SubmitPhase>('idle');
    const [submitError, setSubmitError] = useState<string | null>(null);

    useEffect(() => {
        commands.getGenreList().then(setGenreOptions);
    }, []);

    useEffect(() => {
        const timeout = setTimeout(() => setDebouncedQuery(query.trim()), 400);
        return () => clearTimeout(timeout);
    }, [query]);

    useEffect(() => {
        if (!searchOpen) return;
        if (!debouncedQuery) {
            setSearchResults([]);
            setSearched(false);
            setSearchError(null);
            return;
        }

        let mounted = true;
        (async () => {
            setSearchLoading(true);
            setSearchError(null);
            const res = await commands.searchAnime(debouncedQuery);
            if (!mounted) return;
            if (res.status === 'ok') {
                setSearchResults(res.data);
            } else {
                setSearchError(res.error);
                setSearchResults([]);
            }
            setSearched(true);
            setSearchLoading(false);
        })();
        return () => {
            mounted = false;
        };
    }, [debouncedQuery, searchOpen]);

    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (
                searchWrapRef.current &&
                !searchWrapRef.current.contains(e.target as Node)
            ) {
                setSearchResults([]);
            }
        }
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    async function handlePickArchive() {
        setArchiveError(null);
        setPickingArchive(true);
        const res = await commands.getVideosInArchive();
        setPickingArchive(false);

        if (res.status === 'ok') {
            if (res.data.length === 0) {
                setArchiveError(
                    'Tidak ada file .mp4 yang ditemukan di dalam arsip tersebut.',
                );
                return;
            }
            setArchiveEntries(res.data);
            setMappings(
                res.data.map(entry => ({
                    original_path: entry.original_path,
                    size: entry.size,
                    ...parseArchiveFilename(entry.original_path),
                })),
            );
        } else {
            setArchiveError(res.error);
        }
    }

    function handleResetArchive() {
        setArchiveEntries(null);
        setMappings([]);
        setArchiveError(null);
    }

    function updateMappingDisplay(index: number, value: string) {
        setMappings(prev =>
            prev.map((m, i) => (i === index ? { ...m, display: value } : m)),
        );
    }

    function autoFillMappingFromEpisodes() {
        if (!fetchedEpisodes.length) return;
        setMappings(prev =>
            prev.map((m, i) => {
                const ep = fetchedEpisodes[i];
                if (!ep) return m;
                return { ...m, display: ep.info.name };
            }),
        );
    }

    async function handleSelectSearchResult(anime: SearchAnime) {
        setFetchingInfo(true);
        setSearchError(null);
        const res = await commands.getAnimeInformation(anime.anime_name);
        setFetchingInfo(false);

        if (res.status === 'error') {
            setSearchError(res.error);
            return;
        }

        const info = res.data;
        setJudul(info.judul);
        setJapanese(info.japanese);
        setScore(info.score);
        setProduser(info.produser);
        setTipe(info.tipe);
        setStatus(info.status);
        setTanggalRilis(translateIndonesianDate(info.tanggal_rilis));
        setStudio(info.studio);
        setImageUrl(info.image_url);
        setSinopsis(info.sinopsis.join('\n\n'));
        setSelectedGenres(info.genres);
        setFetchedEpisodes(info.episodes);
        setFilledFrom(info.judul);

        setAnimeFolder(anime.anime_name);

        setSearchOpen(false);
        setQuery('');
        setSearchResults([]);
        setSearched(false);
    }

    function toggleGenre(genre: GenreInformation) {
        setSelectedGenres(prev =>
            prev.some(g => g.name === genre.name)
                ? prev.filter(g => g.name !== genre.name)
                : [...prev, genre],
        );
    }

    const canSubmit =
        !!archiveEntries &&
        archiveEntries.length > 0 &&
        animeFolder.trim().length > 0 &&
        judul.trim().length > 0 &&
        mappings.every(m => m.display.trim().length > 0) &&
        submitPhase !== 'saving' &&
        submitPhase !== 'extracting';

    async function handleSubmit() {
        if (!canSubmit || !archiveEntries) return;

        setSubmitError(null);

        const episodes: EpisodeWithStatus[] = mappings.map(m => ({
            info: {
                name: finalMappingBaseName(m),
                date: tanggalRilis,
                url: '',
            },
            downloaded_resolutions: [],
        }));

        const animeInformation: AnimeInformation = {
            image_url: imageUrl,
            judul,
            japanese,
            score,
            produser,
            tipe,
            status,
            tanggal_rilis: tanggalRilis,
            studio,
            genres: selectedGenres,
            sinopsis: sinopsis
                .split('\n')
                .map(line => line.trim())
                .filter(Boolean),
            episodes,
        };

        setSubmitPhase('saving');
        await commands.saveAnimeInformation(animeFolder, animeInformation);

        const renameMappings: RenameMapping[] = mappings.map(m => ({
            original_path: m.original_path,
            new_name: finalMappingName(m),
        }));

        setSubmitPhase('extracting');
        const extractRes = await commands.extractVideosFromArchive(
            animeFolder,
            renameMappings,
        );

        if (extractRes.status === 'error') {
            setSubmitPhase('error');
            setSubmitError(
                `Informasi anime tersimpan, tapi ekstraksi video gagal: ${extractRes.error}`,
            );
            return;
        }

        queryClient.invalidateQueries({ queryKey: ['anime-library'] });
        queryClient.invalidateQueries({ queryKey: ['anime-by-genre-library'] });
        setSubmitPhase('done');
        navigate(`/library/anime/${animeFolder}`);
    }

    return (
        <div className='mx-auto w-full max-w-5xl px-6 py-10 pb-16'>
            <div className='mb-8'>
                <h1
                    className='text-xl font-semibold leading-tight text-foreground'
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                    Tambah dari Batch
                </h1>
                <p className='text-xs text-muted-foreground'>
                    Ekstrak video dari arsip .zip / .rar dan tambahkan ke library
                </p>
            </div>

            {/* Step 1: pilih arsip */}
            <Card className='mb-6'>
                <CardHeader className='pb-2'>
                    <CardTitle className='text-sm font-medium'>1. Pilih Arsip</CardTitle>
                </CardHeader>
                <CardContent>
                    {!archiveEntries ? (
                        <>
                            <Button
                                onClick={handlePickArchive}
                                disabled={pickingArchive}
                                className='gap-2'
                            >
                                {pickingArchive ? (
                                    <Loader2 className='h-4 w-4 animate-spin' />
                                ) : (
                                    <Archive className='h-4 w-4' />
                                )}
                                {pickingArchive
                                    ? 'Membaca arsip…'
                                    : 'Pilih Arsip (.zip / .rar)'}
                            </Button>

                            {archiveError && (
                                <div className='mt-4 flex items-start gap-2 rounded-lg border border-primary/20 bg-card px-3 py-2.5 text-xs text-foreground'>
                                    <AlertCircle className='mt-0.5 h-3.5 w-3.5 shrink-0' />
                                    <span>{archiveError}</span>
                                </div>
                            )}
                        </>
                    ) : (
                        <div>
                            <div className='mb-3 flex items-center justify-between'>
                                <p className='flex items-center gap-1.5 text-sm text-foreground'>
                                    <Check className='h-3.5 w-3.5 text-primary' />
                                    {archiveEntries.length} video ditemukan
                                </p>
                                <Button
                                    size='sm'
                                    variant='ghost'
                                    onClick={handleResetArchive}
                                    className='h-7 text-xs text-muted-foreground'
                                >
                                    Pilih arsip lain
                                </Button>
                            </div>
                            <ul className='space-y-1'>
                                {archiveEntries.map(entry => (
                                    <li
                                        key={entry.original_path}
                                        className='flex items-center gap-2 truncate rounded-md bg-background px-3 py-1.5 text-xs text-muted-foreground'
                                    >
                                        <FileVideo className='h-3.5 w-3.5 shrink-0' />
                                        <span className='truncate'>
                                            {basename(entry.original_path)}
                                        </span>
                                        <span className='ml-auto shrink-0 font-mono text-[10px] text-muted-foreground/70'>
                                            {formatBytes(entry.size)}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </CardContent>
            </Card>

            {archiveEntries && (
                <>
                    {/* Step 2: informasi anime */}
                    <Card className='mb-6'>
                        <CardHeader className='pb-2'>
                            <CardTitle className='text-sm font-medium'>
                                2. Informasi Anime
                            </CardTitle>
                        </CardHeader>
                        <CardContent className='space-y-5'>
                            <div ref={searchWrapRef} className='relative'>
                                {!searchOpen ? (
                                    <Button
                                        variant='outline'
                                        size='sm'
                                        onClick={() => setSearchOpen(true)}
                                        className='gap-1.5 text-xs'
                                    >
                                        <SearchIcon className='h-3.5 w-3.5' />
                                        Cari dari Otakudesu
                                    </Button>
                                ) : (
                                    <div className='relative'>
                                        <SearchIcon className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70' />
                                        <Input
                                            autoFocus
                                            value={query}
                                            onChange={e => setQuery(e.target.value)}
                                            placeholder='Ketik judul anime...'
                                            className='border-border bg-card pl-9 pr-9 text-sm text-foreground'
                                        />
                                        <button
                                            onClick={() => {
                                                setSearchOpen(false);
                                                setQuery('');
                                                setSearchResults([]);
                                            }}
                                            className='absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/70 hover:text-foreground'
                                        >
                                            <X className='h-4 w-4' />
                                        </button>

                                        {(searchLoading ||
                                            searchError ||
                                            (searched && query)) && (
                                            <div className='absolute z-10 mt-1.5 w-full overflow-hidden rounded-lg border border-border bg-card shadow-lg'>
                                                {searchLoading && (
                                                    <div className='flex items-center justify-center py-6'>
                                                        <Loader2 className='h-4 w-4 animate-spin text-muted-foreground' />
                                                    </div>
                                                )}
                                                {!searchLoading && searchError && (
                                                    <div className='px-4 py-3 text-xs text-foreground'>
                                                        {searchError}
                                                    </div>
                                                )}
                                                {!searchLoading &&
                                                    !searchError &&
                                                    searched &&
                                                    searchResults.length === 0 && (
                                                        <div className='px-4 py-3 text-xs text-muted-foreground/70'>
                                                            Tidak ada anime ditemukan
                                                        </div>
                                                    )}
                                                {!searchLoading &&
                                                    searchResults.length > 0 && (
                                                        <ul className='max-h-72 overflow-y-auto'>
                                                            {searchResults.map(anime => (
                                                                <li
                                                                    key={anime.anime_name}
                                                                >
                                                                    <button
                                                                        onClick={() =>
                                                                            handleSelectSearchResult(
                                                                                anime,
                                                                            )
                                                                        }
                                                                        disabled={
                                                                            fetchingInfo
                                                                        }
                                                                        className='flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-background disabled:opacity-50'
                                                                    >
                                                                        <div className='h-12 w-9 shrink-0 overflow-hidden rounded bg-background'>
                                                                            {anime.image_url ? (
                                                                                <img
                                                                                    src={
                                                                                        anime.image_url
                                                                                    }
                                                                                    alt={
                                                                                        anime.judul
                                                                                    }
                                                                                    className='h-full w-full object-cover'
                                                                                />
                                                                            ) : (
                                                                                <div className='flex h-full items-center justify-center'>
                                                                                    <ImageOff className='h-3.5 w-3.5 text-muted-foreground/70' />
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                        <div className='min-w-0 flex-1'>
                                                                            <p className='truncate text-xs font-medium text-foreground'>
                                                                                {
                                                                                    anime.judul
                                                                                }
                                                                            </p>
                                                                            <p className='truncate text-[10px] text-muted-foreground/70'>
                                                                                {
                                                                                    anime.status
                                                                                }
                                                                            </p>
                                                                        </div>
                                                                        {fetchingInfo && (
                                                                            <Loader2 className='h-3.5 w-3.5 shrink-0 animate-spin text-muted-foreground' />
                                                                        )}
                                                                    </button>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    )}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {filledFrom && !searchOpen && (
                                    <p className='mt-2 flex items-center gap-1.5 text-xs text-primary'>
                                        <Sparkles className='h-3.5 w-3.5' />
                                        Diisi otomatis dari "{filledFrom}"
                                    </p>
                                )}
                            </div>

                            <div className='grid gap-4 sm:grid-cols-2'>
                                <div className='space-y-1.5'>
                                    <Label className='text-xs text-muted-foreground'>
                                        Nama Folder Library
                                    </Label>
                                    <Input
                                        value={animeFolder}
                                        onChange={e => {
                                            setAnimeFolder(e.target.value);
                                        }}
                                        placeholder='Nama folder unik untuk anime ini'
                                        className='text-sm'
                                    />
                                </div>
                                <div className='space-y-1.5'>
                                    <Label className='text-xs text-muted-foreground'>
                                        Judul
                                    </Label>
                                    <Input
                                        value={judul}
                                        onChange={e => setJudul(e.target.value)}
                                        placeholder='Judul anime'
                                        className='text-sm'
                                    />
                                </div>
                                <div className='space-y-1.5'>
                                    <Label className='text-xs text-muted-foreground'>
                                        Judul Jepang
                                    </Label>
                                    <Input
                                        value={japanese}
                                        onChange={e => setJapanese(e.target.value)}
                                        className='text-sm'
                                    />
                                </div>
                                <div className='space-y-1.5'>
                                    <Label className='text-xs text-muted-foreground'>
                                        Skor
                                    </Label>
                                    <Input
                                        value={score}
                                        onChange={e => setScore(e.target.value)}
                                        className='text-sm'
                                    />
                                </div>
                                <div className='space-y-1.5'>
                                    <Label className='text-xs text-muted-foreground'>
                                        Tipe
                                    </Label>
                                    <Input
                                        value={tipe}
                                        onChange={e => setTipe(e.target.value)}
                                        placeholder='TV / Movie / OVA'
                                        className='text-sm'
                                    />
                                </div>
                                <div className='space-y-1.5'>
                                    <Label className='text-xs text-muted-foreground'>
                                        Status
                                    </Label>
                                    <Input
                                        value={status}
                                        onChange={e => setStatus(e.target.value)}
                                        placeholder='Ongoing / Completed'
                                        className='text-sm'
                                    />
                                </div>
                                <div className='space-y-1.5'>
                                    <Label className='text-xs text-muted-foreground'>
                                        Tanggal Rilis
                                    </Label>
                                    <Input
                                        value={tanggalRilis}
                                        onChange={e => setTanggalRilis(e.target.value)}
                                        className='text-sm'
                                    />
                                </div>
                                <div className='space-y-1.5'>
                                    <Label className='text-xs text-muted-foreground'>
                                        Studio
                                    </Label>
                                    <Input
                                        value={studio}
                                        onChange={e => setStudio(e.target.value)}
                                        className='text-sm'
                                    />
                                </div>
                                <div className='space-y-1.5'>
                                    <Label className='text-xs text-muted-foreground'>
                                        Produser
                                    </Label>
                                    <Input
                                        value={produser}
                                        onChange={e => setProduser(e.target.value)}
                                        className='text-sm'
                                    />
                                </div>
                                <div className='space-y-1.5'>
                                    <Label className='text-xs text-muted-foreground'>
                                        URL Gambar
                                    </Label>
                                    <Input
                                        value={imageUrl}
                                        onChange={e => setImageUrl(e.target.value)}
                                        placeholder='https://...'
                                        className='text-sm'
                                    />
                                </div>
                            </div>

                            <div className='space-y-1.5'>
                                <Label className='text-xs text-muted-foreground'>
                                    Genre
                                </Label>
                                <div className='relative'>
                                    <button
                                        type='button'
                                        onClick={() => setGenrePickerOpen(o => !o)}
                                        className='flex min-h-9 w-full flex-wrap items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-left'
                                    >
                                        {selectedGenres.length === 0 && (
                                            <span className='text-sm text-muted-foreground/70'>
                                                Pilih genre
                                            </span>
                                        )}
                                        {selectedGenres.map(g => (
                                            <Badge
                                                key={g.name}
                                                variant='secondary'
                                                className='bg-background text-[10px] text-muted-foreground'
                                            >
                                                {g.display}
                                            </Badge>
                                        ))}
                                        <ChevronDown className='ml-auto h-3.5 w-3.5 shrink-0 text-muted-foreground/70' />
                                    </button>

                                    {genrePickerOpen && (
                                        <div className='absolute z-10 mt-1.5 max-h-56 w-full overflow-y-auto rounded-lg border border-border bg-card p-1.5 shadow-lg'>
                                            {genreOptions.map(g => {
                                                const active = selectedGenres.some(
                                                    s => s.name === g.name,
                                                );
                                                return (
                                                    <button
                                                        key={g.name}
                                                        type='button'
                                                        onClick={() => toggleGenre(g)}
                                                        className={cn(
                                                            'flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left text-xs',
                                                            active
                                                                ? 'bg-primary/10 text-primary'
                                                                : 'text-foreground hover:bg-background',
                                                        )}
                                                    >
                                                        {g.display}
                                                        {active && (
                                                            <Check className='h-3.5 w-3.5' />
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className='space-y-1.5'>
                                <Label className='text-xs text-muted-foreground'>
                                    Sinopsis
                                </Label>
                                <Textarea
                                    value={sinopsis}
                                    onChange={e => setSinopsis(e.target.value)}
                                    placeholder='Satu paragraf per baris'
                                    rows={5}
                                    className='text-sm'
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Step 3: pemetaan nama episode */}
                    <Card className='mb-6'>
                        <CardHeader className='pb-2'>
                            <div className='flex items-center justify-between'>
                                <CardTitle className='text-sm font-medium'>
                                    3. Pemetaan Nama Episode
                                </CardTitle>
                                {fetchedEpisodes.length > 0 && (
                                    <Button
                                        size='sm'
                                        variant='ghost'
                                        onClick={autoFillMappingFromEpisodes}
                                        className='h-7 gap-1.5 text-xs text-muted-foreground'
                                    >
                                        <Wand2 className='h-3.5 w-3.5' />
                                        Isi otomatis dari episode
                                    </Button>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className='space-y-2'>
                            {mappings.map((m, i) => (
                                <div
                                    key={m.original_path}
                                    className='flex items-center gap-3'
                                >
                                    <span className='w-6 shrink-0 text-right text-xs text-muted-foreground/70'>
                                        {i + 1}
                                    </span>
                                    <div className='min-w-0 flex-1'>
                                        <p className='truncate text-xs text-muted-foreground/70'>
                                            {basename(m.original_path)}
                                        </p>
                                    </div>
                                    <div className='flex w-72 shrink-0 items-center gap-1.5'>
                                        <Input
                                            value={m.display}
                                            onChange={e =>
                                                updateMappingDisplay(i, e.target.value)
                                            }
                                            placeholder='Episode 1'
                                            className='text-sm'
                                        />
                                        {(m.suffix || m.extension) && (
                                            <span className='shrink-0 whitespace-nowrap font-mono text-[10px] text-muted-foreground/70'>
                                                {m.suffix}
                                                {m.extension}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    {submitError && (
                        <div className='mb-4 flex items-start gap-2 rounded-lg border border-primary/20 bg-card px-3 py-2.5 text-xs text-foreground'>
                            <AlertCircle className='mt-0.5 h-3.5 w-3.5 shrink-0' />
                            <span>{submitError}</span>
                        </div>
                    )}

                    <Button
                        onClick={handleSubmit}
                        disabled={!canSubmit}
                        className='w-full gap-2'
                    >
                        {submitPhase === 'saving' && (
                            <>
                                <Loader2 className='h-4 w-4 animate-spin' />
                                Menyimpan informasi anime…
                            </>
                        )}
                        {submitPhase === 'extracting' && (
                            <>
                                <Loader2 className='h-4 w-4 animate-spin' />
                                Mengekstrak video…
                            </>
                        )}
                        {(submitPhase === 'idle' || submitPhase === 'error') && (
                            <>
                                <Check className='h-4 w-4' />
                                Simpan dan Ekstrak
                            </>
                        )}
                    </Button>
                </>
            )}
        </div>
    );
};
