interface CacheEntry<T> {
    value: Promise<T>;
    expiresAt: number;
}

/**
 * Small in-process cache that shares one in-flight computation per key and
 * keeps successful results for `ttlMs`. Failed computations are not cached.
 */
export function createTtlCache<T>(options: {
    ttlMs: number;
    maxEntries: number;
    now?: () => number;
}) {
    const entries = new Map<string, CacheEntry<T>>();
    const now = options.now ?? Date.now;

    function evictOverflow() {
        while (entries.size > options.maxEntries) {
            const oldestKey = entries.keys().next().value;
            if (oldestKey === undefined) {
                return;
            }
            entries.delete(oldestKey);
        }
    }

    return {
        get(key: string, load: () => Promise<T>): Promise<T> {
            const cached = entries.get(key);
            if (cached && cached.expiresAt > now()) {
                return cached.value;
            }

            const value = load();
            const entry: CacheEntry<T> = {
                value,
                // Until the load settles, concurrent callers share it.
                expiresAt: Number.POSITIVE_INFINITY,
            };
            entries.delete(key);
            entries.set(key, entry);
            evictOverflow();

            value.then(
                () => {
                    entry.expiresAt = now() + options.ttlMs;
                },
                () => {
                    if (entries.get(key) === entry) {
                        entries.delete(key);
                    }
                },
            );

            return value;
        },
        clear() {
            entries.clear();
        },
    };
}
