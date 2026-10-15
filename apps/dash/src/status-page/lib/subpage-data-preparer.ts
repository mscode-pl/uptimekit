import type {
    IncidentDetailData,
    UpdatesPageData,
} from "@/status-page/themes/types";
import {
    getActiveMaintenances,
    getActiveStatusPageReports,
    getMaintenanceHistory,
    getMaintenanceHistoryForPeriod,
    getScheduledMaintenances,
    getStatusPageReports,
    getStatusPageReportsForPeriod,
} from "./db-queries";
import type { IncidentHistoryPeriod } from "./incident-history";
import { buildPath } from "./route-utils";
import {
    prepareStatusPageConfig,
    type RawStatusPageConfig,
} from "./status-page-config";

type ArrayItem<T> = T extends readonly (infer Item)[] ? Item : never;
type QueryItem<T extends (...args: never[]) => Promise<unknown>> = ArrayItem<
    Awaited<ReturnType<T>>
>;

type StatusPageReport =
    | QueryItem<typeof getStatusPageReports>
    | QueryItem<typeof getActiveStatusPageReports>
    | QueryItem<typeof getStatusPageReportsForPeriod>;
type StatusPageMaintenance =
    | QueryItem<typeof getActiveMaintenances>
    | QueryItem<typeof getScheduledMaintenances>
    | QueryItem<typeof getMaintenanceHistory>
    | QueryItem<typeof getMaintenanceHistoryForPeriod>;

function mapIncident(report: StatusPageReport, routeSlug?: string) {
    return {
        id: report.id,
        title: report.title,
        status: report.status,
        severity: report.severity,
        startedAt: report.startedAt,
        endedAt: report.endedAt,
        monitors: report.affectedMonitors.map((am) => ({
            monitor: am.monitor,
        })),
        activities: report.updates.map((u) => ({
            id: u.id,
            message: u.message,
            createdAt: u.createdAt,
            type: u.type,
        })),
        detailsLink: buildPath(`/incidents/${report.id}`, routeSlug),
    };
}

function mapMaintenanceIncident(
    maintenance: StatusPageMaintenance,
    routeSlug?: string,
) {
    return {
        id: maintenance.id,
        title: maintenance.title,
        status: maintenance.status,
        severity: "maintenance",
        startedAt: maintenance.startAt,
        endedAt: maintenance.endAt,
        monitors: maintenance.monitors,
        activities: maintenance.updates.map((u) => ({
            id: u.id,
            message: u.message,
            createdAt: u.createdAt,
            type: u.type,
        })),
        detailsLink: buildPath(`/incidents/${maintenance.id}`, routeSlug),
    };
}

export async function prepareIncidentDetailData(
    pageConfig: RawStatusPageConfig,
    incidentId: string,
    routeSlug?: string,
): Promise<IncidentDetailData> {
    const [
        reports,
        activeReports,
        activeMaintenances,
        scheduledMaintenances,
        history,
    ] = await Promise.all([
        getStatusPageReports(pageConfig.id, 1000),
        getActiveStatusPageReports(pageConfig.id),
        getActiveMaintenances(pageConfig.id),
        getScheduledMaintenances(pageConfig.id),
        getMaintenanceHistory(pageConfig.id, 1000),
    ]);

    const reportItem =
        activeReports.find((r) => r.id === incidentId) ||
        reports.find((r) => r.id === incidentId);
    const maintenanceItem =
        activeMaintenances.find((m) => m.id === incidentId) ||
        scheduledMaintenances.find((m) => m.id === incidentId) ||
        history.find((m) => m.id === incidentId);

    const incident = reportItem
        ? mapIncident(reportItem, routeSlug)
        : maintenanceItem
          ? mapMaintenanceIncident(maintenanceItem, routeSlug)
          : null;

    if (!incident) {
        throw new Error("Incident not found");
    }

    const activeIssues = [
        ...activeReports.map((report) => mapIncident(report, routeSlug)),
        ...activeMaintenances.map((maintenance) =>
            mapMaintenanceIncident(maintenance, routeSlug),
        ),
    ].sort(
        (a, b) =>
            new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
    );

    return {
        config: prepareStatusPageConfig(pageConfig, routeSlug),
        incident,
        activeIssues,
    };
}

export async function prepareUpdatesPageData(
    pageConfig: RawStatusPageConfig,
    selectedPeriod: IncidentHistoryPeriod,
    routeSlug?: string,
): Promise<UpdatesPageData> {
    const limit = selectedPeriod === "all" ? undefined : 50;
    const [reports, maintenances, activeReports, activeMaintenances] =
        await Promise.all([
            getStatusPageReportsForPeriod(pageConfig.id, {
                limit,
                period: selectedPeriod,
            }),
            getMaintenanceHistoryForPeriod(pageConfig.id, {
                limit,
                period: selectedPeriod,
            }),
            getActiveStatusPageReports(pageConfig.id),
            getActiveMaintenances(pageConfig.id),
        ]);

    const allUpdates = [
        ...reports.map((report) => mapIncident(report, routeSlug)),
        ...maintenances.map((maintenance) =>
            mapMaintenanceIncident(maintenance, routeSlug),
        ),
    ].sort(
        (a, b) =>
            new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
    );

    const incidentsByDate = allUpdates.reduce(
        (acc, item) => {
            const date = new Date(item.startedAt).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
                timeZone: "UTC",
            });
            if (!acc[date]) {
                acc[date] = [];
            }
            acc[date].push(item);
            return acc;
        },
        {} as Record<string, typeof allUpdates>,
    );

    const activeIssues = [
        ...activeReports.map((report) => mapIncident(report, routeSlug)),
        ...activeMaintenances.map((maintenance) =>
            mapMaintenanceIncident(maintenance, routeSlug),
        ),
    ].sort(
        (a, b) =>
            new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
    );

    return {
        config: prepareStatusPageConfig(pageConfig, routeSlug),
        allUpdates,
        incidentsByDate,
        activeIssues,
        selectedPeriod,
    };
}
