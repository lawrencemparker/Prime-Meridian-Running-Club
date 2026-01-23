// app/log/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { GradientHeader } from "@/components/GradientHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { TabBar } from "@/components/TabBar";

import { Store } from "@/lib/mcrStore";
import { supabaseBrowser } from "@/lib/supabase/client";

const FLASH_TOAST_KEY = "mcr_flash_toast_v1";

type ClubRow = {
  id: string;
  name: string;
  created_at?: string | null;
  created_by?: string | null;
};

function setFlashToast(msg: string) {
  try {
    window.localStorage.setItem(FLASH_TOAST_KEY, msg);
  } catch {
    // ignore
  }
}

async function fetchMyClubs(userId: string): Promise<ClubRow[]> {
  const supabase = supabaseBrowser();

  // memberships → club_ids
  const { data: mems, error: memErr } = await supabase
    .from("memberships")
    .select("club_id")
    .eq("user_id", userId);

  if (memErr) {
    console.warn("memberships select failed:", memErr.message);
  }

  const clubIds = Array.from(new Set((mems ?? []).map((m: any) => String(m.club_id ?? "")).filter(Boolean)));

  const byMembershipPromise =
    clubIds.length > 0
      ? supabase.from("clubs").select("id,name,created_at,created_by").in("id", clubIds)
      : Promise.resolve({ data: [] as any[], error: null as any });

  const byOwnerPromise = supabase.from("clubs").select("id,name,created_at,created_by").eq("created_by", userId);

  const [byMembership, byOwner] = await Promise.all([byMembershipPromise, byOwnerPromise]);

  if (byMembership.error) console.warn("clubs by membership failed:", byMembership.error.message);
  if (byOwner.error) console.warn("clubs by owner failed:", byOwner.error.message);

  const merged = [...(byMembership.data ?? []), ...(byOwner.data ?? [])] as ClubRow[];

  const dedup = Array.from(new Map(merged.map((c) => [c.id, c])).values()).sort((a, b) =>
    String(a.name).localeCompare(String(b.name))
  );

  return dedup;
}

