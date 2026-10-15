"use client";

import dynamic from "next/dynamic";

// maplibre-gl and the world-countries dataset are large and only needed for
// this one widget, so load them after the rest of the admin page.
const WorkersMap = dynamic(() => import("./workers-map"), {
    ssr: false,
    loading: () => <span className="text-sm">Loading map...</span>,
});

export default function LazyWorkersMap() {
    return <WorkersMap />;
}
