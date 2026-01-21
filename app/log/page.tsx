"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { GradientHeader } from "@/components/GradientHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { TabBar } from "@/components/TabBar";

import { Store } from "../../lib/mcrStore";

const FLASH_TOAST_KEY = "mcr_flash_toast_v1";

function setFlashToast(msg: string) {
  try {
    window.localStorage.setItem(FLASH_TOAST_KEY, msg);
  } catch {
    // ignore
  }
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

  const me = useMemo(() => {
    if (!mounted) return null;
    try {
      return Store.getMe();
    } catch {
      return null;
    }
  }, [mounted]);

  const clubs = useMemo(() => {
    if (!mounted) return [];
    try {
      return Store.listClubs();
    } catch {
      return [];
    }
  }, [mounted]);

  // âœ… ONLY active shoes (not retired). "retired" does not exist in your Shoe type.
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

  // Form fields (aligned to Edit Run form)
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

  // Initialize club selection once
  useEffect(() => {
    if (!mounted) return;

    try {
      const active = Store.getActiveClubId?.() ?? null;
      if (active && !clubId) setClubId(String(active));
      if (!active && clubs.length && !clubId) setClubId(String(clubs[0]?.id ?? ""));
    } catch {
      if (clubs.length && !clubId) setClubId(String(clubs[0]?.id ?? ""));
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
        // âœ… prefer undefined over empty string
        shoe_id: shoeId ? String(shoeId) : undefined,
        notes: notes.trim(),
      };

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

            {/* Shoe */}
            <div>
              <label className={labelCls}>Shoe (optional)</label>

              <select value={shoeId} onChange={(e) => setShoeId(e.target.value)} className={selectCls}>
                <option value="">No shoe selected</option>
                {activeShoes.map((s: any) => (
                  <option key={String(s.id)} value={String(s.id)}>
                    {String(s.name ?? "Shoe")}
                  </option>
                ))}
              </select>
              <div className={hintCls}>Only active shoes are selectable.</div>
            </div>

            {/* Race name */}
            {type === "race" ? (
              <div className="md:col-span-2">
                <label className={labelCls}>Race name</label>
                <input
                  value={raceName}
                  onChange={(e) => setRaceName(e.target.value)}
                  placeholder="e.g., City 10K"
                  className={inputCls}
                />
              </div>
            ) : null}

            {/* Notes toggle */}
            <div className="md:col-span-2">
              <button
                type="button"
                onClick={() => setShowNotes((v) => !v)}
                className="text-left text-[13px] text-black/55 hover:text-black/70"
              >
                Add notes (optional)
              </button>

              {showNotes ? (
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  className={inputCls}
                  placeholder="How did it feel?"
                />
              ) : null}
            </div>
          </div>

          {type === "race" && !raceName.trim() ? (
            <div className="mt-3 text-[12px] text-red-600">Race name is required when Type is Race.</div>
          ) : null}

          {error ? <div className="mt-3 text-[12px] text-red-600">{error}</div> : null}

          <div className="mt-5 flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => router.back()} disabled={busy}>
              Cancel
            </Button>
            <Button className="flex-1" onClick={save} disabled={!canSave}>
              {busy ? "Saving..." : "Save"}
            </Button>
          </div>
        </Card>
      </div>

      <TabBar active="log" />
    </div>
  );
}
