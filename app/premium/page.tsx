"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { GradientHeader } from "@/components/GradientHeader";
import { TabBar } from "@/components/TabBar";

import { Store } from "@/lib/mcrStore";

export default function PremiumPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp.get("next") || "/clubs/create";

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isPremium = useMemo(() => {
    if (!mounted) return false;
    try {
      return Boolean(Store.isPremium?.() ?? Store.isPremiumActive?.() ?? false);
    } catch {
      return false;
    }
  }, [mounted]);

  function enablePremiumForTesting() {
    // No billing in this build. This is a local toggle so test runners can create clubs.
    try {
      Store.setPremium?.(true);
    } catch {
      // ignore
    }
    router.replace(next);
  }

  function disablePremium() {
    try {
      Store.setPremium?.(false);
    } catch {
      // ignore
    }
    router.replace("/clubs");
  }

  return (
    <div className="pb-28">
      <GradientHeader
        title="Premium"
        subtitle="Unlock club tools for your members."
        userName={mounted ? Store.getMe()?.full_name ?? "Runner" : "Runner"}
      />

      <div className="px-5 mt-2 space-y-4">
        <Card className="p-6">
          <div className="text-[12px] text-black/45 tracking-[0.18em] uppercase">Premium features</div>
          <div className="mt-2 text-[18px] font-semibold">Run clubs like a real organization</div>
          <p className="mt-2 text-[13px] text-black/60 leading-relaxed">
            Premium unlocks club creation and admin tools so you can manage members, post announcements,
            and build monthly leaderboards.
          </p>

          <div className="mt-4 grid gap-2 text-[13px] text-black/70">
            <div>• Create unlimited clubs</div>
            <div>• Invite runners and manage roles</div>
            <div>• Club announcements and updates</div>
            <div>• Club leaderboards and mileage tracking</div>
          </div>

          <div className="mt-6 flex gap-3">
            {isPremium ? (
              <>
                <Button className="flex-1" onClick={() => router.replace(next)}>
                  Continue
                </Button>
                <Button className="flex-1" variant="secondary" onClick={disablePremium}>
                  Disable
                </Button>
              </>
            ) : (
              <>
                <Button className="flex-1" onClick={enablePremiumForTesting}>
                  Enable Premium (Testing)
                </Button>
                <Button className="flex-1" variant="secondary" onClick={() => router.back()}>
                  Back
                </Button>
              </>
            )}
          </div>

          {!isPremium ? (
            <div className="mt-3 text-[12px] text-black/45">
              This switch is local-only and intended for test runners.
            </div>
          ) : null}
        </Card>
      </div>

      <TabBar />
    </div>
  );
}
