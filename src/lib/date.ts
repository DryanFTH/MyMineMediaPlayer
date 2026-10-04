import type { AnimeInformation } from '@/types/bindings';

const ID_TO_EN_MONTH: Record<string, string> = {
    Jan: 'Jan',
    Januari: 'Jan',
    Feb: 'Feb',
    Februari: 'Feb',
    Mar: 'Mar',
    Maret: 'Mar',
    Apr: 'Apr',
    April: 'Apr',
    Mei: 'May',
    Jun: 'Jun',
    Juni: 'Jun',
    Jul: 'Jul',
    Juli: 'Jul',
    Agu: 'Aug',
    Ags: 'Aug',
    Agustus: 'Aug',
    Sep: 'Sep',
    September: 'Sep',
    Okt: 'Oct',
    Oktober: 'Oct',
    Nov: 'Nov',
    November: 'Nov',
    Des: 'Dec',
    Desember: 'Dec',
};

export function translateIndonesianDate(dateStr: string) {
    if (!dateStr) return dateStr;
    const match = dateStr.match(/^([A-Za-z]+)(\s.*)$/);
    if (!match) return dateStr;

    const [, month, rest] = match;
    const key = month.charAt(0).toUpperCase() + month.slice(1).toLowerCase();
    const translated = ID_TO_EN_MONTH[key];
    return translated ? `${translated}${rest}` : dateStr;
}

function formatEpisodeDateAsReleaseDate(dateStr: string) {
    const match = dateStr.trim().match(/^(\d{1,2})\s+([A-Za-z]+),?\s*(\d{4})$/);
    if (!match) return translateIndonesianDate(dateStr);

    const [, day, month, year] = match;
    const key = month.charAt(0).toUpperCase() + month.slice(1).toLowerCase();
    const translatedMonth = ID_TO_EN_MONTH[key];
    return translatedMonth
        ? `${translatedMonth} ${Number(day)}, ${year}`
        : translateIndonesianDate(dateStr);
}

export function translateAnimeInformationDates(
    information: AnimeInformation,
): AnimeInformation {
    const hasReleaseDate = information.tanggal_rilis?.trim();
    const releaseDate = hasReleaseDate
        ? translateIndonesianDate(information.tanggal_rilis)
        : formatEpisodeDateAsReleaseDate(information.episodes[0]?.info.date ?? '');

    return {
        ...information,
        tanggal_rilis: releaseDate,
        episodes: information.episodes.map(episode => ({
            ...episode,
            info: {
                ...episode.info,
                date: translateIndonesianDate(episode.info.date),
            },
        })),
    };
}
