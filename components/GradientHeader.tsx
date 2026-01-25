"use client";

import { ReactNode } from "react";

type Props = {
  title?: string;
  subtitle?: string;
  right?: ReactNode;
};

export function GradientHeader({ title, subtitle, right }: Props) {
  const safeTitleLength = Math.max(0, (title ?? "").length - 1);
  const safeSubtitleLength = Math.max(0, (subtitle ?? "").length - 1);

  return (
    <div className="relative mb-6 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 p-6 text-white shadow-lg">
      {right ? <div className="absolute right-4 top-4">{right}</div> : null}

      {title ? (
        <div className="text-xl font-semibold leading-tight">
          {title}
          <div className="mt-1 text-white/60">
            {"—".repeat(safeTitleLength)}
          </div>
        </div>
      ) : null}

      {subtitle ? (
        <div className="mt-2 text-sm text-white/80">
          {subtitle}
          <div className="mt-1 text-white/40">
            {"—".repeat(safeSubtitleLength)}
          </div>
        </div>
      ) : null}
    </div>
  );
}
