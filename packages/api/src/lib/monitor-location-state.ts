import { db, timeseries } from "@uptimekit/db";
import { monitorLocationState } from "@uptimekit/db/schema/monitors";
import { inArray, sql } from "drizzle-orm";

type TransactionLike = Parameters<Parameters<typeof db.transaction>[0]>[0];
type QueryableDatabase = typeof db | TransactionLike;

export interface MonitorLocationStatus {
    monitorId: string;
    location: string;
    status: string;
    timestamp: Date;
}

/**
 * Return the latest status each worker location reported for the given
 * monitors.
 *
 * Reads the relational state table; monitors without state rows (no events
 * since this table was introduced) fall back to the time-series store once,
 * until their next event is ingested.
 */
export async function getLatestMonitorLocationStatuses(
    monitorIds: string[],
    options: { database?: QueryableDatabase } = {},
): Promise<MonitorLocationStatus[]> {
    const uniqueMonitorIds = [...new Set(monitorIds)];
    if (uniqueMonitorIds.length === 0) {
        return [];
    }

    const database = options.database ?? db;
    const rows = await database
        .select({
            monitorId: monitorLocationState.monitorId,
            location: monitorLocationState.location,
            status: monitorLocationState.status,
            timestamp: monitorLocationState.timestamp,
        })
        .from(monitorLocationState)
        .where(inArray(monitorLocationState.monitorId, uniqueMonitorIds));

    const monitorsWithState = new Set(rows.map((row) => row.monitorId));
    const monitorsWithoutState = uniqueMonitorIds.filter(
        (monitorId) => !monitorsWithState.has(monitorId),
    );

    if (monitorsWithoutState.length === 0) {
        return rows;
    }

    const fallbackRows =
        await timeseries.getLatestStatusPerLocationForMonitors(
            monitorsWithoutState,
        );

    return [...rows, ...fallbackRows];
}

/**
 * Upsert the latest status per monitor location, ignoring entries older than
 * what is already stored so out-of-order batches cannot regress state.
 */
export async function recordMonitorLocationStatuses(
    statuses: MonitorLocationStatus[],
    options: { database?: QueryableDatabase } = {},
) {
    const latestByKey = new Map<string, MonitorLocationStatus>();
    for (const status of statuses) {
        const key = `${status.monitorId}\u001f${status.location}`;
        const existing = latestByKey.get(key);
        if (!existing || status.timestamp >= existing.timestamp) {
            latestByKey.set(key, status);
        }
    }

    if (latestByKey.size === 0) {
        return;
    }

    const database = options.database ?? db;
    await database
        .insert(monitorLocationState)
        .values([...latestByKey.values()])
        .onConflictDoUpdate({
            target: [
                monitorLocationState.monitorId,
                monitorLocationState.location,
            ],
            set: {
                status: sql`excluded.status`,
                timestamp: sql`excluded.timestamp`,
            },
            setWhere: sql`excluded.timestamp >= ${monitorLocationState.timestamp}`,
        });
}
