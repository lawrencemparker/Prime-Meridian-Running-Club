// app/home/leaderboard/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { GradientHeader } from "@/components/GradientHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { TabBar } from "@/components/TabBar";
import { Store, ACTIVE_CLUB_CHANGED_EVENT } from "@/lib/mcrStore";

function monthKeyYYYYMM(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function addMonths(d: Date, delta: number) {
  const copy = new Date(d);
  copy.setMonth(copy.getMonth() + delta);
  return copy;
}

// Use Unicode escapes to avoid encoding/emoji mojibake issues.
function medalFor(rank: number) {
  if (rank === 1) return "\u{1F947}"; // 🥇
  if (rank === 2) return "\u{1F948}"; // 🥈
  if (rank === 3) return "\u{1F949}"; // 🥉
  return null;
}

/**
 * Leaderboard reset storage (club-scoped, month-scoped).
 * We do NOT delete runs. We simply ignore runs earlier than resetAt within the selected month.
 */
const K_LB_RESETS = "mcr_leaderboard_resets_v1";

type Scope = "this_month" | "last_month" | "all_time";

type ResetMap = {
  [clubId: string]: {
    [monthYYYYMM: string]: string; // ISO timestamp
  };
};

type Row = {
  rank: number;
  id: string;
  full_name: string;
  total_miles: number;
};

function readResets(): ResetMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(K_LB_RESETS);
    if (!raw) return {};
    return JSON.parse(raw) as ResetMap;
  } catch {
    return {};
  }
}

function writeResets(next: ResetMap) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(K_LB_RESETS, JSON.stringify(next));
  } catch {
    // ignore
  }
}

