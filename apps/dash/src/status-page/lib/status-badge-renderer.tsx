import {
    type BadgeTheme,
    PublicStatusBadge,
} from "@/status-page/components/public-status-badge";
import { getStatusPageData } from "./data-preparer";
import type { StatusPageRecord } from "./db-queries";

export async function renderStatusBadge(
    pageConfig: StatusPageRecord,
    routeSlug?: string,
    theme: BadgeTheme = "light",
) {
    const data = await getStatusPageData(pageConfig, routeSlug);

    return (
        <main
            style={{
                alignItems: "center",
                display: "flex",
                height: 38,
                justifyContent: "center",
                margin: 0,
                overflow: "hidden",
                padding: 0,
                width: "100%",
            }}
        >
            <PublicStatusBadge
                href={routeSlug ? `/${routeSlug}` : "/"}
                name={pageConfig.name}
                status={data.overallStatus}
                theme={theme}
            />
        </main>
    );
}
