"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { supabaseBrowser } from "@/lib/supabase/client";

/**
 * Platform detection
 * Web = Stripe
 * iOS = Apple IAP
 * Android = Google Play Billing
 */
function detectPlatform(): "web" | "ios" | "android" {
  if (typeof navigator === "undefined") return "web";

  const ua = navigator.userAgent || "";

  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  if (/Android/i.test(ua)) return "android";

  return "web";
}

export default function PremiumPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const nextPath = searchParams.get("next") || "/clubs/create";

  const [loading, setLoading] = useState(true);
  const [isPremium, setIsPremium] = useState<boolean>(false);

  const platform = useMemo(() => detectPlatform(), []);

  useEffect(() => {
    async function loadProfile() {
      const supabase = supabaseBrowser();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("is_premium")
        .eq("id", user.id)
        .single();

      if (profile?.is_premium) {
        // Already premium → go straight to destination
        router.replace(nextPath);
        return;
      }

      setIsPremium(false);
      setLoading(false);
    }

    loadProfile();
  }, [router, nextPath]);

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="text-[14px] text-black/60">Loading…</div>
      </div>
    );
  }

  /**
   * CTA handlers
   * (Billing implementation comes later)
   */
  function handleUpgrade() {
    if (platform === "web") {
      // Placeholder for Stripe Checkout
      alert("Stripe Checkout will be triggered here.");
      return;
    }

    if (platform === "ios") {
      alert("Apple In-App Purchase flow will start here.");
      return;
    }

    if (platform === "android") {
      alert("Google Play Billing flow will start here.");
      return;
    }
  }

  return (
    <div className="mx-auto max-w-[420px] px-4 pt-10 pb-16">
      <Card className="p-6">
        <div className="text-center">
          <div className="text-[18px] font-semibold text-black">
            Upgrade to Premium
          </div>

          <div className="mt-2 text-[14px] text-black/60">
            Unlock club creation and management.
          </div>
        </div>

        {/* Benefits */}
        <div className="mt-6 space-y-3 text-[14px] text-black/80">
          <div>• Create and manage private running clubs</div>
          <div>• Invite members to your club</div>
          <div>• Access club leaderboards</div>
          <div>• Manage members and announcements</div>
        </div>

        {/* Trial Messaging */}
        <div className="mt-6 rounded-lg bg-black/[0.03] p-3 text-center text-[13px] text-black/70">
          7-day free trial · $9.99/month after  
          <br />
          Cancel anytime
        </div>

        {/* CTA */}
        <div className="mt-6">
          <Button className="w-full" onClick={handleUpgrade}>
            {platform === "web" && "Start 7-day free trial"}
            {platform === "ios" && "Start free trial (App Store)"}
            {platform === "android" && "Start free trial (Google Play)"}
          </Button>
        </div>

        {/* Secondary action */}
        <div className="mt-4 text-center">
          <button
            className="text-[13px] text-black/50 underline"
            onClick={() => router.back()}
          >
            Maybe later
          </button>
        </div>
      </Card>
    </div>
  );
}
