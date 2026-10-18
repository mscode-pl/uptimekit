import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SaveBarProps {
    visible: boolean;
    isPending?: boolean;
    message?: string;
    saveLabel?: ReactNode;
    discardLabel?: ReactNode;
    onSave: () => void;
    onDiscard: () => void;
    className?: string;
}

/**
 * Discord-style bar that sticks to the bottom of the viewport while a form has
 * unsaved changes. Place it inside the scrolling form so it sticks within it.
 */
export function SaveBar({
    visible,
    isPending = false,
    message = "Careful — you have unsaved changes!",
    saveLabel = "Save Changes",
    discardLabel = "Reset",
    onSave,
    onDiscard,
    className,
}: SaveBarProps) {
    return (
        <div
            aria-hidden={!visible}
            className={cn(
                "pointer-events-none sticky bottom-4 z-20 transition-all duration-200",
                visible
                    ? "translate-y-0 opacity-100"
                    : "translate-y-4 opacity-0",
                className,
            )}
        >
            <div
                role="status"
                className="pointer-events-auto flex items-center justify-between gap-4 rounded-lg border bg-card p-3 pl-4 shadow-lg"
                inert={!visible}
            >
                <p className="font-medium text-sm">{message}</p>
                <div className="flex items-center gap-2">
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={onDiscard}
                        disabled={isPending}
                    >
                        {discardLabel}
                    </Button>
                    <Button type="button" onClick={onSave} disabled={isPending}>
                        {saveLabel}
                    </Button>
                </div>
            </div>
        </div>
    );
}
