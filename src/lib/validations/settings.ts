import z from 'zod';

const daySchema = z.array(z.string().min(1)).default([]);

export const settingsSchema = z.object({
    otakudesu_url: z
        .string()
        .trim()
        .refine(v => v === '' || /^https?:\/\/.+/i.test(v), {
            message: 'URL harus diawali http:// atau https://',
        }),
    anime_directory: z.string().trim(),
    youtube_download_directory: z.string().trim(),
    seasonal_anime: z.object({
        monday: daySchema,
        tuesday: daySchema,
        wednesday: daySchema,
        thursday: daySchema,
        friday: daySchema,
        saturday: daySchema,
        sunday: daySchema,
    }),
});

export type SettingsFormValues = z.output<typeof settingsSchema>;
export type SettingsFormInput = z.input<typeof settingsSchema>;

const emptySeasonal: SettingsFormValues['seasonal_anime'] = {
    monday: [],
    tuesday: [],
    wednesday: [],
    thursday: [],
    friday: [],
    saturday: [],
    sunday: [],
};

export const emptyDefaults: SettingsFormValues = {
    otakudesu_url: '',
    anime_directory: '',
    youtube_download_directory: '',
    seasonal_anime: emptySeasonal,
};
