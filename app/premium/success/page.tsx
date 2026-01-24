// app/premium/success/page.tsx
"use client";

import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function PremiumSuccessPage() {
  const sp = useSearchParams();
  const router = useRouter();

  const nextPath = useMemo(() => sp.get("next") || "/home", [sp]);

  return (
    <div className="mx-auto max-w-[420px] px-4 py-8">
      <Card className="p-5">
        <div className="text-[18px] font-semibold">You’re all set</div>
        <div className="mt-1 text-[13px] text-black/55">
          Your upgrade is being applied. If you don’t see premium features immediately, refresh once.
        </div>

        <div className="mt-6">
          <Button onClick={() => router.push(nextPath)}>Continue</Button>

          <button
            className="mt-3 w-full text-center text-[12px] text-black/55 underline underline-offset-4"
            onClick={() => window.location.reload()}
            type="button"
          >
            Refresh
          </button>
        </div>
      </Card>
    </div>
  );
}
