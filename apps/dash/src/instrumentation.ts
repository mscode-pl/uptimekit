import { defineNodeInstrumentation } from "evlog/next/instrumentation";

const evlogInstrumentation = defineNodeInstrumentation(
    () => import("./lib/evlog"),
);

export async function register() {
    await evlogInstrumentation.register();

    if (process.env.NEXT_RUNTIME !== "nodejs") {
        return;
    }

    const { ensureNotificationWorkerStarted } = await import(
        "@uptimekit/api/pkg/notifications"
    );

    await ensureNotificationWorkerStarted();

    const { startRetentionScheduler } = await import(
        "@uptimekit/api/pkg/retention"
    );

    startRetentionScheduler();
}

export const onRequestError = evlogInstrumentation.onRequestError;
