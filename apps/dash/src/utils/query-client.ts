import { isServer, QueryCache, QueryClient } from "@tanstack/react-query";
import { sileo } from "sileo";

function makeQueryClient() {
    const queryClient: QueryClient = new QueryClient({
        defaultOptions: {
            queries: {
                // Without a stale time every mount and window focus refetched
                // every query; it also keeps server-prefetched data from being
                // refetched immediately after hydration. Mutations still
                // invalidate explicitly, and live views set refetchInterval.
                staleTime: 15_000,
            },
        },
        queryCache: new QueryCache({
            onError: (error, query) => {
                if (isServer) {
                    return;
                }

                sileo.action({
                    title: `Error: ${error.message}`,
                    button: {
                        title: "Retry",
                        onClick: () => {
                            queryClient.refetchQueries({
                                queryKey: query.queryKey,
                                exact: true,
                            });
                        },
                    },
                });
            },
        }),
    });

    return queryClient;
}

let browserQueryClient: QueryClient | undefined;

/**
 * Return the query client for the current environment.
 *
 * On the server every call creates a new client, so cached data can never be
 * shared between requests (and users); in the browser one client lives for
 * the whole session.
 */
export function getQueryClient() {
    if (isServer) {
        return makeQueryClient();
    }

    browserQueryClient ??= makeQueryClient();
    return browserQueryClient;
}
