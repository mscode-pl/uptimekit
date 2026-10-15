import {
    clampRange,
    mergeRanges,
    subtractRanges,
    sumRanges,
    type TimeRange,
} from "./time-ranges";

export interface AvailabilityIncident {
    startedAt: Date;
    endedAt: Date | null;
    severity: string;
}

export interface AvailabilityStats {
    uptimePercent: number;
    downtimeMs: number;
    incidentCount: number;
    maxIncidentMs: number;
    avgIncidentMs: number;
}

function toRange(item: AvailabilityIncident, nowMs: number): TimeRange {
    return {
        startMs: item.startedAt.getTime(),
        endMs: (item.endedAt ?? new Date(nowMs)).getTime(),
    };
}

/**
 * Compute availability for `[periodStartMs, nowMs]`.
 *
 * Planned maintenance is excluded from both downtime and the measured period,
 * and overlapping incidents are merged so the same outage is never counted
 * twice. This matches how public status pages compute uptime.
 */
export function calculateAvailabilityStats(input: {
    incidents: AvailabilityIncident[];
    periodStartMs: number;
    nowMs: number;
}): AvailabilityStats {
    const { incidents, periodStartMs, nowMs } = input;
    const period: TimeRange = { startMs: periodStartMs, endMs: nowMs };

    const maintenanceRanges = mergeRanges(
        incidents
            .filter((item) => item.severity === "maintenance")
            .map((item) => clampRange(toRange(item, nowMs), period))
            .filter((range): range is TimeRange => range !== null),
    );

    const incidentDurations = incidents
        .filter((item) => item.severity !== "maintenance")
        .map((item) => {
            const range = clampRange(toRange(item, nowMs), period);
            return range ? subtractRanges([range], maintenanceRanges) : [];
        })
        .filter((ranges) => ranges.length > 0);

    const monitoredMs = Math.max(
        1,
        nowMs - periodStartMs - sumRanges(maintenanceRanges),
    );
    const downtimeMs = Math.min(
        monitoredMs,
        sumRanges(mergeRanges(incidentDurations.flat())),
    );
    const perIncidentMs = incidentDurations.map(sumRanges);
    const incidentCount = perIncidentMs.length;
    const incidentSumMs = perIncidentMs.reduce((sum, ms) => sum + ms, 0);

    return {
        uptimePercent: ((monitoredMs - downtimeMs) / monitoredMs) * 100,
        downtimeMs,
        incidentCount,
        maxIncidentMs: Math.max(0, ...perIncidentMs),
        avgIncidentMs: incidentCount > 0 ? incidentSumMs / incidentCount : 0,
    };
}
