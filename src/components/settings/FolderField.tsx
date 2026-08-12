import { FolderOpen, Loader2 } from 'lucide-react';
import { Control, Controller } from 'react-hook-form';

import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { SettingsFormInput, SettingsFormValues } from '@/lib/validations/settings';

import { Button } from '../ui/button';
import { Input } from '../ui/input';

function FolderField({
    control,
    name,
    label,
    placeholder,
    picking,
    onPick,
}: {
    control: Control<SettingsFormInput, unknown, SettingsFormValues>;
    name: 'anime_directory' | 'youtube_download_directory';
    label: string;
    placeholder: string;
    picking: boolean;
    onPick: () => void;
}) {
    return (
        <Controller
            control={control}
            name={name}
            render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                    <FieldLabel
                        htmlFor={field.name}
                        className='text-xs'
                        style={{ color: '#A0A0A0' }}
                    >
                        {label}
                    </FieldLabel>
                    <div className='flex gap-2'>
                        <Input
                            {...field}
                            id={field.name}
                            readOnly
                            aria-invalid={fieldState.invalid}
                            placeholder={placeholder}
                            className='border text-sm'
                            style={{
                                background: '#121212',
                                borderColor: '#2E2E2E',
                                color: field.value ? '#EDEDED' : '#6E6E6E',
                            }}
                        />
                        <Button
                            type='button'
                            variant='secondary'
                            onClick={onPick}
                            disabled={picking}
                            className='h-9 shrink-0 gap-1.5 px-3 text-xs'
                            style={{ background: '#2E2E2E', color: '#EDEDED' }}
                        >
                            {picking ? (
                                <Loader2 className='h-3.5 w-3.5 animate-spin' />
                            ) : (
                                <FolderOpen className='h-3.5 w-3.5' />
                            )}
                            Pilih
                        </Button>
                    </div>
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
            )}
        />
    );
}

export { FolderField };
