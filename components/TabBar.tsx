"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/home", label: "Home" },
  { href: "/clubs", label: "Clubs" },
  { href: "/log", label: "Log" },
  { href: "/history", label: "History" },
  { href: "/leaderboard", label: "Board" },
  { href: "/profile", label: "Profile" },
];

export function TabBar() {
  const pathname = usePathname();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center">
      <div className="w-full max-w-[420px] px-4 pb-4">
        <div className="rounded-3xl bg-white/65 backdrop-blur-2xl border border-white/35 shadow-[0_22px_60px_rgba(15,23,42,0.16)]">
          <div className="grid grid-cols-6 px-2 py-2">
            {tabs.map((t) => {
              const active = pathname === t.href;
              const isCenter = t.href === "/log";

              return (
                <Link
                  key={t.href}
                  href={t.href}
                  className={[
                    "no-underline",
                    "flex flex-col items-center justify-center gap-1 py-2 rounded-2xl",
                    active ? "bg-white/55" : "hover:bg-white/45",
                  ].join(" ")}
                >
                  <div
                    className={[
                      "h-9 w-9 rounded-full flex items-center justify-center text-[12px] font-semibold",
                      isCenter
                        ? "bg-gradient-to-b from-[rgba(56,189,248,0.95)] via-[rgba(37,99,235,0.95)] to-[rgba(29,78,216,0.95)] text-white shadow-[0_14px_30px_rgba(37,99,235,0.28)] border border-white/25"
                        : active
                          ? "bg-black/5 text-black"
                          : "bg-black/4 text-black/70",
                    ].join(" ")}
                  >
                    {t.label[0]}
                  </div>
                  <div
                    className={[
                      "text-[11px]",
                      active ? "text-black" : "text-black/55",
                    ].join(" ")}
                  >
                    {t.label}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
