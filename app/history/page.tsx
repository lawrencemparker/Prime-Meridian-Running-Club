// app/history/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { GradientHeader } from "@/components/GradientHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { TabBar } from "@/components/TabBar";

import { Store, type Run, type Shoe } from "@/lib/mcrStore";

function todayYYYYMMDD() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function fmtDateLabel(yyyyMmDd: string) {
  try {
    const [y, m, d] = yyyyMmDd.split("-").map((x) => Number(x));
    const dt = new Date(y, (m || 1) - 1, d || 1);
    return dt.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
  } catch {
    return yyyyMmDd;
  }
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

type Toast = { msg: string; kind?: "ok" | "err" };

type EditMode = "add" | "edit";

export default function HistoryPage() {
  const router = useRouter();

  const [mounted, setMounted] = useState(false);

  const [toast, setToast] = useState<Toast | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  // list refresh nonce
  const [refreshNonce, setRefreshNonce] = useState(0);

  // runs
  const runs: Run[] = useMemo(() => {
    if (!mounted) return [];
    return Store.listRuns();
  }, [mounted, refreshNonce]);

  // shoes (for displaying + edit form)
  const shoes: Shoe[] = useMemo(() => {
    if (!mounted) return [];
    return Store.listShoes();
  }, [mounted, refreshNonce]);

  const userName = useMemo(() => {
    if (!mounted) return "Runner";
    return Store.getMe()?.full_name ?? "Runner";
  }, [mounted]);

  const clubId = useMemo(() => {
    if (!mounted) return null;
    return Store.getActiveClubId() ?? Store.getMyApprovedClubId();
  }, [mounted]);

  const clubName = useMemo(() => {
    if (!mounted || !clubId) return null;
    return Store.getClubName(clubId);
  }, [mounted, clubId]);

  // filter state
  const [fType, setFType] = useState<string>("all");

  // modal state
  const [openModal, setOpenModal] = useState(false);
  const [mode, setMode] = useState<EditMode>("add");
  const [editingId, setEditingId] = useState<string | null>(null);

  // form fields
  const [fDate, setFDate] = useState(todayYYYYMMDD());
  const [fMiles, setFMiles] = useState("");
  const [fRaceName, setFRaceName] = useState("");
  const [fNotes, setFNotes] = useState("");
  const [fShoeId, setFShoeId] = useState<string>("");

  const [showNotes, setShowNotes] = useState(false);

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => {
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!mounted) return;
    Store.ensureSeeded?.();
  }, [mounted]);

  function bump() {
    setRefreshNonce((n) => n + 1);
  }

  function showToast(msg: string, kind: "ok" | "err" = "ok") {
    setToast({ msg, kind });
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(null), 2400);
  }

  const filteredRuns = useMemo(() => {
    const all = runs.slice();

    // only show runs for selected/approved club if we have a clubId
    const clubScoped = clubId ? all.filter((r) => String(r.club_id) === String(clubId)) : all;

    if (fType === "all") return clubScoped;

    return clubScoped.filter((r) => String(r.type ?? "") === fType);
  }, [runs, fType, clubId]);

  const totalMiles = useMemo(() => {
    return round1(filteredRuns.reduce((sum, r) => sum + Number(r.miles ?? 0), 0));
  }, [filteredRuns]);

  function resetForm() {
    setFDate(todayYYYYMMDD());
    setFMiles("");
    setFType("training");
    setFRaceName("");
    setFNotes("");
    setFShoeId("");
    setShowNotes(false);

    setSaving(false);
    setDeleting(false);

    setEditingId(null);
    setMode("add");
  }

  function openAdd() {
    resetForm();
    setMode("add");
    setOpenModal(true);
  }

  function openEdit(r: Run) {
    setMode("edit");
    setEditingId(r.id);

    setFDate(String(r.run_date ?? todayYYYYMMDD()));
    setFMiles(String(r.miles ?? ""));
    setFType(String(r.type ?? "training"));

    setFRaceName(String(r.race_name ?? ""));
    setFNotes(String(r.notes ?? ""));
    setShowNotes(Boolean(r.notes && String(r.notes).trim().length > 0));

    setFShoeId(String(r.shoe_id ?? ""));

    setSaving(false);
    setDeleting(false);

    setOpenModal(true);
  }

  function closeModal() {
    setOpenModal(false);
    resetForm();
  }

  function milesNumberOrNaN(v: string) {
    const n = Number(String(v).trim());
    return Number.isFinite(n) ? n : NaN;
  }

  async function onSave() {
    if (!mounted) return;

    if (!clubId) {
      showToast("Select a club first.", "err");
      router.push("/clubs");
      return;
    }

    const milesNum = milesNumberOrNaN(fMiles);
    if (!Number.isFinite(milesNum) || milesNum <= 0) {
      showToast("Miles must be greater than 0.", "err");
      return;
    }

    const runDate = String(fDate ?? "").trim();
    if (!runDate) {
      showToast("Date is required.", "err");
      return;
    }

    const type = String(fType ?? "training").trim() || "training";

    // IMPORTANT: never pass null to fields typed as string | undefined
    const race_name = type === "race" ? (fRaceName.trim() || undefined) : undefined;
    const notes = showNotes ? (fNotes.trim() || undefined) : undefined;
    const shoe_id = fShoeId ? String(fShoeId) : undefined;

    try {
      setSaving(true);

      if (mode === "add") {
        const me = Store.getMe();
        const userId = String(me?.id ?? "local-user");

        Store.addRun({
          user_id: userId,
          club_id: String(clubId),
          run_date: runDate,
          miles: milesNum,
          type,
          race_name,
          notes,
          shoe_id,
        });

        bump();
        closeModal();
        showToast("Run added", "ok");
        return;
      }

      if (!editingId) {
        setSaving(false);
        showToast("Missing run id.", "err");
        return;
      }

      Store.updateRun(editingId, {
        run_date: runDate,
        miles: milesNum,
        type,
        race_name,
        notes,
        shoe_id,
      });

      bump();
      closeModal();
      showToast("Changes saved", "ok");
    } catch (e: any) {
      setSaving(false);
      showToast(String(e?.message ?? "Unable to save."), "err");
    }
  }

  async function onDelete() {
    if (!editingId) return;
    const ok = window.confirm("Delete this run? This cannot be undone.");
    if (!ok) return;

    try {
      setDeleting(true);
      Store.deleteRun(editingId);
      bump();
      closeModal();
      showToast("Run deleted", "ok");
    } catch (e: any) {
      setDeleting(false);
      showToast(String(e?.message ?? "Unable to delete."), "err");
    }
  }

  if (!mounted) return null;

  return (
    <div className="pb-28">
      <GradientHeader
        title="History"
        subtitle="Your logged runs"
        userName={userName}
        clubName={clubName ?? undefined}
        rightSlot={
          <Button className="h-9 px-4 rounded-full text-[13px] font-semibold" onClick={openAdd}>
            Add
          </Button>
        }
      />

      <div className="px-5 mt-3 space-y-3">
        {toast ? (
          <div
            className={[
              "rounded-2xl border px-4 py-3 text-[13px] font-semibold",
              toast.kind === "err"
                ? "border-red-500/25 bg-red-500/10 text-red-800"
                : "border-emerald-500/25 bg-emerald-500/10 text-emerald-800",
            ].join(" ")}
          >
            {toast.msg}
          </div>
        ) : null}

        <Card className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[12px] text-black/45 tracking-[0.18em] uppercase">
                Summary
              </div>
              <div className="mt-1 text-[16px] font-semibold">Total: {totalMiles} mi</div>
              <div className="mt-1 text-[13px] text-black/55">
                Tap a run to edit.
              </div>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={fType}
                onChange={(e) => setFType(e.target.value)}
                className="h-9 rounded-xl border border-black/10 bg-white px-3 text-[13px] font-semibold outline-none"
              >
                <option value="all">All</option>
                <option value="training">Training</option>
                <option value="race">Race</option>
                <option value="easy">Easy</option>
                <option value="tempo">Tempo</option>
                <option value="intervals">Intervals</option>
                <option value="long">Long</option>
              </select>
            </div>
          </div>
        </Card>

        {filteredRuns.length === 0 ? (
          <Card className="p-5">
            <div className="text-[12px] text-black/45 tracking-[0.18em] uppercase">
              No runs yet
            </div>
            <div className="mt-2 text-[14px] text-black/60">
              Log a run to build your history and show progress over time.
            </div>
            <div className="mt-4">
              <Button onClick={openAdd}>Log your first run</Button>
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredRuns.map((r) => (
              <div
                key={r.id}
                role="button"
                tabIndex={0}
                onClick={() => openEdit(r)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") openEdit(r);
                }}
                className="cursor-pointer select-none active:scale-[0.995] transition-transform"
              >
                <Card className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[12px] text-black/45 tracking-[0.18em] uppercase">
                        {fmtDateLabel(r.run_date)}
                      </div>
                      <div className="mt-1 text-[16px] font-semibold">
                        {round1(Number(r.miles ?? 0))} mi
                        <span className="ml-2 text-[12px] font-semibold text-black/50">
                          {String(r.type ?? "training")}
                        </span>
                      </div>

                      {r.race_name ? (
                        <div className="mt-1 text-[13px] text-black/60">
                          Race: {r.race_name}
                        </div>
                      ) : null}

                      {r.notes ? (
                        <div className="mt-2 text-[13px] text-black/55 line-clamp-2">
                          {r.notes}
                        </div>
                      ) : null}
                    </div>

                    <div className="shrink-0 text-right">
                      {r.shoe_id ? (
                        <div className="text-[12px] text-black/45">
                          Shoe: {shoes.find((s) => s.id === r.shoe_id)?.name ?? "—"}
                        </div>
                      ) : (
                        <div className="text-[12px] text-black/35">No shoe</div>
                      )}
                      <div className="mt-2 text-[12px] text-black/35">Edit</div>
                    </div>
                  </div>
                </Card>
              </div>
            ))}
          </div>
        )}
      </div>

      <TabBar />

      {/* Add/Edit Modal */}
      {openModal ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center px-4 pb-6">
          <div className="absolute inset-0 bg-black/30" onClick={closeModal} />

          <div className="relative w-full max-w-[480px] rounded-[28px] bg-white shadow-[0_30px_80px_rgba(0,0,0,0.18)] border border-black/10 overflow-hidden">
            <div className="p-5">
              <div className="text-[12px] text-black/45 tracking-[0.18em] uppercase">
                {mode === "add" ? "New run" : "Edit run"}
              </div>

              <div className="mt-1 text-[16px] font-semibold tracking-[-0.01em]">
                {mode === "add" ? "Log miles" : "Update entry"}
              </div>

              <div className="mt-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-[12px] text-black/45 tracking-[0.18em] uppercase">
                      Date
                    </div>
                    <input
                      value={fDate}
                      onChange={(e) => setFDate(e.target.value)}
                      type="date"
                      className="mt-2 w-full h-11 rounded-2xl border border-black/10 bg-white px-4 text-[14px] outline-none focus:border-black/25"
                    />
                  </div>

                  <div>
                    <div className="text-[12px] text-black/45 tracking-[0.18em] uppercase">
                      Miles
                    </div>
                    <input
                      value={fMiles}
                      onChange={(e) => setFMiles(e.target.value)}
                      inputMode="decimal"
                      placeholder="3.1"
                      className="mt-2 w-full h-11 rounded-2xl border border-black/10 bg-white px-4 text-[14px] outline-none focus:border-black/25"
                    />
                  </div>
                </div>

                <div>
                  <div className="text-[12px] text-black/45 tracking-[0.18em] uppercase">
                    Type
                  </div>
                  <select
                    value={fType}
                    onChange={(e) => setFType(e.target.value)}
                    className="mt-2 w-full h-11 rounded-2xl border border-black/10 bg-white px-4 text-[14px] outline-none focus:border-black/25"
                  >
                    <option value="training">Training</option>
                    <option value="race">Race</option>
                    <option value="easy">Easy</option>
                    <option value="tempo">Tempo</option>
                    <option value="intervals">Intervals</option>
                    <option value="long">Long</option>
                  </select>
                </div>

                {String(fType) === "race" ? (
                  <div>
                    <div className="text-[12px] text-black/45 tracking-[0.18em] uppercase">
                      Race name
                    </div>
                    <input
                      value={fRaceName}
                      onChange={(e) => setFRaceName(e.target.value)}
                      placeholder="e.g., Miami Half Marathon"
                      className="mt-2 w-full h-11 rounded-2xl border border-black/10 bg-white px-4 text-[14px] outline-none focus:border-black/25"
                    />
                  </div>
                ) : null}

                <div>
                  <div className="flex items-center justify-between">
                    <div className="text-[12px] text-black/45 tracking-[0.18em] uppercase">
                      Notes
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowNotes((v) => !v)}
                      className="text-[12px] font-semibold text-black/60"
                    >
                      {showNotes ? "Hide" : "Add"}
                    </button>
                  </div>

                  {showNotes ? (
                    <textarea
                      value={fNotes}
                      onChange={(e) => setFNotes(e.target.value)}
                      placeholder="How did it feel? Pace? Route? Weather?"
                      rows={3}
                      className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-[14px] outline-none focus:border-black/25 resize-none"
                    />
                  ) : null}
                </div>

                <div>
                  <div className="text-[12px] text-black/45 tracking-[0.18em] uppercase">
                    Shoe (optional)
                  </div>
                  <select
                    value={fShoeId}
                    onChange={(e) => setFShoeId(e.target.value)}
                    className="mt-2 w-full h-11 rounded-2xl border border-black/10 bg-white px-4 text-[14px] outline-none focus:border-black/25"
                  >
                    <option value="">No shoe</option>
                    {shoes.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({round1(s.miles)} mi)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-5 flex gap-3">
                <Button variant="secondary" className="flex-1" onClick={closeModal} disabled={saving || deleting}>
                  Cancel
                </Button>

                <Button className="flex-1" onClick={onSave} disabled={saving || deleting}>
                  {saving ? "Saving..." : mode === "add" ? "Add" : "Save"}
                </Button>
              </div>

              {mode === "edit" ? (
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={onDelete}
                    disabled={saving || deleting}
                    className="w-full text-[13px] font-semibold text-red-600 py-2 rounded-2xl hover:bg-red-50 disabled:opacity-60"
                  >
                    {deleting ? "Deleting..." : "Delete run"}
                  </button>
                </div>
              ) : null}

              <div className="mt-3 text-[12px] text-black/45">
                Runs are stored locally on this device in this build.
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
