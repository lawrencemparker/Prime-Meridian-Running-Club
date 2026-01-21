"use client";

import Image from "next/image";
import { ReactNode } from "react";
import { useRouter } from "next/navigation";

type Props = {
  title?: string;
  subtitle?: string;
  userName: string;
  clubName?: string | null;

  /**
   * Optional action area (e.g., "New", "View", "Manage").
   * Renders on the far right of the identity row.
   */
  rightSlot?: ReactNode;

  /**
   * Override logo click destination.
   * Defaults to /profile
   */
  logoHref?: string;
};

function clubToAccent(name: string) {
  const colors = [
    "bg-blue-100 text-blue-700 ring-blue-200/60",
    "bg-emerald-100 text-emerald-700 ring-emerald-200/60",
    "bg-indigo-100 text-indigo-700 ring-indigo-200/60",
    "bg-sky-100 text-sky-700 ring-sky-200/60",
    "bg-violet-100 text-violet-700 ring-violet-200/60",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export function GradientHeader({
  title,
  subtitle,
  userName,
  clubName,
  rightSlot,
  logoHref = "/profile",
}: Props) {
  const router = useRouter();

  return (
    <div className="px-5 pt-6">
      <div className="rounded-[28px] bg-white/70 backdrop-blur-xl shadow-[0_20px_50px_rgba(15,23,42,0.08)] px-5 py-5">
        {/* Identity row */}
        <div className="flex items-center gap-4">
          {/* Logo (tap → profile/settings) */}
          <button
            type="button"
            onClick={() => router.push(logoHref)}
            className={[
              // Bigger hit area + bigger visible logo (matches your red square intent)
              "relative h-[84px] w-[84px] shrink-0",
              "rounded-[22px] overflow-hidden",
              "bg-white/95 shadow-[0_10px_30px_rgba(15,23,42,0.12)]",
              "ring-1 ring-black/5",
              "focus:outline-none focus:ring-2 focus:ring-[rgba(var(--accent),0.35)]",
            ].join(" ")}
            aria-label="Open profile"
          >
            <Image
              src="/logo.jpeg"
              alt="My Club Running"
              fill
              priority
              sizes="84px"
              // Less padding so the logo reads better
              className="object-contain p-1.5"
            />
          </button>

          {/* Name + club */}
          <div className="min-w-0 flex-1">
            <div className="text-[16px] font-semibold leading-tight truncate">
              {userName}
            </div>

            {clubName ? (
              <div className="mt-1">
                <span
                  className={[
                    "inline-flex items-center rounded-full px-2.5 py-0.5",
                    "text-[10px] font-medium tracking-[0.14em] uppercase",
                    "ring-1",
                    clubToAccent(clubName),
                  ].join(" ")}
                >
                  {clubName}
                </span>
              </div>
            ) : null}
          </div>

          {/* Optional action area (keeps buttons from stretching/going vertical) */}
          {rightSlot ? (
            <div className="shrink-0 flex items-center">{rightSlot}</div>
          ) : null}
        </div>

        {/* Greeting */}
        {title || subtitle ? (
          <div className="mt-5">
            {title ? (
              <div className="text-[20px] font-semibold tracking-[-0.01em]">
                {title}
              </div>
            ) : null}

            {subtitle ? (
              <div className="mt-1 text-[14px] text-black/55">{subtitle}</div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
