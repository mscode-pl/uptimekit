import { describe, expect, it, vi } from "vitest";

vi.mock("@uptimekit/db", () => ({ db: {}, timeseries: {} }));

const { recordMonitorLocationStatuses } = await import(
    "./monitor-location-state"
);

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
