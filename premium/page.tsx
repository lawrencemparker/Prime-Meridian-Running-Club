"use client";

import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
// This page acts as the "clubs explained" screen (formerly the Premium screen).
// Premium gating is currently disabled for test cycles, but we keep this page
// as the user-facing explanation of what a club unlocks.

export default function PremiumPage() {
  const router = useRouter();

  return (
    <main className="min-h-[100dvh] flex items-center justify-center px-6">
      <Card className="w-full max-w-sm p-6">
        <div className="text-[20px] font-semibold tracking-[-0.01em]">Running Clubs</div>
        <div className="mt-1 text-[13px] text-black/55">
          Create a club to organize your runners and track progress in one place.
        </div>

        <div className="mt-6 space-y-3 text-[13px] text-black/70">
          <div className="rounded-2xl bg-black/5 px-4 py-3">
            <div className="font-semibold">What you get</div>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li>Member directory for emergency contacts</li>
              <li>Announcements (club-wide updates)</li>
              <li>Monthly mileage leaderboard</li>
              <li>Admin-managed invitations (coming next)</li>
            </ul>
          </div>

          <div className="rounded-2xl border border-black/10 px-4 py-3">
            <div className="font-semibold">How joining works</div>
            <div className="mt-2 text-black/60">
              Runners will join by invitation from a club admin. This prevents
              random users from joining private clubs.
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          <Button className="w-full" onClick={() => router.push("/clubs/create")}>
            Create a club
          </Button>
          <Button className="w-full" variant="secondary" onClick={() => router.back()}>
            Back
          </Button>
        </div>
      </Card>
    </main>
  );
}
