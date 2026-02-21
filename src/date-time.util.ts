export function parseEcuadorDateTimeToUtc(input: string | Date): Date {
    if (input instanceof Date) {
        return new Date(input.toISOString());
    }

    const value = input.trim();
    const hasTimezone = /(Z|[+-]\d{2}:\d{2})$/i.test(value);
    if (hasTimezone) {
        return new Date(value);
    }

    const match = value.match(
        /^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})(?::(\d{2}))?(?:\.(\d{1,3}))?$/,
    );
    if (!match) {
        return new Date(value);
    }

    const [
        ,
        year,
        month,
        day,
        hour,
        minute,
        second = '0',
        millisecond = '0',
    ] = match;

    // Ecuador is UTC-5. A local Ecuador wall-clock timestamp is converted to UTC by +5h.
    return new Date(
        Date.UTC(
            Number(year),
            Number(month) - 1,
            Number(day),
            Number(hour) + 5,
            Number(minute),
            Number(second),
            Number(millisecond.padEnd(3, '0')),
        ),
    );
}

export function parseDateOnlyUtc(input: string | Date): Date {
    if (input instanceof Date) {
        return new Date(
            Date.UTC(
                input.getUTCFullYear(),
                input.getUTCMonth(),
                input.getUTCDate(),
                0,
                0,
                0,
                0,
            ),
        );
    }

    const value = input.trim();
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) {
        const parsed = new Date(value);
        return new Date(
            Date.UTC(
                parsed.getUTCFullYear(),
                parsed.getUTCMonth(),
                parsed.getUTCDate(),
                0,
                0,
                0,
                0,
            ),
        );
    }

    const [, year, month, day] = match;
    return new Date(
        Date.UTC(
            Number(year),
            Number(month) - 1,
            Number(day),
            0,
            0,
            0,
            0,
        ),
    );
}
