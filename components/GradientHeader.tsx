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
      {/* Gradient background */}
      <div className="h-28 w-full bg-gradient-to-br from-black via-black/85 to-black/65" />

      {/* Content */}
      <div className="mx-auto -mt-20 max-w-md px-5">
        <div className="rounded-2xl border border-white/10 bg-white/10 p-4 text-white backdrop-blur">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[20px] font-semibold tracking-[-0.01em] leading-tight">
                {title}
              </div>

              {!!subtitle && (
                <div className="mt-1 text-[13px] text-white/80">
                  {subtitle}
                </div>
              )}

              {(clubName || userName) && (
                <div className="mt-2 text-[12px] text-white/70">
                  {userName ? <span className="font-semibold">{userName}</span> : null}
                  {userName && clubName ? <span className="mx-2">•</span> : null}
                  {clubName ? <span>{clubName}</span> : null}
                </div>
              )}
            </div>

            {rightSlot ? (
              <div className="shrink-0">{rightSlot}</div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
