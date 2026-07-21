import { Link } from "@tanstack/react-router";
import { Home, Calculator, Newspaper } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";

interface MobileNavProps {
  currentPath?: string;
}

export function MobileNav({ currentPath = "/" }: MobileNavProps) {
  const { t } = useTranslation();
  const items = [
    { to: "/", label: t("nav.home"), icon: Home },
    { to: "/resources", label: t("nav.tools"), icon: Calculator },
    { to: "/news", label: t("nav.news"), icon: Newspaper },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur-sm sm:hidden">
      <div className="mx-auto flex max-w-md justify-around py-1.5">
        {items.map((item) => {
          const active = currentPath === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex flex-col items-center gap-0.5 rounded-lg px-4 py-1 text-[10px] font-medium transition-colors",
                active
                  ? "text-[color:var(--brand)]"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <item.icon className={cn("h-5 w-5", active && "stroke-[2.5]")} />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
