// app/premium/page.tsx
"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function PremiumPage() {
  const sp = useSearchParams();
  const router = useRouter();

  const nextPath = useMemo(() => sp.get("next") || "/home", [sp]);
  const canceled = sp.get("canceled") === "1";

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function startStripeCheckout() {
    setErr(null);
    setLoading(true);

    try {
      const supabase = supabaseBrowser();
      const { data } = await supabase.auth.getUser();
      const user = data?.user;

      if (!user) {
        router.push(`/login?next=${encodeURIComponent("/premium?next=" + nextPath)}`);
        return;
      }

      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          next: nextPath,
          userId: user.id,
          email: user.email,
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Checkout failed");

      if (!json?.url) throw new Error("Missing Stripe Checkout URL");

      window.location.assign(json.url);
    } catch (e: any) {
      setErr(e?.message || "Failed to start checkout");
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-[420px] px-4 py-8">
      <Card className="p-5">
        <div className="text-[18px] font-semibold">Premium</div>
        <div className="mt-1 text-[13px] text-black/55">
          Unlock clubs, invites, and club leaderboards with a 7-day free trial.
        </div>

        {canceled ? (
          <div className="mt-4 text-[13px] text-black/60">
            Checkout canceled. You can try again anytime.
          </div>
        ) : null}

        <div className="mt-5 space-y-2 text-[13px] text-black/70">
          <div>• Create private clubs</div>
          <div>• Invite members by email</div>
          <div>• Club leaderboard (monthly reset)</div>
          <div>• Multiple admins</div>
        </div>

        {err ? <div className="mt-4 text-[13px] text-red-600">{err}</div> : null}

        <div className="mt-6">
          <Button onClick={startStripeCheckout} disabled={loading}>
            {loading ? "Starting..." : "Start 7-day trial — $9.99/month"}
          </Button>

          <button
            className="mt-3 w-full text-center text-[12px] text-black/55 underline underline-offset-4"
            onClick={() => router.push(nextPath)}
            type="button"
          >
            Not now
          </button>
        </div>
      </Card>
    </div>
  );
}
