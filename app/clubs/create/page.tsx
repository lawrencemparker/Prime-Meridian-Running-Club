"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Store } from "../../../lib/mcrStore";
import { Card } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";

export default function CreateClubPage() {
  const router = useRouter();

  const [mounted, setMounted] = useState(false);

  const [name, setName] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [desc, setDesc] = useState("");

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);

    // ✅ Protect this route against direct access
    if (!Store.isPremium()) {
      router.replace("/premium/create-club");
      return;
    }
  }, [router]);

  const canSubmit = useMemo(() => {
    return name.trim().length >= 3 && !saving;
  }, [name, saving]);

  function onCancel() {
    router.push("/clubs");
  }

  async function onCreate() {
    setErr(null);
    if (!Store.isPremium()) {
      router.replace("/premium/create-club");
      return;
    }

    if (!name.trim()) {
      setErr("Club name is required.");
      return;
    }

    try {
      setSaving(true);
      Store.createClub({
        name: name.trim(),
        is_private: isPrivate,
        description: desc.trim() || null,
      });

      // Return to Home so the header & club-only modules show immediately
      router.push("/home");
    } catch (e: any) {
      setErr(e?.message ?? "Could not create club.");
    } finally {
      setSaving(false);
    }
  }

  // Avoid SSR/hydration weirdness by not rendering form until mounted
  if (!mounted) return null;

  return (
    <main className="min-h-[100dvh] px-5 pt-8 pb-10">
      <Card className="p-6 max-w-[420px] mx-auto">
        <div className="text-[12px] text-black/45 tracking-[0.18em] uppercase">
          Create club
        </div>

        <div className="mt-1 text-[20px] font-semibold tracking-[-0.02em]">
          Set up your community
        </div>

        <p className="mt-1 text-[13px] text-black/55 leading-relaxed">
          Choose a name, set privacy, and invite runners when you’re ready.
        </p>

        <div className="mt-5 space-y-4">
          <div>
            <div className="text-[12px] text-black/45 tracking-[0.18em] uppercase">
              Club name
            </div>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Downtown Runners"
              className="mt-2 w-full rounded-2xl border border-black/10 bg-white/70 px-4 py-3 text-[14px] outline-none focus:border-black/20"
            />
            <div className="mt-2 text-[12px] text-black/40">
              This is what members will see at the top of the app.
            </div>
          </div>

          <div className="rounded-2xl border border-black/10 bg-white/70 px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[13px] font-semibold">Private club</div>
                <div className="mt-0.5 text-[12px] text-black/45">
                  Requests require admin approval.
                </div>
              </div>

              <button
                type="button"
                aria-label="Toggle private club"
                onClick={() => setIsPrivate((v) => !v)}
                className={[
                  "h-8 w-14 rounded-full p-1 transition-colors",
                  isPrivate ? "bg-black/85" : "bg-black/15",
                ].join(" ")}
              >
                <div
                  className={[
                    "h-6 w-6 rounded-full bg-white transition-transform",
                    isPrivate ? "translate-x-6" : "translate-x-0",
                  ].join(" ")}
                />
              </button>
            </div>
          </div>

          <div>
            <div className="text-[12px] text-black/45 tracking-[0.18em] uppercase">
              Description (optional)
            </div>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Weekly runs, training plans, race goals..."
              className="mt-2 w-full min-h-[96px] resize-none rounded-2xl border border-black/10 bg-white/70 px-4 py-3 text-[14px] outline-none focus:border-black/20"
            />
          </div>

          {err ? (
            <div className="rounded-2xl bg-red-500/10 px-4 py-3 text-[13px] text-red-700">
              {err}
            </div>
          ) : null}

          <div className="pt-2 flex items-center gap-3">
            <Button variant="secondary" onClick={onCancel} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={onCreate} disabled={!canSubmit}>
              {saving ? "Creating..." : "Create club"}
            </Button>
          </div>

          <div className="pt-3 text-center text-[12px] text-black/40 leading-relaxed">
            Members will be able to see the directory (name + phone/email), announcements,
            and the monthly club leaderboard.
          </div>
        </div>
      </Card>
    </main>
  );
}
