import { useEffect, useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import {
    Calendar,
    Check,
    FolderOpen,
    Link2,
    Loader2,
    RotateCcw,
    Save,
    Settings as SettingsIcon,
} from 'lucide-react';
import { Controller, useForm } from 'react-hook-form';

import { DayTagField } from '@/components/settings/DayTagField';
import { ErrorBanner } from '@/components/settings/ErrorBanner';
import { FolderField } from '@/components/settings/FolderField';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
    SettingsFormInput,
    SettingsFormValues,
    emptyDefaults,
    settingsSchema,
} from '@/lib/validations/settings';
import { type UpdateSettingsPayload, commands } from '@/types/bindings';

export const DAYS = [
    { key: 'monday', label: 'Senin' },
    { key: 'tuesday', label: 'Selasa' },
    { key: 'wednesday', label: 'Rabu' },
    { key: 'thursday', label: 'Kamis' },
    { key: 'friday', label: 'Jumat' },
    { key: 'saturday', label: 'Sabtu' },
    { key: 'sunday', label: 'Minggu' },
] as const;

export default () => {
    const queryClient = useQueryClient();

    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [savedFlash, setSavedFlash] = useState(false);
    const [pickingField, setPickingField] = useState<
        'anime_directory' | 'youtube_download_directory' | null
    >(null);

    const form = useForm<SettingsFormInput, unknown, SettingsFormValues>({
        resolver: zodResolver(settingsSchema),
        defaultValues: emptyDefaults,
        mode: 'onBlur',
    });

    const {
        control,
        handleSubmit,
        reset,
        setValue,
        formState: { isDirty, dirtyFields, isSubmitting },
    } = form;

    useEffect(() => {
        let mounted = true;
        (async () => {
            const res = await commands.getSettings();
            if (!mounted) return;
            if (res.status === 'ok') {
                reset({
                    otakudesu_url: res.data.otakudesu_url ?? '',
                    anime_directory: res.data.anime_directory ?? '',
                    youtube_download_directory: res.data.youtube_download_directory ?? '',
                    seasonal_anime: {
                        monday: res.data.seasonal_anime?.monday ?? [],
                        tuesday: res.data.seasonal_anime?.tuesday ?? [],
                        wednesday: res.data.seasonal_anime?.wednesday ?? [],
                        thursday: res.data.seasonal_anime?.thursday ?? [],
                        friday: res.data.seasonal_anime?.friday ?? [],
                        saturday: res.data.seasonal_anime?.saturday ?? [],
                        sunday: res.data.seasonal_anime?.sunday ?? [],
                    },
                });
            } else {
                setLoadError(res.error);
            }
            setLoading(false);
        })();
        return () => {
            mounted = false;
        };
    }, [reset]);

    async function handlePickFolder(
        field: 'anime_directory' | 'youtube_download_directory',
    ) {
        setPickingField(field);
        const res = await commands.pickFolder();
        if (res.status === 'ok' && res.data) {
            setValue(field, res.data, {
                shouldDirty: true,
                shouldValidate: true,
            });
        }
        setPickingField(null);
    }

    function buildDiffPayload(data: SettingsFormValues): UpdateSettingsPayload {
        return {
            otakudesu_url: dirtyFields.otakudesu_url ? data.otakudesu_url : null,
            anime_directory: dirtyFields.anime_directory ? data.anime_directory : null,
            youtube_download_directory: dirtyFields.youtube_download_directory
                ? data.youtube_download_directory
                : null,
            seasonal_anime: dirtyFields.seasonal_anime ? data.seasonal_anime : null,
        };
    }

    const onSubmit = async (data: SettingsFormValues) => {
        setSaveError(null);
        const payload = buildDiffPayload(data);

        const res = await commands.saveSettings(payload);
        if (res.status === 'ok') {
            reset(data);
            setSavedFlash(true);

            queryClient.invalidateQueries({ queryKey: ['seasonal-anime'] });

            setTimeout(() => setSavedFlash(false), 2200);
        } else {
            setSaveError(res.error);
        }
    };

    function handleDiscard() {
        reset();
        setSaveError(null);
    }

    if (loading) {
        return (
            <Loader2
                className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-5 w-5 animate-spin'
                style={{ color: '#A0A0A0' }}
            />
        );
    }

    return (
        <>
            <form
                onSubmit={handleSubmit(onSubmit)}
                className='relative mx-auto w-full max-w-4xl px-6 py-10 pb-32'
            >
                <div className='mb-8 flex items-center gap-3'>
                    <div
                        className='flex h-9 w-9 items-center justify-center rounded-lg'
                        style={{ background: '#3ECF8E1A' }}
                    >
                        <SettingsIcon
                            className='h-4.5 w-4.5'
                            style={{ color: '#3ECF8E' }}
                            strokeWidth={2}
                        />
                    </div>
                    <div>
                        <h1
                            className='text-xl font-semibold leading-tight'
                            style={{
                                fontFamily: "'Space Grotesk', sans-serif",
                                color: '#EDEDED',
                            }}
                        >
                            Pengaturan
                        </h1>
                        <p className='text-xs' style={{ color: '#A0A0A0' }}>
                            Kelola sumber data, folder unduhan, dan jadwal musiman
                        </p>
                    </div>
                </div>

                {loadError && <ErrorBanner className='mb-6'>{loadError}</ErrorBanner>}

                <Card
                    className='mb-5 border'
                    style={{ background: '#1C1C1C', borderColor: '#2E2E2E' }}
                >
                    <CardHeader className='pb-3'>
                        <CardTitle
                            className='flex items-center gap-2 text-sm font-medium'
                            style={{ color: '#EDEDED' }}
                        >
                            <Link2 className='h-4 w-4' style={{ color: '#A0A0A0' }} />
                            Sumber Data
                        </CardTitle>
                        <CardDescription className='text-xs' style={{ color: '#6E6E6E' }}>
                            URL basis situs yang dipakai untuk mengambil daftar episode
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Controller
                            control={control}
                            name='otakudesu_url'
                            render={({ field, fieldState }) => (
                                <Field data-invalid={fieldState.invalid}>
                                    <FieldLabel
                                        htmlFor='otakudesu_url'
                                        className='text-xs'
                                        style={{ color: '#A0A0A0' }}
                                    >
                                        Otakudesu URL
                                    </FieldLabel>
                                    <Input
                                        {...field}
                                        id='otakudesu_url'
                                        aria-invalid={fieldState.invalid}
                                        placeholder='https://otakudesu.blog'
                                        className='border font-mono text-sm'
                                        style={{
                                            background: '#121212',
                                            borderColor: '#2E2E2E',
                                            color: '#EDEDED',
                                            fontFamily: "'JetBrains Mono', monospace",
                                        }}
                                    />
                                    {fieldState.invalid && (
                                        <FieldError errors={[fieldState.error]} />
                                    )}
                                </Field>
                            )}
                        />
                    </CardContent>
                </Card>

                <Card
                    className='mb-5 border'
                    style={{ background: '#1C1C1C', borderColor: '#2E2E2E' }}
                >
                    <CardHeader className='pb-3'>
                        <CardTitle
                            className='flex items-center gap-2 text-sm font-medium'
                            style={{ color: '#EDEDED' }}
                        >
                            <FolderOpen
                                className='h-4 w-4'
                                style={{ color: '#A0A0A0' }}
                            />
                            Folder Unduhan
                        </CardTitle>
                        <CardDescription className='text-xs' style={{ color: '#6E6E6E' }}>
                            Lokasi penyimpanan episode anime dan video YouTube
                        </CardDescription>
                    </CardHeader>
                    <CardContent className='space-y-4'>
                        <FolderField
                            control={control}
                            name='anime_directory'
                            label='Folder Anime'
                            placeholder='Belum dipilih'
                            picking={pickingField === 'anime_directory'}
                            onPick={() => handlePickFolder('anime_directory')}
                        />
                        <Separator style={{ background: '#2E2E2E' }} />
                        {/* wee didn't use this yet, but we keep it for future use
                        <FolderField
                            control={control}
                            name='youtube_download_directory'
                            label='Folder YouTube'
                            placeholder='Belum dipilih'
                            picking={pickingField === 'youtube_download_directory'}
                            onPick={() => handlePickFolder('youtube_download_directory')}
                        /> */}
                    </CardContent>
                </Card>

                <Card
                    className='mb-5 border'
                    style={{ background: '#1C1C1C', borderColor: '#2E2E2E' }}
                >
                    <CardHeader className='pb-3'>
                        <CardTitle
                            className='flex items-center gap-2 text-sm font-medium'
                            style={{ color: '#EDEDED' }}
                        >
                            <Calendar className='h-4 w-4' style={{ color: '#A0A0A0' }} />
                            Jadwal Musiman
                        </CardTitle>
                        <CardDescription className='text-xs' style={{ color: '#6E6E6E' }}>
                            Judul anime yang tayang tiap hari, dipakai untuk pengingat
                        </CardDescription>
                    </CardHeader>
                    <CardContent className='grid gap-3 sm:grid-cols-2'>
                        {DAYS.map(day => (
                            <DayTagField
                                key={day.key}
                                control={control}
                                dayKey={day.key}
                                label={day.label}
                            />
                        ))}
                    </CardContent>
                </Card>

                {saveError && <ErrorBanner>{saveError}</ErrorBanner>}
            </form>

            {(isDirty || savedFlash) && (
                <div
                    className='sticky bottom-6 left-6 flex w-[calc(100%-3rem)] items-center justify-between gap-3 rounded-xl border px-4 py-3 shadow-2xl'
                    style={{
                        background: '#1C1C1C',
                        borderColor: savedFlash ? '#3ECF8E55' : '#2E2E2E',
                    }}
                >
                    {savedFlash ? (
                        <div className='flex items-center gap-2 text-sm'>
                            <Check className='h-4 w-4' style={{ color: '#3ECF8E' }} />
                            <span style={{ color: '#EDEDED' }}>Perubahan tersimpan</span>
                        </div>
                    ) : (
                        <>
                            <div className='flex items-center gap-2 text-sm'>
                                <span
                                    className='h-1.5 w-1.5 rounded-full'
                                    style={{ background: '#3ECF8E' }}
                                />
                                <span style={{ color: '#EDEDED' }}>
                                    Ada perubahan yang belum disimpan
                                </span>
                            </div>
                            <div className='flex items-center gap-2'>
                                <Button
                                    type='button'
                                    variant='ghost'
                                    size='sm'
                                    onClick={handleDiscard}
                                    disabled={isSubmitting}
                                    className='h-8 gap-1.5 px-2.5 text-xs hover:bg-transparent'
                                    style={{ color: '#A0A0A0' }}
                                >
                                    <RotateCcw className='h-3.5 w-3.5' />
                                    Buang
                                </Button>
                                <Button
                                    size='sm'
                                    disabled={isSubmitting}
                                    className='h-8 gap-1.5 px-3 text-xs font-medium hover:opacity-90'
                                    style={{
                                        background: '#3ECF8E',
                                        color: '#121212',
                                    }}
                                    onClick={handleSubmit(onSubmit)}
                                >
                                    {isSubmitting ? (
                                        <Loader2 className='h-3.5 w-3.5 animate-spin' />
                                    ) : (
                                        <Save className='h-3.5 w-3.5' />
                                    )}
                                    Simpan
                                </Button>
                            </div>
                        </>
                    )}
                </div>
            )}
        </>
    );
};
