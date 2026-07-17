import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISSED_KEY = "marketatlas:install-dismissed";

/**
 * Registers /sw.js, prompts the user to reload when a new version is
 * available, and offers a lightweight "Add to Home Screen" banner.
 * Renders nothing on the server and is a no-op in unsupported browsers.
 */
export function PwaManager() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });

    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        registration.addEventListener("updatefound", () => {
          const installing = registration.installing;
          if (!installing) return;
          installing.addEventListener("statechange", () => {
            if (installing.state === "installed" && navigator.serviceWorker.controller) {
              toast("A new version of MarketAtlas is available", {
                duration: Infinity,
                action: {
                  label: "Refresh",
                  onClick: () => installing.postMessage("SKIP_WAITING"),
                },
              });
            }
          });
        });
      })
      .catch((err) => console.warn("[pwa] service worker registration failed:", err));
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const dismissed = localStorage.getItem(DISMISSED_KEY);
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    if (dismissed || isStandalone) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
      setShowInstallBanner(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const dismiss = () => {
    setShowInstallBanner(false);
    try {
      localStorage.setItem(DISMISSED_KEY, "1");
    } catch {}
  };

  const install = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    await installEvent.userChoice;
    setInstallEvent(null);
    setShowInstallBanner(false);
  };

  if (!showInstallBanner) return null;

  return (
    <div
      className={cn(
        "fixed inset-x-3 bottom-3 z-50 mx-auto flex max-w-md items-center gap-3 rounded-xl border border-border bg-card/95 p-3 shadow-lg backdrop-blur",
        "sm:inset-x-auto sm:right-4 sm:bottom-4 sm:w-96",
      )}
      role="dialog"
      aria-label="Install MarketAtlas"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[color:var(--brand)] text-white">
        <Download className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground">Install MarketAtlas</p>
        <p className="truncate text-xs text-muted-foreground">
          Add it to your home screen for quick, full-screen access.
        </p>
      </div>
      <button
        type="button"
        onClick={install}
        className="shrink-0 rounded-lg bg-[color:var(--brand)] px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90"
      >
        Install
      </button>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-surface-alt hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
