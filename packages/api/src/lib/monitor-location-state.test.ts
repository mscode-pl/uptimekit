import { describe, expect, it, vi } from "vitest";

const timeseries = {
    getLatestStatusPerLocationForMonitors: vi.fn(),
};
vi.mock("@uptimekit/db", () => ({ db: {}, timeseries }));

const { getLatestMonitorLocationStatuses, recordMonitorLocationStatuses } =
    await import("./monitor-location-state");

function createDatabase() {
    const values = vi.fn(() => ({ onConflictDoUpdate: vi.fn(async () => {}) }));
    return { database: { insert: vi.fn(() => ({ values })) } as any, values };
}

describe("recordMonitorLocationStatuses", () => {
    it("keeps only the newest status per monitor location", async () => {
        const { database, values } = createDatabase();
        const older = new Date("2026-01-01T00:00:00Z");
        const newer = new Date("2026-01-01T00:01:00Z");

        await recordMonitorLocationStatuses(
            [
                {
                    monitorId: "m1",
                    location: "w1",
                    status: "up",
                    timestamp: newer,
                },
                {
                    monitorId: "m1",
                    location: "w1",
                    status: "down",
                    timestamp: older,
                },
                {
                    monitorId: "m1",
                    location: "w2",
                    status: "down",
                    timestamp: older,
                },
            ],
            { database },
        );

        expect(values).toHaveBeenCalledWith([
            { monitorId: "m1", location: "w1", status: "up", timestamp: newer },
            {
                monitorId: "m1",
                location: "w2",
                status: "down",
                timestamp: older,
            },
        ]);
    });

    it("skips the write when there is nothing to record", async () => {
        const { database } = createDatabase();

        await recordMonitorLocationStatuses([], { database });

        expect(database.insert).not.toHaveBeenCalled();
    });
});

describe("getLatestMonitorLocationStatuses", () => {
    it("seeds every historical location for monitors without state", async () => {
        const timestamp = new Date("2026-01-01T00:00:00Z");
        const historical = [
            { monitorId: "m1", location: "w1", status: "down", timestamp },
            { monitorId: "m1", location: "w2", status: "down", timestamp },
        ];
        timeseries.getLatestStatusPerLocationForMonitors.mockResolvedValue(
            historical,
        );
        const values = vi.fn(() => ({
            onConflictDoUpdate: vi.fn(async () => {}),
        }));
        const database = {
            select: () => ({ from: () => ({ where: async () => [] }) }),
            insert: vi.fn(() => ({ values })),
        } as any;

        const statuses = await getLatestMonitorLocationStatuses(["m1"], {
            database,
        });

        expect(statuses).toEqual(historical);
        expect(values).toHaveBeenCalledWith(historical);
    });

    it("does not query the time series once state exists", async () => {
        timeseries.getLatestStatusPerLocationForMonitors.mockClear();
        const row = {
            monitorId: "m1",
            location: "w1",
            status: "up",
            timestamp: new Date(),
        };
        const database = {
            select: () => ({ from: () => ({ where: async () => [row] }) }),
            insert: vi.fn(),
        } as any;

        await getLatestMonitorLocationStatuses(["m1"], { database });

        expect(
            timeseries.getLatestStatusPerLocationForMonitors,
        ).not.toHaveBeenCalled();
        expect(database.insert).not.toHaveBeenCalled();
    });
});
