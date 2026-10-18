import Link from "next/link";
import { ArrowLeftIcon } from "@/status-page/components/arrow-left-icon";

export function BackLink({ href }: { href: string }) {
    return (
        <Link
            href={href as any}
            className="inline-flex w-fit items-center gap-2 rounded-lg px-1 py-1 font-medium text-[13px] text-muted-foreground transition-colors hover:text-foreground"
        >
            <ArrowLeftIcon />
            <span>Back to status</span>
        </Link>
    );
}
