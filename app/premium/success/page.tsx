"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Store } from "../../../lib/mcrStore";

export default function PremiumSuccessPage() {
  const router = useRouter();

  // Ensure premium flag is set (local-only for now)
  useEffect(() => {
    Store.setPremiumActive(true);
  }, []);

  return (
    <main className="min-h-[100dvh] flex items-center justify-center px-6">
      <Card className="w-full max-w-sm p-6 text-center">
        {/* Icon */}
        <div className="mx-auto mb-4 h-14 w-14 rounded-full bg-blue-600/10 flex items-center justify-center">
          <span className="text-[28px]">ðŸŽ‰</span>
        </div>

        {/* Title */}
        <h1 className="text-[20px] font-semibold tracking-[-0.01em]">
          Youâ€™re now a Club Admin
        </h1>

        {/* Body */}
        <p className="mt-2 text-[14px] text-black/60">
          Premium is active. You can now create and manage your own running club.
        </p>

        {/* Primary CTA */}
        <div className="mt-6">
          <Button
            className="w-full"
            onClick={() => router.push("/clubs/new")}

          >
            Create your club
          </Button>
        </div>

        {/* Secondary */}
        <button
          className="mt-4 text-[13px] text-black/50 underline underline-offset-4"
          onClick={() => router.replace("/home")}
        >
          Maybe later
        </button>
      </Card>
    </main>
  );
}
