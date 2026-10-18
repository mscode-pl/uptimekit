import type { Metadata } from "next";
import "../../status-page.css";
import { ThemeProvider } from "@/components/providers/theme-provider";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    title: "Status Page | UptimeKit",
    description: "Real-time system status and uptime monitoring",
};

export default function StatusPageRootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body className="text-foreground antialiased">
                <ThemeProvider
                    attribute="class"
                    defaultTheme="system"
                    enableSystem
                    disableTransitionOnChange
                    // Status pages force their own light/dark mode; a separate key keeps that from leaking into the dashboard's saved preference
                    storageKey="status-page-theme"
                >
                    {children}
                </ThemeProvider>
            </body>
        </html>
    );
}
