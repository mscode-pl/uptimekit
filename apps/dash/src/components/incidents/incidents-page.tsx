import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { createLoader, type SearchParams } from "nuqs/server";
import { Suspense } from "react";
import { IncidentsTable } from "@/components/incidents/table";
import { getServerOrpc } from "@/utils/orpc.server";
import { getQueryClient } from "@/utils/query-client";
import { getIncidentsListInput, incidentListSearchParams } from "./list-query";

const loadIncidentListFilters = createLoader(incidentListSearchParams);

/**
 * Server-rendered incidents page. The first page of incidents is fetched
 * in-process during the render, so the table hydrates with data instead of
 * waiting for its JavaScript before requesting it.
 */
export async function IncidentsPage({
    searchParams,
}: {
    searchParams: Promise<SearchParams>;
}) {
    const queryClient = getQueryClient();
    const filters = await loadIncidentListFilters(searchParams);

    await queryClient.prefetchQuery(
        getServerOrpc().incidents.list.queryOptions({
            input: getIncidentsListInput(filters),
        }),
    );

    return (
        <div className="flex flex-1 flex-col pb-8">
            <HydrationBoundary state={dehydrate(queryClient)}>
                <Suspense
                    fallback={
                        <div className="flex flex-1 items-center justify-center py-12 text-muted-foreground">
                            Loading incidents...
                        </div>
                    }
                >
                    <IncidentsTable />
                </Suspense>
            </HydrationBoundary>
        </div>
    );
}
