// components/GradientHeader.tsx
"use client";

import React from "react";

type Props = {
  title: string;
  subtitle?: string;

  /**
   * Optional – used in some screens to display context (e.g., active club).
   */
  clubName?: string;

  /**
   * Optional – allows pages to inject buttons/actions (e.g., “New”, “Edit”).
   */
  rightSlot?: React.ReactNode;

  /**
   * Optional – older pages may not pass this.
   * If you want it displayed, pass Store.getMe()?.full_name from the page.
   */
  userName?: string;
};

export function GradientHeader({
  title,
  subtitle,
  clubName,
  rightSlot,
  userName,
}: Props) {
  return (
    <div className="relative">
      {/* Soft background (no harsh black) */}
      <div className="h-28 w-full bg-gradient-to-b from-sky-100 via-white to-white" />

      {/* Subtle decorative glow */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-28">
        <div className="mx-auto max-w-md px-5 h-full relative">
          <div className="absolute -top-10 right-6 h-32 w-32 rounded-full bg-blue-400/15 blur-2xl" />
          <div className="absolute -top-8 left-8 h-24 w-24 rounded-full bg-sky-300/20 blur-2xl" />
        </div>
      </div>

      {/* Content card */}
      <div className="mx-auto -mt-16 max-w-md px-5">
        <div className="rounded-2xl border border-black/10 bg-white/80 p-4 shadow-[0_18px_50px_rgba(15,23,42,0.10)] backdrop-blur">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[20px] font-semibold tracking-[-0.01em] leading-tight text-black">
                {title}
              </div>

              {!!subtitle && (
                <div className="mt-1 text-[13px] text-black/60">{subtitle}</div>
              )}

              {(clubName || userName) && (
                <div className="mt-2 text-[12px] text-black/55">
                  {userName ? (
                    <span className="font-semibold text-black/70">
                      {userName}
                    </span>
                  ) : null}
                  {userName && clubName ? (
                    <span className="mx-2 text-black/35">•</span>
                  ) : null}
                  {clubName ? <span>{clubName}</span> : null}
                </div>
              )}
            </div>

            {rightSlot ? <div className="shrink-0">{rightSlot}</div> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
