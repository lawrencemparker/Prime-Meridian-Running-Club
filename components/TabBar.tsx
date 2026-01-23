"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Store, ACTIVE_CLUB_CHANGED_EVENT } from "@/lib/mcrStore";

type TabKey = "home" | "log" | "history" | "leaderboard" | "clubs" | "profile";

type TabBarProps = {
  /**
   * Optional override. If omitted, TabBar infers active tab from the URL path.
   */
  active?: TabKey;
};

type Tab = {
  key: TabKey;
  label: string;
  href: string;
};

const TABS: Tab[] = [
  { key: "home", label: "Home", href: "/home" },
  { key: "log", label: "Log", href: "/log" },
  { key: "history", label: "History", href: "/history" },
  { key: "leaderboard", label: "Leaderboard", href: "/leaderboard" },
  { key: "clubs", label: "Clubs", href: "/clubs" },
  { key: "profile", label: "Profile", href: "/profile" },
];

function inferActive(pathname: string): TabKey {
  const p = (pathname || "").toLowerCase();

  if (p.startsWith("/home")) return "home";
  if (p.startsWith("/log")) return "log";
  if (p.startsWith("/history")) return "history";
  if (p.startsWith("/leaderboard")) return "leaderboard";
  if (p.startsWith("/clubs")) return "clubs";
  if (p.startsWith("/profile")) return "profile";

  if (
    p === "/" ||
    p.startsWith("/announcements") ||
    p.startsWith("/shoes") ||
    p.startsWith("/premium")
  ) {
    return "home";
  }

  return "home";
}

export function TabBar({ active }: TabBarProps) {
  const pathname = usePathname() || "";

  const [hasActiveClub, setHasActiveClub] = useState(false);

  useEffect(() => {
    // Initialize + keep in sync when the active club changes
    const compute = () => {
      try {
        const cid =
          (typeof Store.getActiveClubId === "function" && Store.getActiveClubId()) ||
          (typeof Store.getCurrentClubId === "function" && Store.getCurrentClubId()) ||
          null;

        setHasActiveClub(!!String(cid ?? ""));
      } catch {
        setHasActiveClub(false);
      }
    };

    compute();
    window.addEventListener(ACTIVE_CLUB_CHANGED_EVENT, compute as any);
    return () => window.removeEventListener(ACTIVE_CLUB_CHANGED_EVENT, compute as any);
  }, []);

  const visibleTabs = useMemo(() => {
    if (hasActiveClub) return TABS;
    // No active/selected club => remove leaderboard from nav
    return TABS.filter((t) => t.key !== "leaderboard");
  }, [hasActiveClub]);

  const activeKey = useMemo<TabKey>(() => {
    return active ?? inferActive(pathname);
  }, [active, pathname]);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-black/10 bg-white/95 backdrop-blur">
      <div className="mx-auto max-w-md px-3">
        <div className="flex items-center justify-between py-2">
          {visibleTabs.map((t) => {
            const isActive = t.key === activeKey;
            return (
              <Link
                key={t.key}
                href={t.href}
                className={[
                  "flex-1 text-center",
                  "rounded-xl px-2 py-2",
                  "text-[12px] font-semibold",
                  isActive ? "text-black" : "text-black/50",
                ].join(" ")}
                aria-current={isActive ? "page" : undefined}
              >
                {t.label}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
