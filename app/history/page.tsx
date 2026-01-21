"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { GradientHeader } from "../../components/GradientHeader";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { TabBar } from "../../components/TabBar";
import { Store } from "../../lib/mcrStore";

const FLASH_TOAST_KEY = "mcr_flash_toast";

type RunRow = {
  id: string;
  user_id: string;
  club_id: string;
  run_date: string; // YYYY-MM-DD
  miles: number;
  run_type: string;
  race_name?: string | null;
  notes?: string | null;
  shoe_id?: string | null;
};

function monthKeyYYYYMM(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function fmtDate(isoYYYYMMDD: string) {
  try {
    const dt = new Date(`${isoYYYYMMDD}T00:00:00`);
    return dt.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return isoYYYYMMDD;
  }
}

function fmtType(run_type: string, race_name?: string | null) {
  const t = (run_type || "").toLowerCase();
  if (t === "race") return race_name?.trim() ? `Race · ${race_name.trim()}` : "Race";
  if (t === "training") return "Training";
  if (t === "other") return "Other";
  return run_type || "Run";
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

function setFlashToast(msg: string) {
  try {
    window.localStorage.setItem(FLASH_TOAST_KEY, msg);
  } catch {
    // ignore
  }
}

export default function HistoryPage() {
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted) return;
    Store.ensureSeeded?.();
  }, [mounted]);

  const [scope, setScope] = useState<"month" | "all">("month");
  const [refreshNonce, setRefreshNonce] = useState(0);

  useEffect(() => {
    if (!mounted) return;
    const onFocus = () => setRefreshNonce((n) => n + 1);
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [mounted]);

  
  const clubs = useMemo(() => {
    if (!mounted) return [] as any[];
    return typeof Store.listClubs === "function" ? (Store.listClubs() as any[]) : [];
  }, [mounted, refreshNonce]);

  const clubNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of clubs) {
      if (c?.id) map.set(String(c.id), String(c.name ?? "Club"));
    }
    return map;
  }, [clubs]);

