// app/premium/success/page.tsx
"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Store } from "@/lib/mcrStore";

export default function PremiumSuccessPage() {
  const router = useRouter();

  useEffect(() => {
    Store.setPremiumActive(true);
  }, []);

  return (
    <main className="min-h-[100dvh] flex items-center justify-center px-6">
      <Card className="w-full max-w-sm p-6 text-center">
        <div className="mx-auto mb-4 h-14 w-14 rounded-full bg-blue-600/10 flex items-center justify-center">
          <span className="text-[28px]">{"\u{1F389}"}</span>
        </div>

        <h1 className="text-[20px] font-semibold tracking-[-0.01em]">
          You're now a Club Admin
        </h1>

        <p className="mt-2 text-[14px] text-black/60">
          Premium is active. You can now create and manage your own running club.
        </p>

        <div className="mt-6">
          <Button className="w-full" onClick={() => router.push("/clubs/new")}>
            Create your club
          </Button>
        </div>

        <button
          className="mt-4 text-[13px] text-black/50 underline underline-offset-4"
          onClick={() => router.replace("/home")}
          type="button"
        >
          Maybe later
        </button>
      </Card>
    </main>
  );
}
