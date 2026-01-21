"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { Store } from "../../../lib/mcrStore";

export default function PremiumCreateClubPage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const premiumActive = useMemo(() => Store.isPremium(), []);

  async function startPremium() {
    // Placeholder “payment” flow (local entitlement).
    // Later: replace this block with Stripe/RevenueCat/etc.
    setBusy(true);
    try {
      Store.setPremiumActive(true);
      router.replace("/clubs/new");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="px-5 pt-5 pb-10">
      <div className="space-y-4">
        {/* HERO */}
        <div className="px-1">
          <div className="text-[28px] font-semibold tracking-[-0.02em] leading-tight">
            Create & lead your running club
          </div>
          <div className="mt-2 text-[14px] text-black/55 leading-relaxed">
            Organize your runners, track team progress, and stay connected — safely.
          </div>

          <div className="mt-4">
            <Button onClick={startPremium} disabled={busy}>
              {busy ? "Starting…" : premiumActive ? "Continue" : "Start my club"}
            </Button>
          </div>
        </div>

        {/* VALUE BLOCKS */}
        <Card className="p-5">
          <div className="text-[12px] text-black/45 tracking-[0.18em] uppercase">
            What you get
          </div>

          <div className="mt-4 space-y-4">
            <Feature
              title="Team leaderboards"
              body="See total miles across your club each month."
              icon="🏃"
            />
            <Feature
              title="Club announcements"
              body="Share workouts, schedule changes, and race plans."
              icon="📣"
            />
            <Feature
              title="Member directory"
              body="Access names, phone numbers, and emails for coordination."
              icon="👥"
            />
            <Feature
              title="Safety-first design"
              body="Emergency info stays private — visible to admins only."
              icon="🛡"
            />
            <Feature
              title="Full control"
              body="Invite, approve, and manage members anytime."
              icon="🧠"
            />
          </div>
        </Card>

        {/* TRUST */}
        <Card className="p-5">
          <div className="text-[12px] text-black/45 tracking-[0.18em] uppercase">
            Built for leaders
          </div>
          <div className="mt-2 text-[14px] text-black/65 leading-relaxed">
            Trusted by running clubs, training groups, and race teams. Designed to help you
            lead with clarity — and keep your group connected.
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

          <div className="mt-4 text-[13px] text-black/60">
            Includes:
          </div>
          <ul className="mt-2 space-y-1 text-[13px] text-black/55">
            <li>• Unlimited members</li>
            <li>• Club leaderboards</li>
            <li>• Announcements</li>
            <li>• Member directory</li>
            <li>• Admin controls</li>
          </ul>

          <div className="mt-5">
            <Button onClick={startPremium} disabled={busy}>
              {busy ? "Starting…" : "Start my club"}
            </Button>
          </div>

          <button
            onClick={() => router.replace("/clubs")}
            className="mt-3 w-full text-center text-[13px] text-black/45"
            type="button"
          >
            Already invited to a club? Join instead →
          </button>
        </Card>

        {/* FOOTER */}
        <div className="px-1 pt-2 text-[12px] text-black/40 leading-relaxed">
          Members don’t need Premium to join. Only club admins pay.
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