const me = useMemo(() => (mounted ? Store.getMe() : null), [mounted]);

  const shoes = useMemo(() => {
    if (!mounted) return [] as any[];
    return typeof Store.listShoes === "function" ? (Store.listShoes() as any[]) : [];
  }, [mounted, refreshNonce]);

  const shoeNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of shoes) {
      if (s?.id) map.set(String(s.id), String(s.name ?? "Shoe"));
    }
    return map;
  }, [shoes]);

  const runs = useMemo(() => {
    if (!mounted || !me) return [] as RunRow[];
    if (typeof Store.listRuns !== "function") return [] as RunRow[];

    const raw = (Store.listRuns() ?? []) as any[];
    const mine = raw.filter((r) => String(r.user_id) === String(me.id));

    const month = monthKeyYYYYMM();
    const filtered =
      scope === "month"
        ? mine.filter((r) => String(r.run_date ?? "").startsWith(month))
        : mine;

    filtered.sort((a, b) => {
      const da = String(a.run_date ?? "");
      const db = String(b.run_date ?? "");
      if (da !== db) return db.localeCompare(da);
      return String(b.id ?? "").localeCompare(String(a.id ?? "")); // stable-ish
    });

    return filtered.map((r) => ({
      id: String(r.id),
      user_id: String(r.user_id),
      club_id: String((r as any).club_id ?? ""),
      run_date: String(r.run_date),
      miles: Number(r.miles ?? 0),
      run_type: String(r.run_type ?? "training"),
      race_name: r.race_name ?? null,
      notes: r.notes ?? null,
      shoe_id: r.shoe_id ?? null,
    }));
  }, [mounted, me, scope, refreshNonce]);

  const totalMiles = useMemo(() => {
    let sum = 0;
    for (const r of runs) {
      const n = Number(r.miles);
      if (Number.isFinite(n)) sum += n;
    }
    return round1(sum);
  }, [runs]);

  // ----- Edit/Delete modal state -----
  const [activeRun, setActiveRun] = useState<RunRow | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>("");

  // Compact form fields
  const [fDate, setFDate] = useState("");
  const [fMiles, setFMiles] = useState("");
  const [fType, setFType] = useState<"training" | "race" | "other">("training");
  const [fRaceName, setFRaceName] = useState("");
  const [fNotes, setFNotes] = useState("");
  const [fShoeId, setFShoeId] = useState<string>("");
  const [showNotes, setShowNotes] = useState(false);

  // Prevent background scroll while modal open
  useEffect(() => {
    if (!activeRun) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [activeRun]);

  function openEdit(r: RunRow) {
    setError("");
    setConfirmDelete(false);
    setActiveRun(r);

    setFDate(r.run_date);
    setFMiles(String(r.miles ?? ""));
    setFType((r.run_type as any) || "training");
    setFRaceName(String(r.race_name ?? ""));
    setFNotes(String(r.notes ?? ""));
    setFShoeId(r.shoe_id ?? "");

    // Notes are optional: default collapsed unless there are existing notes
    setShowNotes(Boolean((r.notes ?? "").trim()));
  }

  function closeEdit() {
    if (busy) return;
    setActiveRun(null);
    setConfirmDelete(false);
    setError("");
  }

  
  const activeRunClubName = useMemo(() => {
    if (!mounted || !activeRun) return "—";
    const id = String(activeRun.club_id ?? "");
    if (!id) return "—";
    return Store.getClubName?.(id) ?? id;
  }, [mounted, activeRun]);

const milesNum = useMemo(() => {
    const n = Number(fMiles);
    if (!Number.isFinite(n)) return NaN;
    return round1(n);
  }, [fMiles]);

  const canSave =
    !!activeRun &&
    fDate.length === 10 &&
    Number.isFinite(milesNum) &&
    milesNum > 0 &&
    (fType !== "race" || fRaceName.trim().length > 0);

  async function saveEdit() {
    if (!activeRun || !canSave) return;
    setBusy(true);
    setError("");

    try {
      Store.updateRun(activeRun.id, {
        run_date: fDate,
        miles: milesNum,
        run_type: fType,
        race_name: fType === "race" ? fRaceName.trim() : null,
        notes: showNotes && fNotes.trim() ? fNotes.trim() : null,
        shoe_id: fShoeId ? fShoeId : null,
      });

      setFlashToast("Run updated.");
      setRefreshNonce((n) => n + 1);
      setActiveRun(null);
      setConfirmDelete(false);
    } catch (e: any) {
      setError(e?.message ? String(e.message) : "Unable to update run.");
    } finally {
      setBusy(false);
    }
  }

  async function doDelete() {
    if (!activeRun) return;
    setBusy(true);
    setError("");

    try {
      Store.deleteRun(activeRun.id);
      setFlashToast("Run deleted.");
      setRefreshNonce((n) => n + 1);
      setActiveRun(null);
      setConfirmDelete(false);
    } catch (e: any) {
      setError(e?.message ? String(e.message) : "Unable to delete run.");
    } finally {
      setBusy(false);
    }
  }

  // Compact control styles
  const labelCls = "text-[11px] text-black/45 tracking-[0.14em] uppercase";
  const inputCls =
    "mt-2 w-full rounded-2xl border border-black/10 bg-white/70 px-4 py-2.5 text-[15px] outline-none";
  const hintCls = "mt-2 text-[12px] text-black/45";

  return (
    <div className="pb-28">
      <GradientHeader title="History" subtitle="Your logged runs" />

      <div className="px-5 mt-2 space-y-4">
        <Card className="p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[12px] text-black/45 tracking-[0.18em] uppercase">
                Summary
              </div>
              <div className="mt-1 text-[16px] font-semibold tracking-[-0.01em]">
                {scope === "month" ? "This month" : "All time"} · {totalMiles.toFixed(1)} miles
              </div>
              <div className="mt-1 text-[13px] text-black/55">
                Tap a run to edit details or delete an entry.
              </div>
            </div>

            <Button onClick={() => router.push("/log")}>Log</Button>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              onClick={() => setScope("month")}
              className={[
                "flex-1 rounded-2xl border px-4 py-3 text-[14px] font-semibold transition",
                scope === "month"
                  ? "border-black/10 bg-black/5 text-black"
                  : "border-black/10 bg-white/70 text-black/70 hover:bg-white",
              ].join(" ")}
            >
              This Month
            </button>

            <button
              onClick={() => setScope("all")}
              className={[
                "flex-1 rounded-2xl border px-4 py-3 text-[14px] font-semibold transition",
                scope === "all"
                  ? "border-black/10 bg-black/5 text-black"
                  : "border-black/10 bg-white/70 text-black/70 hover:bg-white",
              ].join(" ")}
            >
              All Time
            </button>
          </div>
        </Card>

        {runs.length === 0 ? (
          <Card className="p-5">
            <div className="text-[12px] text-black/45 tracking-[0.18em] uppercase">No runs yet</div>
            <div className="mt-1 text-[16px] font-semibold tracking-[-0.01em]">
              Start logging your training
            </div>
            <p className="mt-1 text-[13px] text-black/55">
              Log your first run to build your history and keep shoe mileage accurate.
            </p>
            <div className="mt-4">
              <Button onClick={() => router.push("/log")}>Log a Run</Button>
            </div>
          </Card>
        ) : (
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[12px] text-black/45 tracking-[0.18em] uppercase">Runs</div>
                <div className="mt-1 text-[16px] font-semibold tracking-[-0.01em]">
                  {runs.length} {runs.length === 1 ? "entry" : "entries"}
                </div>
              </div>

              <button
                onClick={() => setRefreshNonce((n) => n + 1)}
                className="text-[12px] text-black/55 hover:text-black/70"
                type="button"
              >
                Refresh
              </button>
            </div>

            <div className="mt-4 space-y-2">
              {runs.map((r) => {
                const shoeLabel = r.shoe_id
                  ? shoeNameById.get(String(r.shoe_id)) ?? "Shoe"
                  : null;

                return (
                  <button
                    key={r.id}
                    onClick={() => openEdit(r)}
                    className="w-full text-left rounded-2xl bg-white/55 border border-black/5 px-4 py-3 hover:bg-white/70 active:bg-white/80 transition"
                    type="button"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-semibold tracking-[-0.01em]">
                          {fmtDate(r.run_date)} · {Number(r.miles).toFixed(1)} mi
                        </div>
                        <div className="mt-1 text-[13px] text-black/60">
                          {fmtType(r.run_type, r.race_name)}
                          {shoeLabel ? (
                            <>
                              {" "}
                              · <span className="text-black/70">{shoeLabel}</span>
                            </>
                          ) : null}
                        </div>
                        {r.notes ? (
                          <div className="mt-2 text-[13px] text-black/55 line-clamp-2">
                            {r.notes}
                          </div>
                        ) : null}
                      </div>

                      <div className="shrink-0 text-[12px] text-black/45">{r.shoe_id ? "👟" : ""}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>
        )}
      </div>

      {/* Edit Modal (compact, higher, no scrollbars) */}
      {activeRun ? (
        <div className="fixed inset-0 z-50">
          <button
            aria-label="Close"
            onClick={closeEdit}
            className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
          />

          <div className="absolute inset-x-0 top-[40px]">
            <div className="mx-auto max-w-[560px] px-4">
              <Card className="rounded-[28px] shadow-[0_30px_90px_rgba(15,23,42,0.25)]">
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[11px] text-black/45 tracking-[0.18em] uppercase">
                        Edit run
                      </div>
                      <div className="mt-1 text-[18px] font-semibold tracking-[-0.01em]">
                        {fmtDate(activeRun.run_date)} · {Number(activeRun.miles).toFixed(1)} mi
                      </div>
                      <div className="mt-1 text-[13px] text-black/55">
                        Shoe mileage updates automatically.
                      </div>
                      <div className="mt-1 text-[13px] text-black/55">
                        Club: <span className="font-medium text-black/70">{clubNameById.get(String(activeRun.club_id)) ?? "—"}</span>
                      </div>
                    </div>

                    <button
                      onClick={closeEdit}
                      className="h-10 w-10 rounded-2xl bg-black/5 hover:bg-black/10 active:bg-black/15 transition flex items-center justify-center"
                      aria-label="Close"
                      disabled={busy}
                    >
                      <span className="text-[18px] leading-none">×</span>
                    </button>
                  </div>

                  {/* Compact grid */}
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>Date</label>
                      <input
                        type="date"
                        value={fDate}
                        onChange={(e) => setFDate(e.target.value)}
                        className={inputCls}
                      />
                    </div>

                    <div>
                      <label className={labelCls}>Miles</label>
                      <input
                        value={fMiles}
                        onChange={(e) => setFMiles(e.target.value)}
                        inputMode="decimal"
                        className={inputCls}
                      />
                      {fMiles && (!Number.isFinite(milesNum) || milesNum <= 0) ? (
                        <div className="mt-2 text-[12px] text-red-600">Enter a valid miles value.</div>
                      ) : null}
                    </div>

                    <div>
                      <label className={labelCls}>Type</label>
                      <select
                        value={fType}
                        onChange={(e) => setFType(e.target.value as any)}
                        className={inputCls}
                      >
                        <option value="training">Training</option>
                        <option value="race">Race</option>
                        <option value="other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className={labelCls}>Shoe (optional)</label>
                      <select
                        value={fShoeId}
                        onChange={(e) => {
                          const nextId = e.target.value;

                          // Allow clearing
                          if (!nextId) {
                            setFShoeId("");
                            return;
                          }

                          const prevId = fShoeId; // current selection in state
                          const attachedId = activeRun?.shoe_id ? String(activeRun.shoe_id) : "";

                          const picked = (shoes as any[]).find(
                            (s) => String(s.id) === String(nextId)
                          );

                          // Treat anything not explicitly true as retired/inactive
                          const isRetired = picked ? picked.active !== true : false;

                          // Block newly selecting retired shoes (but allow if already attached to this run)
                          if (isRetired && String(nextId) !== attachedId) {
                            setFShoeId(prevId || "");
                            return;
                          }

                          setFShoeId(nextId);
                        }}
                        className={inputCls}
                      >
                        <option value="">No shoe selected</option>
                        {shoes.map((s: any) => {
                          const id = String(s.id);
                          const retired = s.active !== true; // consistent with guard above
                          const isSelected = id === (activeRun.shoe_id ?? "");
                          const label = `${s.name}${retired ? " (retired)" : ""}`;

                          return (
                            <option key={id} value={id} disabled={retired && !isSelected}>
                              {label}
                            </option>
                          );
                        })}
                      </select>
                      <div className={hintCls}>Retired shoes cannot be newly selected.</div>
                    </div>

                    {fType === "race" ? (
                      <div className="md:col-span-2">
                        <label className={labelCls}>Race name</label>
                        <input
                          value={fRaceName}
                          onChange={(e) => setFRaceName(e.target.value)}
                          className={inputCls}
                        />
                      </div>
                    ) : null}
                  </div>

                  {/* Notes collapsed by default */}
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={() => setShowNotes((v) => !v)}
                      className="text-[12px] text-black/55 hover:text-black/70"
                      disabled={busy}
                    >
                      {showNotes ? "Hide notes" : "Add notes (optional)"}
                    </button>

                    {showNotes ? (
                      <textarea
                        value={fNotes}
                        onChange={(e) => setFNotes(e.target.value)}
                        rows={2}
                        className="mt-2 w-full rounded-2xl border border-black/10 bg-white/70 px-4 py-2.5 text-[15px] outline-none resize-none"
                      />
                    ) : null}
                  </div>

                  {error ? (
                    <div className="mt-3 rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-[13px] text-red-700">
                      {error}
                    </div>
                  ) : null}

                  {confirmDelete ? (
                    <div className="mt-3 rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3">
                      <div className="text-[13px] font-semibold text-red-700">Delete this run?</div>
                      <div className="mt-1 text-[13px] text-red-700/90">
                        This removes the run and adjusts shoe mileage if a shoe was selected.
                      </div>
                      <div className="mt-3 flex gap-2">
                        <Button
                          variant="secondary"
                          onClick={() => setConfirmDelete(false)}
                          disabled={busy}
                        >
                          Keep
                        </Button>
                        <Button onClick={doDelete} disabled={busy}>
                          {busy ? "Deleting..." : "Delete"}
                        </Button>
                      </div>
                    </div>
                  ) : null}

                  <div className="mt-4 flex items-center justify-between gap-3">
                    <button
                      onClick={() => setConfirmDelete(true)}
                      className="text-[12px] text-red-600 hover:text-red-700"
                      type="button"
                      disabled={busy}
                    >
                      Delete run
                    </button>

                    <div className="flex gap-2">
                      <Button variant="secondary" onClick={closeEdit} disabled={busy}>
                        Cancel
                      </Button>
                      <Button onClick={saveEdit} disabled={!canSave || busy}>
                        {busy ? "Saving..." : "Save"}
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>

              <div className="h-10" />
            </div>
          </div>
        </div>
      ) : null}

      <TabBar />
    </div>
  );
}
