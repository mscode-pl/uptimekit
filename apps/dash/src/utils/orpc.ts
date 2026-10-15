import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { BatchLinkPlugin, DedupeRequestsPlugin } from "@orpc/client/plugins";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import type { AppRouterClient } from "@uptimekit/api/routers/index";

export const link = new RPCLink({
    // Only the browser calls the API over HTTP; server components use the
    // in-process router client from orpc.server.ts.
    url: () => `${window.location.origin}/api/rpc`,
    fetch(url, options) {
        return fetch(url, {
            ...options,
            credentials: "include",
        });
    },
    plugins: [
        new DedupeRequestsPlugin({
            filter: ({ request }) => request.method === "GET", // Filters requests to dedupe
            groups: [
                {
                    condition: () => true,
                    context: {}, // Context used for the rest of the request lifecycle
                },
            ],
        }),
        new BatchLinkPlugin({
            groups: [
                {
                    condition: (options) => true,
                    context: {}, // Context used for the rest of the request lifecycle
                },
            ],
        }),
    ],
});

export const client: AppRouterClient = createORPCClient(link);

export const orpc = createTanstackQueryUtils(client);
