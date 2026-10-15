import { describe, expect, it } from "vitest";
import { calculateAvailabilityStats } from "./availability";

const HOUR = 60 * 60 * 1000;
const start = Date.UTC(2026, 0, 1);
const at = (hours: number) => new Date(start + hours * HOUR);

describe("calculateAvailabilityStats", () => {
    it("reports full uptime without incidents", () => {
        const stats = calculateAvailabilityStats({
            incidents: [],
            periodStartMs: start,
            nowMs: start + 10 * HOUR,
        });

        expect(stats.uptimePercent).toBe(100);
        expect(stats.incidentCount).toBe(0);
    });

    it("does not count planned maintenance as downtime", () => {
        const stats = calculateAvailabilityStats({
            incidents: [
                { startedAt: at(0), endedAt: at(2), severity: "maintenance" },
            ],
            periodStartMs: start,
            nowMs: start + 10 * HOUR,
        });

        expect(stats.downtimeMs).toBe(0);
        expect(stats.uptimePercent).toBe(100);
        expect(stats.incidentCount).toBe(0);
    });

    it("ends maintenance at its planned end when it was never completed", () => {
        const stats = calculateAvailabilityStats({
            incidents: [
                {
                    startedAt: at(0),
                    endedAt: null,
                    plannedEndAt: at(1),
                    severity: "maintenance",
                },
                { startedAt: at(2), endedAt: at(3), severity: "major" },
            ],
            periodStartMs: start,
            nowMs: start + 10 * HOUR,
        });

        expect(stats.downtimeMs).toBe(HOUR);
        expect(stats.incidentCount).toBe(1);
        expect(stats.uptimePercent).toBeCloseTo((8 / 9) * 100);
    });

    it("ends maintenance when it is completed before its planned end", () => {
        const stats = calculateAvailabilityStats({
            incidents: [
                {
                    startedAt: at(0),
                    endedAt: at(1),
                    plannedEndAt: at(5),
                    severity: "maintenance",
                },
                { startedAt: at(2), endedAt: at(3), severity: "major" },
            ],
            periodStartMs: start,
            nowMs: start + 10 * HOUR,
        });

        expect(stats.downtimeMs).toBe(HOUR);
        expect(stats.incidentCount).toBe(1);
    });

    it("merges overlapping incidents instead of double counting", () => {
        const stats = calculateAvailabilityStats({
            incidents: [
                { startedAt: at(1), endedAt: at(3), severity: "major" },
                { startedAt: at(2), endedAt: at(4), severity: "minor" },
            ],
            periodStartMs: start,
            nowMs: start + 10 * HOUR,
        });

        expect(stats.downtimeMs).toBe(3 * HOUR);
        expect(stats.uptimePercent).toBeCloseTo(70);
        expect(stats.incidentCount).toBe(2);
        expect(stats.maxIncidentMs).toBe(2 * HOUR);
    });

    it("excludes incident time that falls inside maintenance", () => {
        const stats = calculateAvailabilityStats({
            incidents: [
                { startedAt: at(0), endedAt: at(4), severity: "major" },
                { startedAt: at(2), endedAt: at(4), severity: "maintenance" },
            ],
            periodStartMs: start,
            nowMs: start + 10 * HOUR,
        });

        expect(stats.downtimeMs).toBe(2 * HOUR);
        expect(stats.uptimePercent).toBeCloseTo(75);
    });

    it("clips incidents to the period and treats open incidents as ongoing", () => {
        const stats = calculateAvailabilityStats({
            incidents: [
                { startedAt: at(-5), endedAt: null, severity: "major" },
            ],
            periodStartMs: start,
            nowMs: start + 2 * HOUR,
        });

        expect(stats.downtimeMs).toBe(2 * HOUR);
        expect(stats.uptimePercent).toBe(0);
    });
});
