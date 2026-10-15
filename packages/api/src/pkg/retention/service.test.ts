import { describe, expect, it, vi } from "vitest";

vi.mock("@uptimekit/db", () => ({ db: {}, timeseries: {} }));

const { getRetentionCutoff, parseRetentionDays, runTimeSeriesRetention } =
    await import("./service");

describe("time-series retention", () => {
    it("clamps configured retention to the supported range", () => {
        expect(parseRetentionDays("0")).toBe(1);
        expect(parseRetentionDays("90")).toBe(90);
        expect(parseRetentionDays("10000")).toBe(365);
    });

    it("falls back to the default for missing or invalid values", () => {
        expect(parseRetentionDays(undefined)).toBe(30);
        expect(parseRetentionDays("abc")).toBe(30);
    });

    it("computes the cutoff relative to now", () => {
        const now = new Date("2026-01-31T00:00:00.000Z");
        expect(getRetentionCutoff(30, now).toISOString()).toBe(
            "2026-01-01T00:00:00.000Z",
        );
    });

    it("deletes rows older than the configured retention", async () => {
        const deleteOlderThan = vi.fn(async () => {});
        const now = new Date("2026-01-31T00:00:00.000Z");

        const cutoff = await runTimeSeriesRetention({
            getRetentionDays: async () => 7,
            deleteOlderThan,
            withExclusiveLock: async (fn) => {
                await fn();
                return true;
            },
            now,
        });

        expect(cutoff?.toISOString()).toBe("2026-01-24T00:00:00.000Z");
        expect(deleteOlderThan).toHaveBeenCalledWith(cutoff);
    });

    it("skips pruning when another replica holds the lock", async () => {
        const deleteOlderThan = vi.fn(async () => {});

        const cutoff = await runTimeSeriesRetention({
            getRetentionDays: async () => 7,
            deleteOlderThan,
            withExclusiveLock: async () => false,
        });

        expect(cutoff).toBeNull();
        expect(deleteOlderThan).not.toHaveBeenCalled();
    });
});
