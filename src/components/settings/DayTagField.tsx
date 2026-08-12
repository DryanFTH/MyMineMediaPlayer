import { useState } from 'react';

import { Plus, X } from 'lucide-react';
import { Control, Controller } from 'react-hook-form';

import { SettingsFormInput, SettingsFormValues } from '@/lib/validations/settings';
import { DAYS } from '@/pages/Settings';

import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

type DayKey = (typeof DAYS)[number]['key'];

function DayTagField({
    control,
    dayKey,
    label,
}: {
    control: Control<SettingsFormInput, unknown, SettingsFormValues>;
    dayKey: DayKey;
    label: string;
}) {
    const [draft, setDraft] = useState('');

    return (
        <Controller
            control={control}
            name={`seasonal_anime.${dayKey}` as const}
            render={({ field }) => {
                const values: string[] = field.value ?? [];

                function addTag() {
                    const v = draft.trim();
                    if (!v || values.includes(v)) {
                        setDraft('');
                        return;
                    }
                    field.onChange([...values, v]);
                    setDraft('');
                }

                function removeTag(idx: number) {
                    field.onChange(values.filter((_, i) => i !== idx));
                }

                return (
                    <div
                        className='rounded-lg border p-3'
                        style={{ background: '#171717', borderColor: '#2E2E2E' }}
                    >
                        <div className='mb-2 flex items-center justify-between'>
                            <span
                                className='text-xs font-medium uppercase tracking-wide'
                                style={{ color: '#A0A0A0' }}
                            >
                                {label}
                            </span>
                            <Badge
                                variant='secondary'
                                className='h-5 px-1.5 text-[10px]'
                                style={{ background: '#2E2E2E', color: '#A0A0A0' }}
                            >
                                {values.length}
                            </Badge>
                        </div>

                        <div className='mb-2 flex min-h-6 flex-wrap gap-1.5'>
                            {values.length === 0 && (
                                <span className='text-xs' style={{ color: '#6E6E6E' }}>
                                    Belum ada judul
                                </span>
                            )}
                            {values.map((v, i) => (
                                <span
                                    key={`${v}-${i}`}
                                    className='flex items-center gap-1 rounded-md border px-2 py-1 text-xs'
                                    style={{
                                        borderColor: '#2E2E2E',
                                        background: '#1C1C1C',
                                        color: '#EDEDED',
                                    }}
                                >
                                    {v}
                                    <button
                                        type='button'
                                        onClick={() => removeTag(i)}
                                        style={{ color: '#6E6E6E' }}
                                    >
                                        <X className='h-3 w-3' />
                                    </button>
                                </span>
                            ))}
                        </div>

                        <div className='flex gap-2'>
                            <Input
                                value={draft}
                                onChange={e => setDraft(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        addTag();
                                    }
                                }}
                                placeholder='Tambah judul…'
                                className='h-8 border text-xs'
                                style={{
                                    background: '#121212',
                                    borderColor: '#2E2E2E',
                                    color: '#EDEDED',
                                }}
                            />
                            <Button
                                type='button'
                                size='icon'
                                variant='secondary'
                                onClick={addTag}
                                className='h-8 w-8 shrink-0'
                                style={{ background: '#2E2E2E', color: '#EDEDED' }}
                            >
                                <Plus className='h-4 w-4' />
                            </Button>
                        </div>
                    </div>
                );
            }}
        />
    );
}

export { DayTagField };
