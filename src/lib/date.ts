import type { AnimeInformation } from '@/types/bindings';

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

export function translateIndonesianDate(dateStr: string) {
    if (!dateStr) return dateStr;
    const match = dateStr.match(/^([A-Za-z]+)(\s.*)$/);
    if (!match) return dateStr;

    const [, month, rest] = match;
    const key = month.charAt(0).toUpperCase() + month.slice(1).toLowerCase();
    const translated = ID_TO_EN_MONTH[key];
    return translated ? `${translated}${rest}` : dateStr;
}

export function translateAnimeInformationDates(
    information: AnimeInformation,
): AnimeInformation {
    return {
        ...information,
        tanggal_rilis: translateIndonesianDate(information.tanggal_rilis),
        episodes: information.episodes.map(episode => ({
            ...episode,
            info: {
                ...episode.info,
                date: translateIndonesianDate(episode.info.date),
            },
        })),
    };
}
