import { describe, expect, it, vi } from "vitest";
import { createTtlCache } from "./ttl-cache";

describe("createTtlCache", () => {
    it("shares one in-flight load between concurrent callers", async () => {
        const cache = createTtlCache<number>({ ttlMs: 1000, maxEntries: 10 });
        const load = vi.fn(async () => 42);

        const results = await Promise.all([
            cache.get("page", load),
            cache.get("page", load),
            cache.get("page", load),
        ]);

        expect(results).toEqual([42, 42, 42]);
        expect(load).toHaveBeenCalledTimes(1);
    });

    it("reloads after the ttl expires", async () => {
        let time = 0;
        const cache = createTtlCache<number>({
            ttlMs: 1000,
            maxEntries: 10,
            now: () => time,
        });
        const load = vi.fn(async () => time);

        await cache.get("page", load);
        time = 500;
        await cache.get("page", load);
        expect(load).toHaveBeenCalledTimes(1);

        time = 1500;
        expect(await cache.get("page", load)).toBe(1500);
        expect(load).toHaveBeenCalledTimes(2);
    });

    it("does not cache failures", async () => {
        const cache = createTtlCache<number>({ ttlMs: 1000, maxEntries: 10 });
        const failing = vi.fn(async () => {
            throw new Error("db down");
        });

        await expect(cache.get("page", failing)).rejects.toThrow("db down");
        await Promise.resolve();
        expect(await cache.get("page", async () => 7)).toBe(7);
    });

    it("evicts the oldest entries beyond maxEntries", async () => {
        const cache = createTtlCache<string>({ ttlMs: 1000, maxEntries: 2 });
        await cache.get("a", async () => "a");
        await cache.get("b", async () => "b");
        await cache.get("c", async () => "c");

        const reload = vi.fn(async () => "a2");
        expect(await cache.get("a", reload)).toBe("a2");
        expect(reload).toHaveBeenCalledTimes(1);
    });
});
