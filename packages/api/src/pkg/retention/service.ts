import { db, timeseries } from "@uptimekit/db";
import {
    CONFIG_DEFAULTS,
    configuration,
} from "@uptimekit/db/schema/configuration";
import { eq, sql } from "drizzle-orm";
import { createLogger } from "../../lib/logger";

const logger = createLogger("RETENTION");

const DAY_MS = 24 * 60 * 60 * 1000;
export const MIN_RETENTION_DAYS = 1;
export const MAX_RETENTION_DAYS = 365;
const RETENTION_INTERVAL_MS = 6 * 60 * 60 * 1000;
const RETENTION_STARTUP_DELAY_MS = 60 * 1000;
// Arbitrary constant shared by every replica so only one of them prunes at a time.
const RETENTION_ADVISORY_LOCK_KEY = 7_320_114_001;

export function parseRetentionDays(value: string | null | undefined) {
    const fallback = Number(CONFIG_DEFAULTS.data_retention_days);
    const parsed = Number.parseInt(value ?? "", 10);
    if (!Number.isFinite(parsed)) {
        return fallback;
    }

    return Math.min(MAX_RETENTION_DAYS, Math.max(MIN_RETENTION_DAYS, parsed));
}

export function getRetentionCutoff(retentionDays: number, now = new Date()) {
    return new Date(now.getTime() - retentionDays * DAY_MS);
}

async function getConfiguredRetentionDays() {
    const row = await db.query.configuration.findFirst({
        where: eq(configuration.key, "data_retention_days"),
        columns: { value: true },
    });

    return parseRetentionDays(row?.value);
}

interface RetentionDependencies {
    getRetentionDays?: () => Promise<number>;
    deleteOlderThan?: (cutoff: Date) => Promise<void>;
    withExclusiveLock?: (fn: () => Promise<void>) => Promise<boolean>;
    now?: Date;
}

async function withRetentionLock(fn: () => Promise<void>) {
    return db.transaction(async (tx) => {
        const [lock] = await tx.execute<{ acquired: boolean }>(
            sql`select pg_try_advisory_xact_lock(${RETENTION_ADVISORY_LOCK_KEY}) as acquired`,
        );
        if (!lock?.acquired) {
            return false;
        }

        await fn();
        return true;
    });
}

/**
 * Delete time-series rows older than the configured `data_retention_days`.
 *
 * @returns The cutoff that was applied, or `null` when another replica holds the lock.
 */
export async function runTimeSeriesRetention(
    dependencies: RetentionDependencies = {},
) {
    const getRetentionDays =
        dependencies.getRetentionDays ?? getConfiguredRetentionDays;
    const deleteOlderThan =
        dependencies.deleteOlderThan ??
        ((cutoff: Date) => timeseries.deleteOlderThan(cutoff));
    const withExclusiveLock =
        dependencies.withExclusiveLock ?? withRetentionLock;

    const retentionDays = await getRetentionDays();
    const cutoff = getRetentionCutoff(retentionDays, dependencies.now);

    const ran = await withExclusiveLock(() => deleteOlderThan(cutoff));
    if (!ran) {
        return null;
    }

    logger.info(
        `Pruned time-series data older than ${cutoff.toISOString()} (${retentionDays} days)`,
    );
    return cutoff;
}

interface RetentionSchedulerState {
    timer?: ReturnType<typeof setTimeout>;
}

const retentionSchedulerKey = Symbol.for("uptimekit.retentionScheduler");

function getRetentionSchedulerState() {
    const globalForScheduler = globalThis as typeof globalThis &
        Record<symbol, RetentionSchedulerState | undefined>;

    globalForScheduler[retentionSchedulerKey] ??= {};
    return globalForScheduler[retentionSchedulerKey];
}

function scheduleNextRun(state: RetentionSchedulerState, delayMs: number) {
    state.timer = setTimeout(() => {
        runTimeSeriesRetention()
            .catch((error) => {
                logger.error("Failed to prune time-series data", error);
            })
            .finally(() => {
                if (state.timer) {
                    scheduleNextRun(state, RETENTION_INTERVAL_MS);
                }
            });
    }, delayMs);
    state.timer.unref?.();
}

export function startRetentionScheduler() {
    const state = getRetentionSchedulerState();
    if (state.timer) {
        return;
    }

    scheduleNextRun(state, RETENTION_STARTUP_DELAY_MS);
}

export function stopRetentionScheduler() {
    const state = getRetentionSchedulerState();
    if (state.timer) {
        clearTimeout(state.timer);
    }
    state.timer = undefined;
}
