import React from "react";

type Variant = "primary" | "secondary" | "ghost";

export function Button({
  children,
  onClick,
  type = "button",
  variant = "primary",
  className = "",
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  variant?: Variant;
  className?: string;
  disabled?: boolean;
}) {
  const base =
    "w-full h-[54px] rounded-full px-6 text-[16px] font-semibold tracking-[-0.01em] " +
    "transition-all duration-150 active:scale-[0.985] " +
    "disabled:opacity-55 disabled:active:scale-100";

  const styles =
    variant === "primary"
      ? [
          "text-white",
          "bg-gradient-to-b from-[rgba(56,189,248,0.95)] via-[rgba(37,99,235,0.95)] to-[rgba(29,78,216,0.95)]",
          "shadow-[0_14px_32px_rgba(37,99,235,0.28)]",
          "border border-white/20",
        ].join(" ")
      : variant === "secondary"
        ? [
            "text-[rgb(var(--text))]",
            "bg-white/65 backdrop-blur-xl",
            "border border-black/10",
            "shadow-[0_14px_30px_rgba(15,23,42,0.08)]",
          ].join(" ")
        : [
            "text-[rgb(var(--text))]",
            "bg-transparent",
            "border border-transparent",
          ].join(" ");

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={[base, styles, className].join(" ")}
    >
      {children}
    </button>
  );
}
