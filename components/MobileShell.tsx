import React from "react";

export function MobileShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh] w-full flex justify-center">
      <div className="w-full max-w-[420px] min-h-[100dvh]">
        {children}
      </div>
    </div>
  );
}
