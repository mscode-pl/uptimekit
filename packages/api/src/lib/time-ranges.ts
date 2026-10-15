export interface TimeRange {
    startMs: number;
    endMs: number;
}

export function mergeRanges(ranges: TimeRange[]): TimeRange[] {
    const sortedRanges = [...ranges].sort((a, b) => a.startMs - b.startMs);
    const mergedRanges: TimeRange[] = [];

    for (const range of sortedRanges) {
        const lastRange = mergedRanges.at(-1);

        if (lastRange && range.startMs <= lastRange.endMs) {
            lastRange.endMs = Math.max(lastRange.endMs, range.endMs);
            continue;
        }

        mergedRanges.push({ ...range });
    }

    return mergedRanges;
}

export function sumRanges(ranges: TimeRange[]): number {
    return ranges.reduce(
        (total, range) => total + range.endMs - range.startMs,
        0,
    );
}

export function subtractRanges(
    ranges: TimeRange[],
    exclusions: TimeRange[],
): TimeRange[] {
    let remainingRanges = mergeRanges(ranges);
    const mergedExclusions = mergeRanges(exclusions);

    for (const exclusion of mergedExclusions) {
        remainingRanges = remainingRanges.flatMap((range) => {
            if (
                exclusion.endMs <= range.startMs ||
                exclusion.startMs >= range.endMs
            ) {
                return [range];
            }

            const nextRanges: TimeRange[] = [];

            if (exclusion.startMs > range.startMs) {
                nextRanges.push({
                    startMs: range.startMs,
                    endMs: Math.min(exclusion.startMs, range.endMs),
                });
            }

            if (exclusion.endMs < range.endMs) {
                nextRanges.push({
                    startMs: Math.max(exclusion.endMs, range.startMs),
                    endMs: range.endMs,
                });
            }

            return nextRanges;
        });
    }

    return remainingRanges;
}

export function clampRange(
    range: TimeRange,
    bounds: TimeRange,
): TimeRange | null {
    const startMs = Math.max(range.startMs, bounds.startMs);
    const endMs = Math.min(range.endMs, bounds.endMs);

    return endMs > startMs ? { startMs, endMs } : null;
}
