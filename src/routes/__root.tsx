import {
  Outlet,
  createRootRouteWithContext,
  HeadContent,
  Scripts,
  Link,
} from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as React from "react";
import appCss from "@/styles.css?url";
import "@/styles.css";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "theme-color", content: "#0f172a" },
      { title: "MarketAtlas — Global Financial Hub for Common People" },
      { property: "og:title", content: "MarketAtlas — Global Financial Hub for Common People" },
      { name: "twitter:title", content: "MarketAtlas — Global Financial Hub for Common People" },
      { name: "description", content: "Live gold, silver, platinum, crypto prices, stock indices, fuel rates and currency exchange across India, US, Europe, UK, Japan,China and UAE. refreshed hourly." },
      { property: "og:description", content: "Live gold, silver, platinum, crypto prices, stock indices, fuel rates and currency exchange across India, US, Europe, UK, Japan,China and UAE. refreshed hourly." },
      { name: "twitter:description", content: "Live gold, silver, platinum, crypto prices, stock indices, fuel rates and currency exchange across India, US, Europe, UK, Japan,China and UAE. refreshed hourly." },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/03b50733-1742-4af5-9628-2a59b752776e" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/03b50733-1742-4af5-9628-2a59b752776e" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico" },
    ],
  }),
  component: RootComponent,
  notFoundComponent: NotFoundPage,
});

function RootComponent() {
  const [queryClient] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            retry: 1,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <RootDocument>
        <Outlet />
      </RootDocument>
    </QueryClientProvider>
  );
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased">
        {children}
        <Scripts />
      </body>
    </html>
  );
}

/* =====================================================================
 * NOT FOUND (404) PAGE
 * ===================================================================== */

function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <h1 className="text-6xl font-bold tracking-tight text-foreground">404</h1>
      <p className="mt-4 text-lg text-muted-foreground">
        This page doesn't exist in MarketAtlas.
      </p>
      <Link
        to="/"
        className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[color:var(--brand)] px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
      >
        Back to Dashboard
      </Link>
    </div>
  );
}

/* =====================================================================
 * ERROR BOUNDARY (Week 4)
 * ===================================================================== */

export function ErrorBoundary({ error }: { error: Error }) {
  const [showDetails, setShowDetails] = React.useState(false);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="mx-auto max-w-lg text-center">
        <h1 className="text-3xl font-bold tracking-tight text-destructive">
          Something went wrong
        </h1>
        <p className="mt-3 text-muted-foreground">
          We encountered an error while loading this page. The team has been notified.
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 rounded-lg bg-[color:var(--brand)] px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            Retry
          </button>
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-surface-alt"
          >
            Back to Dashboard
          </Link>
        </div>

        <button
          onClick={() => setShowDetails(!showDetails)}
          className="mt-4 text-xs text-muted-foreground underline hover:text-foreground"
        >
          {showDetails ? "Hide" : "Show"} error details
        </button>

        {showDetails && (
          <pre className="mt-3 max-h-48 overflow-auto rounded-lg border border-border bg-muted p-3 text-left text-xs text-muted-foreground">
            {error.message}
            {"\n"}
            {error.stack}
          </pre>
        )}

        <div className="mt-6 text-[10px] text-muted-foreground/60">
          © MarketAtlas · MAVIK group
        </div>
      </div>
    </div>
  );
}
