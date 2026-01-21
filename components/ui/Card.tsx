import React from "react";

export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={[
        "rounded-3xl",
        "bg-white/70 backdrop-blur-xl",
        "border border-black/5",
        "shadow-[0_18px_45px_rgba(15,23,42,0.10)]",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}
