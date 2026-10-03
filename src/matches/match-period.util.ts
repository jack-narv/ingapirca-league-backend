// Keep the existing standings convention: named journals are knockout rounds.
export function isKnockoutJournal(journal?: string | null): boolean {
    return !!journal && !/^\d+$/.test(journal) && !/^JOURNAL\s+\d+$/i.test(journal.trim());
}

export const PLAYING_STATUSES = [
    'PLAYING_FIRST_HALF',
    'PLAYING_SECOND_HALF',
    'PLAYING_FIRST_EXTRA_HALF',
    'PLAYING_SECOND_EXTRA_HALF',
    'PENALTIES',
];

export const EXTRA_STATUSES = [
    'PLAYING_FIRST_EXTRA_HALF',
    'PLAYING_SECOND_EXTRA_HALF',
    'PENALTIES',
];
