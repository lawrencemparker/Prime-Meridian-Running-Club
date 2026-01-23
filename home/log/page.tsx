"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { GradientHeader } from "@/components/GradientHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { TabBar } from "@/components/TabBar";
import { Store } from "@/lib/mcrStore";

type RunType = "training" | "race" | "easy" | "workout";

function todayYYYYMMDD() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

export default function LogPage() {
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!mounted) return;
    Store.ensureSeeded?.();
  }, [mounted]);

  const me = useMemo(() => {
    if (!mounted) return null;
    return Store.getMe?.() ?? null;
  }, [mounted]);

  const userName = useMemo(() => {
    return me?.full_name ?? "Runner";
  }, [me]);

  const clubId = useMemo(() => {
    if (!mounted) return null;
    return Store.getActiveClubId?.() ?? Store.getMyApprovedClubId?.() ?? Store.getCurrentClubId?.() ?? null;
  }, [mounted]);

  const clubName = useMemo(() => {
    if (!mounted || !clubId) return null;
    return Store.getClubName?.(clubId) ?? null;
  }, [mounted, clubId]);

  const activeShoes = useMemo(() => {
    if (!mounted) return [] as { id: string; name: string }[];
    const shoes = typeof Store.listShoes === "function" ? (Store.listShoes() as any[]) : [];
    return shoes
      .filter((s) => s && s.active === true)
      .map((s) => ({ id: String(s.id), name: String(s.name ?? "Shoe") }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [mounted]);

  const [date, setDate] = useState<string>(todayYYYYMMDD());
  const [miles, setMiles] = useState<string>("");
  const [type, setType] = useState<RunType>("training");
  const [raceName, setRaceName] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [shoeId, setShoeId] = useState<string>("");

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSave() {
    setErr(null);

    if (!mounted) return;

    if (!me) {
      setErr("You must be signed in to log a run.");
      return;
    }

    if (!clubId) {
      setErr("Select a club first.");
      return;
    }

    const milesNum = Number(miles);
    if (!Number.isFinite(milesNum) || milesNum <= 0) {
      setErr("Miles must be greater than 0.");
      return;
    }

    const safeDate = String(date || "").trim();
    if (!safeDate) {
      setErr("Run date is required.");
      return;
    }

    const safeRaceName = type === "race" ? raceName.trim() : "";
    const safeNotes = notes.trim();
    const safeShoeId = shoeId ? String(shoeId) : "";

    try {
      setSaving(true);

      Store.addRun({
        user_id: me.id,
        club_id: clubId,
        run_date: safeDate,
        miles: milesNum,
        type,
        race_name: safeRaceName || undefined,
        notes: safeNotes || undefined,
        shoe_id: safeShoeId || undefined,
      });

      router.push("/home/history");
    } catch (e: any) {
      setErr(String(e?.message ?? "Unable to save run."));
    } finally {
      setSaving(false);
    }
  }

  if (!mounted) return null;

  return (
    <div className="pb-28">
      <GradientHeader title="Log a Run" subtitle="Add a run to your history" userName={userName} clubName={clubName ?? undefined} />

      <div className="px-5 mt-4 space-y-4">
        {!clubId ? (
          <Card className="p-5">
            <div className="text-[16px] font-semibold">Select a club first</div>
            <div className="mt-2 text-[13px] text-black/55">
              You need an active club to log miles.
            </div>
            <div className="mt-4">
              <Button variant="secondary" onClick={() => router.push("/clubs")}>
                Go to Clubs
              </Button>
            </div>
          </Card>
        ) : null}

        <Card className="p-5">
          <div className="text-[12px] text-black/45 tracking-[0.18em] uppercase">Run details</div>

          <div className="mt-4 space-y-3">
            <div>
              <div className="text-[13px] font-semibold">Date</div>
              <input
                type="date"
                className="mt-2 w-full rounded-xl border border-black/10 px-3 py-2 text-[14px] outline-none"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            <div>
              <div className="text-[13px] font-semibold">Miles</div>
              <input
                inputMode="decimal"
                className="mt-2 w-full rounded-xl border border-black/10 px-3 py-2 text-[14px] outline-none"
                value={miles}
                onChange={(e) => setMiles(e.target.value)}
                placeholder="e.g., 3.1"
              />
            </div>

            <div>
              <div className="text-[13px] font-semibold">Type</div>
              <select
                className="mt-2 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-[14px] outline-none"
                value={type}
                onChange={(e) => setType(e.target.value as RunType)}
              >
                <option value="training">Training</option>
                <option value="easy">Easy</option>
                <option value="workout">Workout</option>
                <option value="race">Race</option>
              </select>
            </div>

            {type === "race" ? (
              <div>
                <div className="text-[13px] font-semibold">Race name</div>
                <input
                  className="mt-2 w-full rounded-xl border border-black/10 px-3 py-2 text-[14px] outline-none"
                  value={raceName}
                  onChange={(e) => setRaceName(e.target.value)}
                  placeholder="e.g., Miami Half Marathon"
                  maxLength={80}
                />
              </div>
            ) : null}

            <div>
              <div className="text-[13px] font-semibold">Notes (optional)</div>
              <textarea
                className="mt-2 w-full rounded-xl border border-black/10 px-3 py-2 text-[14px] outline-none min-h-[92px]"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="How did it feel? Splits? Route? Weather?"
                maxLength={400}
              />
            </div>

            {activeShoes.length > 0 ? (
              <div>
                <div className="text-[13px] font-semibold">Shoe (optional)</div>
                <select
                  className="mt-2 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-[14px] outline-none"
                  value={shoeId}
                  onChange={(e) => setShoeId(e.target.value)}
                >
                  <option value="">No shoe</option>
                  {activeShoes.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
          </div>

          {err ? <div className="mt-4 text-[13px] text-red-600">{err}</div> : null}

          <div className="mt-5 flex gap-3">
            <Button variant="secondary" onClick={() => router.back()} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={onSave} disabled={saving || !clubId}>
              {saving ? "Saving..." : "Save run"}
            </Button>
          </div>
        </Card>
      </div>

      <TabBar />
    </div>
  );
}
