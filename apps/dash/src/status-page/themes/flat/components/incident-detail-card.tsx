import type { Incident } from "../../types";
import { IncidentCard } from "./incident-card";

interface IncidentDetailCardProps {
    incident: Incident;
}

export function IncidentDetailCard({ incident }: IncidentDetailCardProps) {
    const isResolved = incident.endedAt !== null;

    return (
        <div className={isResolved ? "opacity-80" : undefined}>
            <div className="mb-2 font-medium text-muted-foreground text-sm tracking-wider">
                {isResolved ? "Previous Incident Report" : "Incident Report"}
            </div>
            <IncidentCard
                incident={incident}
                mode="expanded"
                className="border-border bg-card"
            />
        </div>
    );
}
