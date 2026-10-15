import type { SearchParams } from "nuqs/server";
import { IncidentsPage } from "@/components/incidents/incidents-page";

export default function Page({
    searchParams,
}: {
    searchParams: Promise<SearchParams>;
}) {
    return <IncidentsPage searchParams={searchParams} />;
}
