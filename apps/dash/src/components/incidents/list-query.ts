import { parseAsInteger, parseAsString, parseAsStringEnum } from "nuqs/server";

export const PAGE_SIZE_OPTIONS = ["10", "25", "50", "100"] as const;
export const INCIDENT_STATUS_FILTERS = ["open", "resolved"] as const;
export const INCIDENT_SEVERITY_FILTERS = [
    "minor",
    "major",
    "critical",
    "maintenance",
] as const;
export const INCIDENT_TYPE_FILTERS = ["manual", "automatic"] as const;

/** URL filters for the incidents table, shared with the server prefetch. */
export const incidentListSearchParams = {
    search: parseAsString.withDefault(""),
    status: parseAsStringEnum([...INCIDENT_STATUS_FILTERS]),
    severity: parseAsStringEnum([...INCIDENT_SEVERITY_FILTERS]),
    type: parseAsStringEnum([...INCIDENT_TYPE_FILTERS]),
    monitorId: parseAsString,
    statusPageId: parseAsString,
    page: parseAsInteger.withDefault(1),
    pageSize: parseAsStringEnum([...PAGE_SIZE_OPTIONS]).withDefault("25"),
};

export function getIncidentsListInput(filters: {
    search: string;
    status: (typeof INCIDENT_STATUS_FILTERS)[number] | null;
    severity: (typeof INCIDENT_SEVERITY_FILTERS)[number] | null;
    type: (typeof INCIDENT_TYPE_FILTERS)[number] | null;
    monitorId: string | null;
    statusPageId: string | null;
    page: number;
    pageSize: (typeof PAGE_SIZE_OPTIONS)[number];
}) {
    const pageSize = Number(filters.pageSize);

    return {
        status: filters.status ?? ("all" as const),
        limit: pageSize,
        offset: (Math.max(filters.page, 1) - 1) * pageSize,
        q: filters.search || undefined,
        severity: filters.severity ?? undefined,
        type: filters.type ?? undefined,
        monitorId: filters.monitorId ?? undefined,
        statusPageId: filters.statusPageId ?? undefined,
    };
}
