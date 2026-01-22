// app/premium/create-club/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Store } from "@/lib/mcrStore";

export default function PremiumCreateClubPage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  // Prevent hydration mismatch: only read premium on client after mount
  const [mounted, setMounted] = useState(false);
  const [premiumActive, setPremiumActive] = useState(false);

  useEffect(() => {
    setMounted(true);
    setPremiumActive(Store.isPremium());
  }, []);

  function goBack() {
    // router.back() can be a no-op if the user landed here directly (new tab).
    // Use a safe fallback.
    try {
      if (typeof window !== "undefined" && window.history.length > 1) {
        router.back();
      } else {
        router.replace("/clubs");
      }
    } catch {
      router.replace("/clubs");
    }
  }

  async function startPremium() {
    setBusy(true);
    try {
      Store.setPremiumActive(true);
      setPremiumActive(true);
      router.replace("/clubs/new");
    } finally {
      setBusy(false);
    }
  }

  const primaryCta = useMemo(() => {
    if (!mounted) return "Start my club";
    return premiumActive ? "Continue" : "Start my club";
  }, [mounted, premiumActive]);

  return (
    <div className="px-5 pt-5 pb-10">
      <div className="mx-auto max-w-[720px] space-y-4">
        {/* Top actions */}
        <div className="flex items-center justify-end">
          <Button variant="secondary" className="h-10 px-4 rounded-full" onClick={goBack}>
            Back
          </Button>
        </div>

        {/* HERO */}
        <div className="px-1">
          <div className="text-[28px] font-semibold tracking-[-0.02em] leading-tight">
            Create &amp; lead your running club
          </div>
          <div className="mt-2 text-[14px] text-black/55 leading-relaxed">
            Organize your runners, track team progress, and stay connected — safely.
          </div>

          <div className="mt-4">
            <Button onClick={startPremium} disabled={busy} className="w-full">
              {busy ? "Starting..." : primaryCta}
            </Button>
          </div>

          {/* Cancel / exit */}
          <div className="mt-3 text-center">
            <button
              type="button"
              onClick={() => router.replace("/clubs")}
              className="text-[13px] text-black/55 underline underline-offset-4 hover:text-black/70"
              disabled={busy}
            >
              Not now
            </button>
          </div>
        </div>

        {/* VALUE BLOCKS */}
        <Card className="p-5">
          <div className="text-[12px] text-black/45 tracking-[0.18em] uppercase">What you get</div>

          <div className="mt-4 space-y-4">
            <Feature title="Team leaderboards" body="See total miles across your club each month." icon={"\u{1F3C3}"} />
            <Feature title="Club announcements" body="Share workouts, schedule changes, and race plans." icon={"\u{1F4E3}"} />
            <Feature title="Member directory" body="Access names, phone numbers, and emails for coordination." icon={"\u{1F465}"} />
            <Feature title="Safety-first design" body="Emergency info stays private — visible to admins only." icon={"\u{1F6E1}"} />
            <Feature title="Full control" body="Invite, approve, and manage members anytime." icon={"\u{1F9E0}"} />
          </div>
        </Card>

        {/* TRUST */}
        <Card className="p-5">
          <div className="text-[12px] text-black/45 tracking-[0.18em] uppercase">Built for leaders</div>
          <div className="mt-2 text-[14px] text-black/65 leading-relaxed">
            Trusted by running clubs, training groups, and race teams. Designed to help you lead with clarity — and keep
            your group connected.
          </div>
        </Card>

        {/* PRICING */}
        <Card className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[16px] font-semibold tracking-[-0.01em]">Premium Club</div>
              <div className="mt-1 text-[13px] text-black/55">Cancel anytime.</div>
            </div>
            <div className="text-right">
              <div className="text-[16px] font-semibold">$9.99</div>
              <div className="text-[12px] text-black/45">per month</div>
            </div>
          </div>

          <div className="mt-4 text-[13px] text-black/60">Includes:</div>
          <ul className="mt-2 space-y-1 text-[13px] text-black/55">
            <li>{"\u2022"} Unlimited members</li>
            <li>{"\u2022"} Club leaderboards</li>
            <li>{"\u2022"} Announcements</li>
            <li>{"\u2022"} Member directory</li>
            <li>{"\u2022"} Admin controls</li>
          </ul>

          <div className="mt-5">
            <Button onClick={startPremium} disabled={busy} className="w-full">
              {busy ? "Starting..." : "Start my club"}
            </Button>
          </div>

          <button
            onClick={() => router.replace("/clubs")}
            className="mt-3 w-full text-center text-[13px] text-black/45"
            type="button"
            disabled={busy}
          >
            Already invited to a club? Join instead {"\u2192"}
          </button>
        </Card>

        {/* FOOTER */}
        <div className="px-1 pt-2 text-[12px] text-black/40 leading-relaxed">
          Members don't need Premium to join. Only club admins pay.
        </div>
      </div>
    </div>
  );
}

function Feature({ icon, title, body }: { icon: string; title: string; body: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="text-[18px] mt-[1px]">{icon}</div>
      <div className="min-w-0">
        <div className="text-[14px] font-semibold tracking-[-0.01em]">{title}</div>
        <div className="mt-0.5 text-[13px] text-black/55 leading-relaxed">{body}</div>
      </div>
    </div>
  );
}
