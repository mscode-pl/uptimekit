import { createRouterClient } from "@orpc/server";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import { createContext } from "@uptimekit/api/context";
import { appRouter } from "@uptimekit/api/routers/index";
import { headers } from "next/headers";

/**
 * Query utilities for server components. Procedures run in-process with the
 * incoming request's session instead of looping back over HTTP, and query keys
 * match the browser's `orpc` utilities so prefetched data hydrates directly.
 */
export function getServerOrpc() {
    const client = createRouterClient(appRouter, {
        context: async () => createContext({ headers: await headers() }),
    });

    return createTanstackQueryUtils(client);
}