export default function LeaderboardPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted) return;
    Store.ensureSeeded();
  }, [mounted]);

  // Refresh on focus (reflect club selection changes from Home/Clubs)
  const [refreshNonce, setRefreshNonce] = useState(0);

  useEffect(() => {
    if (!mounted) return;
    const onFocus = () => setRefreshNonce((n) => n + 1);
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [mounted]);

  useEffect(() => {
    if (!mounted) return;
    const onClub = () => setRefreshNonce((n) => n + 1);
    window.addEventListener(ACTIVE_CLUB_CHANGED_EVENT, onClub as any);
    return () => window.removeEventListener(ACTIVE_CLUB_CHANGED_EVENT, onClub as any);
  }, [mounted]);

  const me = useMemo(() => (mounted ? Store.getMe() : null), [mounted, refreshNonce]);
  const userName = useMemo(() => (me?.full_name ? String(me.full_name) : "Runner"), [me]);

  const clubId = useMemo(() => {
    if (!mounted) return null;
    return Store.getCurrentClubId() ?? null;
  }, [mounted, refreshNonce]);

  const clubName = useMemo(() => {
    if (!mounted || !clubId) return null;
    return Store.getClubName(clubId);
  }, [mounted, clubId, refreshNonce]);

  const isAdmin = useMemo(() => {
    if (!mounted || !clubId) return false;
    return Store.isClubAdmin(clubId);
  }, [mounted, clubId, refreshNonce]);

  const [scope, setScope] = useState<Scope>("this_month");

  // Shoe filter (optional)
  const [shoeFilterId, setShoeFilterId] = useState<string>(""); // "" = all shoes

  const activeShoes = useMemo(() => {
    if (!mounted) return [] as { id: string; name: string }[];
    const list = Store.listShoes() as any[];
    return list
      .filter((s) => s && s.active === true)
      .map((s) => ({ id: String(s.id), name: String(s.name ?? "Shoe") }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [mounted, refreshNonce]);

  const scopeLabel = useMemo(() => {
    if (scope === "this_month") return "This Month";
    if (scope === "last_month") return "Last Month";
    return "All Time";
  }, [scope]);

  const monthForScope = useMemo(() => {
    const now = new Date();
    if (scope === "this_month") return monthKeyYYYYMM(now);
    if (scope === "last_month") return monthKeyYYYYMM(addMonths(now, -1));
    return null;
  }, [scope]);

  const resetAtISO = useMemo(() => {
    if (!mounted || !clubId) return null;
    if (scope !== "this_month") return null;
    const month = monthForScope;
    if (!month) return null;
    const map = readResets();
    return map?.[clubId]?.[month] ?? null;
  }, [mounted, clubId, scope, monthForScope, refreshNonce]);

  function doResetThisMonth() {
    if (!mounted || !clubId) return;
    const month = monthForScope;
    if (!month) return;

    const map = readResets();
    const clubMap = map[clubId] ?? {};
    clubMap[month] = new Date().toISOString();
    map[clubId] = clubMap;
    writeResets(map);

    setRefreshNonce((n) => n + 1);
  }

  const rows = useMemo<Row[]>(() => {
    if (!mounted || !clubId) return [];

    const members: any[] = Store.listMembers(clubId) as any[];
    const memberIds = new Set<string>(members.map((m) => String(m.id)));

    const milesByUser = new Map<string, number>();
    const month = monthForScope; // YYYY-MM or null (all time)
    const resetAt = resetAtISO ? Date.parse(resetAtISO) : null;

    const runs = (Store as any).listRuns ? ((Store as any).listRuns() as any[]) : [];

    for (const r of runs) {
      const userId = String(r.user_id ?? "");
      const runClubId = r.club_id ? String(r.club_id) : "";
      const date = String(r.run_date ?? "");
      const miles = Number(r.miles ?? 0);
      const shoeId = r.shoe_id ? String(r.shoe_id) : "";

      if (!userId || !date || !Number.isFinite(miles)) continue;
      if (!memberIds.has(userId)) continue;
      if (String(runClubId) !== String(clubId)) continue;

      if (month && !date.startsWith(month)) continue;

      if (resetAt != null && month && scope === "this_month") {
        const runTs = Date.parse(`${date}T00:00:00`);
        if (Number.isFinite(runTs) && runTs < resetAt) continue;
      }

      if (shoeFilterId && shoeId !== shoeFilterId) continue;

      milesByUser.set(userId, (milesByUser.get(userId) ?? 0) + miles);
    }

    const base = members.map((m) => {
      const id = String(m.id);
      const total = Math.round((Number(milesByUser.get(id) ?? 0) as number) * 10) / 10;
      return { id, full_name: String(m.full_name ?? "Member"), total_miles: total };
    });

    base.sort((a, b) => b.total_miles - a.total_miles || a.full_name.localeCompare(b.full_name));

    return base.map((r, idx) => ({
      rank: idx + 1,
      id: r.id,
      full_name: r.full_name,
      total_miles: r.total_miles,
    }));
  }, [mounted, clubId, monthForScope, resetAtISO, scope, shoeFilterId, refreshNonce]);

  const myRow = useMemo(() => {
    if (!me) return null;
    const id = String(me.id);
    return rows.find((r) => String(r.id) === id) ?? null;
  }, [rows, me]);

  return (
    <div className="pb-28">
      <GradientHeader
        title="Leaderboard"
        subtitle="Miles (club only)"
        clubName={clubName ?? undefined}
        userName={userName}
      />

      <div className="px-5 space-y-4">
        <Card className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[12px] text-black/45 tracking-[0.18em] uppercase">View</div>
              <div className="mt-1 font-semibold">{scopeLabel}</div>
              <div className="mt-1 text-[12px] text-black/55">
                Club: <span className="font-medium text-black/70">{clubName ?? "None selected"}</span>
              </div>
            </div>

            {clubId && scope !== "all_time" ? (
              <div className="text-[12px] text-black/55 text-right">
                <div className="text-[12px] text-black/45 tracking-[0.18em] uppercase">Month</div>
                <div className="mt-1 font-semibold">{monthForScope}</div>
              </div>
            ) : null}
          </div>

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => setScope("this_month")}
              className={[
                "flex-1 rounded-2xl border px-4 py-3 text-[14px] font-semibold transition",
                scope === "this_month"
                  ? "border-black/10 bg-black/5 text-black"
                  : "border-black/10 bg-white/70 text-black/70 hover:bg-white",
              ].join(" ")}
            >
              This Month
            </button>

            <button
              type="button"
              onClick={() => setScope("last_month")}
              className={[
                "flex-1 rounded-2xl border px-4 py-3 text-[14px] font-semibold transition",
                scope === "last_month"
                  ? "border-black/10 bg-black/5 text-black"
                  : "border-black/10 bg-white/70 text-black/70 hover:bg-white",
              ].join(" ")}
            >
              Last Month
            </button>

            <button
              type="button"
              onClick={() => setScope("all_time")}
              className={[
                "flex-1 rounded-2xl border px-4 py-3 text-[14px] font-semibold transition",
                scope === "all_time"
                  ? "border-black/10 bg-black/5 text-black"
                  : "border-black/10 bg-white/70 text-black/70 hover:bg-white",
              ].join(" ")}
            >
              All Time
            </button>
          </div>

          {clubId ? (
            <div className="mt-4">
              <div className="text-[12px] text-black/45 tracking-[0.18em] uppercase">Shoe filter (optional)</div>
              <select
                className="mt-2 w-full rounded-2xl border border-black/10 bg-white/70 px-4 py-3 text-[15px] outline-none"
                value={shoeFilterId}
                onChange={(e) => setShoeFilterId(e.target.value)}
              >
                <option value="">All Shoes</option>
                {activeShoes.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <div className="mt-2 text-[12px] text-black/45">Filters miles to runs logged with that shoe.</div>
            </div>
          ) : null}

          {clubId && isAdmin && scope === "this_month" ? (
            <div className="mt-4 rounded-2xl border border-black/10 bg-white/55 px-4 py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[12px] text-black/45 tracking-[0.18em] uppercase">Monthly reset</div>
                  <div className="mt-1 text-[13px] text-black/60">
                    Resets this month's leaderboard totals going forward. This does not delete runs.
                  </div>
                  {resetAtISO ? (
                    <div className="mt-2 text-[12px] text-black/45">
                      Reset applied:{" "}
                      <span className="font-medium text-black/60">{new Date(resetAtISO).toLocaleString()}</span>
                    </div>
                  ) : null}
                </div>

                <div className="shrink-0">
                  <Button onClick={doResetThisMonth}>Reset</Button>
                </div>
              </div>
            </div>
          ) : null}

          {clubId && myRow ? (
            <div className="mt-4 rounded-2xl border border-black/10 bg-black/5 px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[12px] text-black/45 tracking-[0.18em] uppercase">Your rank</div>
                  <div className="mt-1 font-semibold">
                    #{myRow.rank} {"\u00B7"} {myRow.total_miles.toFixed(1)} miles
                  </div>
                </div>
                <div className="text-[12px] text-black/55">You</div>
              </div>
            </div>
          ) : null}

          <div className="mt-4 space-y-2">
            {!clubId ? (
              <div className="text-[13px] text-black/55">Select a club on the Home page to see the leaderboard.</div>
            ) : rows.length === 0 ? (
              <div className="text-[13px] text-black/55">No members found for this club yet.</div>
            ) : (
              rows.map((r) => {
                const medal = medalFor(r.rank);
                const first = r.rank === 1;
                const isMe = me ? String(r.id) === String(me.id) : false;

                const nameCls = first ? "text-amber-600" : "text-black/90";
                const milesCls = first ? "text-amber-600" : "text-black/90";

                const badgeCls = first ? "bg-amber-500/15 text-amber-700" : "bg-black/5 text-black/80";

                const rowCls = [
                  "flex items-center justify-between rounded-2xl border px-4 py-3",
                  isMe ? "bg-black/5 border-black/10" : "bg-white/55 border-black/5",
                ].join(" ");

                return (
                  <div key={`${r.rank}-${r.id}`} className={rowCls}>
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={[
                          "h-8 w-8 rounded-full flex items-center justify-center font-semibold shrink-0",
                          badgeCls,
                        ].join(" ")}
                      >
                        {medal ? <span className="text-[14px]">{medal}</span> : r.rank}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={["font-semibold truncate", nameCls].join(" ")}>{r.full_name}</div>
                          {isMe ? (
                            <span className="shrink-0 rounded-full bg-black/10 px-2 py-[2px] text-[11px] font-semibold text-black/70">
                              You
                            </span>
                          ) : null}
                        </div>
                        <div className="text-[12px] text-black/55">Member</div>
                      </div>
                    </div>

                    <div className={["font-semibold tabular-nums", milesCls].join(" ")}>
                      {r.total_miles.toFixed(1)}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>
      </div>

      <TabBar />
    </div>
  );
}
