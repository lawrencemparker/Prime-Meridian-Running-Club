"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { TabBar } from "@/components/TabBar";
import { GradientHeader } from "@/components/GradientHeader";

import { Store } from "@/lib/mcrStore";

export default function CreateClubPage() {
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!mounted) return;
    Store.ensureSeeded?.();
  }, [mounted]);

  const userName = useMemo(() => {
    if (!mounted) return "Runner";
    return Store.getMe()?.full_name ?? "Runner";
  }, [mounted]);

  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function togglePrivate() {
    setIsPrivate((v) => !v);
  }

  async function onCreate() {
    setErr(null);

    const n = String(name ?? "").trim();
    if (n.length < 2) {
      setErr("Club name is required.");
      return;
    }

    try {
      setSaving(true);

      const club = Store.createClub({
        name: n,
        is_private: isPrivate,
        description: String(desc ?? "").trim() || "",
      });

      router.replace(`/clubs/success?clubId=${encodeURIComponent(club.id)}`);
    } catch (e: any) {
      setErr(String(e?.message ?? "Unable to create club."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="pb-28">
      <GradientHeader
        title="Create Club"
        subtitle="Set up a new running club."
        userName={userName}
      />

      <div className="px-5 mt-4">
        <Card className="p-5">
          <div className="text-[13px] font-semibold">Club name</div>
          <input
            className="mt-2 w-full rounded-xl border border-black/10 px-3 py-2 text-[14px] outline-none"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Prime Meridian Running Club"
            maxLength={60}
          />

          <div className="mt-4 text-[13px] font-semibold">Description (optional)</div>
          <textarea
            className="mt-2 w-full rounded-xl border border-black/10 px-3 py-2 text-[14px] outline-none min-h-[92px]"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="What is this club about?"
            maxLength={240}
          />

          <div className="mt-4 flex items-center justify-between">
            <div>
              <div className="text-[13px] font-semibold">Private club</div>
              <div className="text-[12px] text-black/55 mt-1">
                Only members can see details.
              </div>
            </div>

            <button
              type="button"
              onClick={togglePrivate}
              className="rounded-full border border-black/10 px-3 py-2 text-[13px]"
              aria-pressed={isPrivate}
            >
              {isPrivate ? "On" : "Off"}
            </button>
          </div>

          {err ? <div className="mt-4 text-[13px] text-red-600">{err}</div> : null}

          <div className="mt-5 flex gap-3">
            <Button variant="secondary" onClick={() => router.back()} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={onCreate} disabled={saving}>
              {saving ? "Creating..." : "Create"}
            </Button>
          </div>
        </Card>
      </div>

      <TabBar active="clubs" />
    </div>
  );
}