export default function LogRunPage() {
  const router = useRouter();

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      Store.ensureSeeded();
    } catch {
      // ignore
    }
  }, []);

  // Supabase user id (for club visibility)
  const [userId, setUserId] = useState<string>("");

  useEffect(() => {
    if (!mounted) return;
    const supabase = supabaseBrowser();

    (async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error) {
        console.warn("auth.getUser failed:", error.message);
        return;
      }
      setUserId(data?.user?.id ?? "");
    })().catch(() => {});
  }, [mounted]);

  // Clubs loaded from Supabase (not Store)
  const [clubs, setClubs] = useState<ClubRow[]>([]);
  const [clubsError, setClubsError] = useState<string>("");

  useEffect(() => {
    if (!mounted) return;
    if (!userId) return;

    let cancelled = false;

    (async () => {
      setClubsError("");
      try {
        const rows = await fetchMyClubs(userId);
        if (cancelled) return;
        setClubs(rows);
      } catch (e: any) {
        if (cancelled) return;
        setClubs([]);
        setClubsError(e?.message ? String(e.message) : "Unable to load clubs.");
      }
    })().catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [mounted, userId]);

  // Keep your local "me" for now (runs are still local Store.addRun)
  const me = useMemo(() => {
    if (!mounted) return null;
    try {
      return Store.getMe();
    } catch {
      return null;
    }
  }, [mounted]);

  // Shoes list remains local for now
  const activeShoes = useMemo(() => {
    if (!mounted) return [];
    try {
      if (typeof (Store as any).listActiveShoes === "function") {
        return (Store as any).listActiveShoes();
      }
      if (typeof (Store as any).listShoes === "function") {
        return (Store as any).listShoes().filter((s: any) => s?.active === true);
      }
      return [];
    } catch {
      return [];
    }
  }, [mounted]);

  // Form fields
  const [clubId, setClubId] = useState("");
  const [date, setDate] = useState("");
  const [miles, setMiles] = useState("");
  const [type, setType] = useState<"training" | "race" | "other">("training");
  const [raceName, setRaceName] = useState("");
  const [shoeId, setShoeId] = useState("");
  const [notes, setNotes] = useState("");
  const [showNotes, setShowNotes] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Initialize club selection once clubs load
  useEffect(() => {
    if (!mounted) return;

    // If already selected, keep it (unless it no longer exists)
    if (clubId && clubs.some((c) => String(c.id) === String(clubId))) return;

    try {
      const active = (Store.getActiveClubId?.() ?? "") as any;
      const activeStr = String(active ?? "");

      if (activeStr && clubs.some((c) => String(c.id) === activeStr)) {
        setClubId(activeStr);
        return;
      }
    } catch {
      // ignore
    }

    if (clubs.length) {
      const first = String(clubs[0]?.id ?? "");
      if (first) {
        setClubId(first);
        try {
          Store.setActiveClubId(first);
        } catch {
          // ignore
        }
      }
    } else {
      setClubId("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, clubs.length]);

  // Initialize date once
  useEffect(() => {
    if (!mounted) return;
    if (!date) {
      try {
        const d = new Date();
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        setDate(`${yyyy}-${mm}-${dd}`);
      } catch {
        // ignore
      }
    }
  }, [mounted, date]);

  const milesNum = useMemo(() => {
    const n = Number(miles);
    return n;
  }, [miles]);

  const canSave = useMemo(() => {
    if (!me) return false;
    if (!clubId) return false;
    if (!date) return false;
    if (!miles) return false;
    if (!Number.isFinite(milesNum) || milesNum <= 0) return false;
    if (type === "race" && !raceName.trim()) return false;
    return !busy;
  }, [me, clubId, date, miles, milesNum, type, raceName, busy]);

  const labelCls = "text-[11px] text-black/45 tracking-[0.14em] uppercase";
  const inputCls =
    "mt-2 w-full rounded-2xl border border-black/10 bg-white/70 px-4 py-2.5 text-[15px] outline-none";
  const hintCls = "mt-2 text-[12px] text-black/45";
  const selectCls = `${inputCls} h-11`;

  function save() {
    if (!canSave || !me) return;
    setBusy(true);
    setError("");

    try {
      const payload: any = {
        user_id: me.id,
        club_id: clubId,
        run_date: date,
        miles: Number(milesNum),
        type,
        race_name: type === "race" ? raceName.trim() : "",
        shoe_id: shoeId ? String(shoeId) : undefined,
        notes: notes.trim(),
      };

      // NOTE: still local Store for now
      Store.addRun(payload);

      setFlashToast("Run logged.");
      router.push("/history");
    } catch (e: any) {
      setError(e?.message ? String(e.message) : "Unable to log run.");
      setBusy(false);
    }
  }

  return (
    <div className="pb-28">
      <GradientHeader title="Log a Run" subtitle="Add a run to your history" />

      <div className="px-5 mt-2">
        <Card className="p-5">
          <div className="text-[11px] text-black/45 tracking-[0.18em] uppercase">Log run</div>
          <div className="mt-1 text-[18px] font-semibold tracking-[-0.01em]">Run details</div>
          <div className="mt-1 text-[13px] text-black/55">Shoe mileage updates automatically.</div>

          {clubsError ? <div className="mt-3 text-[12px] text-red-600">{clubsError}</div> : null}

          {!clubs.length ? (
            <div className="mt-3 rounded-2xl border border-black/10 bg-white/60 px-4 py-3 text-[13px] text-black/65">
              No clubs available to select. Create a club first.
              <div className="mt-3 flex gap-2">
                <Button onClick={() => router.push("/clubs/create")}>Create club</Button>
                <Button variant="secondary" onClick={() => router.push("/clubs")}>
                  View clubs
                </Button>
              </div>
            </div>
          ) : null}

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Club */}
            <div className="md:col-span-2">
              <label className={labelCls}>Running club</label>
              <select value={clubId} onChange={(e) => setClubId(e.target.value)} className={inputCls}>
                <option value="">Select a club</option>
                {clubs.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <div className={hintCls}>Miles are tracked per club.</div>
            </div>

            {/* Date */}
            <div>
              <label className={labelCls}>Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
            </div>

            {/* Miles */}
            <div>
              <label className={labelCls}>Miles</label>
              <input
                value={miles}
                onChange={(e) => setMiles(e.target.value)}
                inputMode="decimal"
                placeholder="e.g., 3.1"
                className={inputCls}
              />
              {miles && (!Number.isFinite(milesNum) || milesNum <= 0) ? (
                <div className="mt-2 text-[12px] text-red-600">Enter a valid miles value.</div>
              ) : null}
            </div>

            {/* Type */}
            <div>
              <label className={labelCls}>Type</label>
              <select value={type} onChange={(e) => setType(e.target.value as any)} className={selectCls}>
                <option value="training">Training</option>
                <option value="race">Race</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Race name */}
            {type === "race" ? (
              <div>
                <label className={labelCls}>Race name</label>
                <input
                  value={raceName}
                  onChange={(e) => setRaceName(e.target.value)}
                  placeholder="e.g., City 10K"
                  className={inputCls}
                />
              </div>
            ) : (
              <div />
            )}

            {/* Shoe */}
            <div className="md:col-span-2">
              <label className={labelCls}>Shoe</label>
              <select value={shoeId} onChange={(e) => setShoeId(e.target.value)} className={selectCls}>
                <option value="">No shoe</option>
                {activeShoes.map((s: any) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <div className={hintCls}>Optional.</div>
            </div>

            {/* Notes */}
            <div className="md:col-span-2">
              <div className="flex items-center justify-between">
                <label className={labelCls}>Notes</label>
                <button
                  type="button"
                  className="text-[12px] text-black/55 underline"
                  onClick={() => setShowNotes((v) => !v)}
                >
                  {showNotes ? "Hide" : "Add"} notes
                </button>
              </div>

              {showNotes ? (
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="How did it feel?"
                  className={`${inputCls} min-h-[96px]`}
                />
              ) : null}
            </div>
          </div>

          {error ? <div className="mt-4 text-[13px] text-red-600">{error}</div> : null}

          <div className="mt-5 flex gap-2">
            <Button onClick={save} disabled={!canSave}>
              {busy ? "Saving..." : "Save run"}
            </Button>
            <Button variant="secondary" onClick={() => router.push("/history")}>
              Cancel
            </Button>
          </div>

          <div className="mt-4 text-[12px] text-black/45">
            Note: runs are still saved locally via Store.addRun(). When you migrate runs to Supabase, this page should
            insert into the <code>runs</code> table instead.
          </div>
        </Card>
      </div>

      <TabBar />
    </div>
  );
}
