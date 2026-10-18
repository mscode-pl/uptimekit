import Link from "next/link";
import { ArrowLeftIcon } from "@/status-page/components/arrow-left-icon";

export function BackLink({
    href,
    label = "Back to status",
}: {
    href: string;
    label?: string;
}) {
    return (
        <Link
            href={href as any}
            className="mb-8 inline-flex items-center gap-2 font-medium text-muted-foreground text-sm transition-colors hover:text-foreground"
        >
            <ArrowLeftIcon />
            {label}
        </Link>
    );
}
