"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { Store } from "../../../lib/mcrStore";

export default function CreateClubPage() {
  const router = useRouter();

  const premium = useMemo(() => Store.isPremium(), []);
  const [name, setName] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [desc, setDesc] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Guard: if user hits this route without Premium, send to paywall
    if (!premium) router.replace("/premium/create-club");
  }, [premium, router]);

  const canCreate = name.trim().length >= 3;

  async function create() {
    if (!canCreate) return;
    setBusy(true);
    try {
      Store.ensureSeeded();
      Store.createClub({
        name,
        is_private: isPrivate,
        description: desc.trim() ? desc.trim() : null,
      });
      router.replace("/clubs/success");

    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="px-5 pt-5 pb-28 space-y-5">
      <Card className="p-5">
        <div className="text-[12px] text-black/45 tracking-[0.18em] uppercase">
          Create club
        </div>
        <div className="mt-1 text-[18px] font-semibold tracking-[-0.01em]">
          Set up your community
        </div>
        <div className="mt-1 text-[13px] text-black/55 leading-relaxed">
          Choose a name, set privacy, and invite runners when you’re ready.
        </div>

        <div className="mt-5 space-y-4">
          <div>
            <label className="text-[12px] text-black/45 tracking-[0.14em] uppercase">
              Club name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Downtown Runners"
              className="mt-2 w-full rounded-2xl border border-black/10 bg-white/70 px-4 py-3 text-[15px] outline-none"
            />
            <div className="mt-2 text-[12px] text-black/40">
              This is what members will see at the top of the app.
            </div>
          </div>

          <div className="rounded-2xl border border-black/10 bg-white/60 px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[14px] font-semibold tracking-[-0.01em]">
                  Private club
                </div>
                <div className="mt-0.5 text-[13px] text-black/55 leading-relaxed">
                  Requests require admin approval.
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsPrivate((v) => !v)}
                className={[
                  "h-7 w-12 rounded-full border transition-all",
                  isPrivate ? "bg-black/90 border-black/90" : "bg-black/10 border-black/10",
                ].join(" ")}
                aria-label="Toggle private club"
              >
                <div
                  className={[
                    "h-6 w-6 rounded-full bg-white shadow-sm transition-all",
                    isPrivate ? "translate-x-5" : "translate-x-0.5",
                  ].join(" ")}
                />
              </button>
            </div>
          </div>

          <div>
            <label className="text-[12px] text-black/45 tracking-[0.14em] uppercase">
              Description (optional)
            </label>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              rows={3}
              placeholder="Weekly runs, training plans, race goals…"
              className="mt-2 w-full rounded-2xl border border-black/10 bg-white/70 px-4 py-3 text-[15px] outline-none resize-none"
            />
          </div>
        </div>

        <div className="mt-6 flex gap-2">
          <Button variant="secondary" onClick={() => router.replace("/clubs")}>
  Cancel
</Button>

          <Button onClick={create} disabled={!canCreate || busy}>
            {busy ? "Creating…" : "Create club"}
          </Button>
        </div>
      </Card>

      <div className="text-[12px] text-black/40 leading-relaxed px-1">
        Members will be able to see the directory (name + phone/email), announcements, and the monthly club leaderboard.
      </div>
    </div>
  );
}
