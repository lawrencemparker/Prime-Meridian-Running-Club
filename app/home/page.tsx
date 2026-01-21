"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { GradientHeader } from "@/components/GradientHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { TabBar } from "@/components/TabBar";

import { WeatherPill } from "@/components/WeatherPill";
import { ShoeTrackerCard, Shoe } from "@/components/home/ShoeTrackerCard";
import { AnnouncementsPreview, Announcement } from "@/components/home/AnnouncementsPreview";

import { Store } from "@/lib/mcrStore";

const FLASH_TOAST_KEY = "mcr_flash_toast";
const ACTIVE_CLUB_CHANGED_EVENT = "mcr_active_club_changed";

function monthKeyYYYYMM(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function prettyDate(iso: string) {
  try {
    const dt = new Date(iso);
    return dt.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return "â€”";
  }
}

function medalFor(rank: number) {
  if (rank === 1) return "ðŸ¥‡";
  if (rank === 2) return "ðŸ¥ˆ";
  if (rank === 3) return "ðŸ¥‰";
  return null;
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

export default function HomePage() {
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Flash toast (read once, then clear)
  const [flashToast, setFlashToast] = useState<string>("");
  useEffect(() => {
    if (!mounted) return;
    try {
      const msg = window.localStorage.getItem(FLASH_TOAST_KEY) || "";
      if (msg) {
        setFlashToast(msg);
        window.localStorage.removeItem(FLASH_TOAST_KEY);
        setTimeout(() => setFlashToast(""), 2600);
      }
    } catch {
      // ignore
    }
  }, [mounted]);

  // Seed once on mount (SSR-safe)
  useEffect(() => {
    if (!mounted) return;
    Store.ensureSeeded?.();
  }, [mounted]);

  // Selected club (local state, but persisted in Store)
  const [selectedClubId, setSelectedClubId] = useState<string>("");

  // A nonce to force recompute when user returns to tab / club changes / runs change indirectly
  const [refreshNonce, setRefreshNonce] = useState(0);

  useEffect(() => {
    if (!mounted) return;
    const current = Store.getCurrentClubId?.() ?? "";
    setSelectedClubId(current || "");
  }, [mounted]);

  // Refresh on focus + on explicit active club change event
  useEffect(() => {
    if (!mounted) return;

    const sync = () => {
      const current = Store.getCurrentClubId?.() ?? "";
      setSelectedClubId(current || "");
      setRefreshNonce((n) => n + 1);
    };

    const onFocus = () => sync();
    const onChanged = () => sync();

    window.addEventListener("focus", onFocus);
    window.addEventListener(ACTIVE_CLUB_CHANGED_EVENT, onChanged as any);

    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener(ACTIVE_CLUB_CHANGED_EVENT, onChanged as any);
    };
  }, [mounted]);

  const me = useMemo(() => (mounted ? Store.getMe() : null), [mounted, refreshNonce]);

  const clubs = useMemo(() => {
    if (!mounted) return [] as any[];
    return typeof Store.listClubs === "function" ? (Store.listClubs() as any[]) : [];
  }, [mounted, refreshNonce]);

  const clubName = useMemo(() => {
    if (!mounted || !selectedClubId) return null;
    if (typeof Store.getClubName === "function") return Store.getClubName(selectedClubId);
    const found = clubs.find((c) => String(c.id) === String(selectedClubId));
    return found?.name ?? null;
  }, [mounted, selectedClubId, clubs]);

  // Shoes (for current user)
  const shoes: Shoe[] = useMemo(() => {
    if (!mounted) return [];
    return typeof Store.listShoes === "function" ? ((Store.listShoes() as any) ?? []) : [];
  }, [mounted, refreshNonce]);

  // Announcements preview (club-scoped)
  const announcements: Announcement[] = useMemo(() => {
    if (!mounted || !selectedClubId) return [];
    if (typeof Store.listAnnouncements !== "function") return [];
    const recs = Store.listAnnouncements(selectedClubId) as any[];
    return recs.slice(0, 3).map((a) => ({
      id: a.id,
      title: a.title,
      created_at: prettyDate(a.created_at),
    }));
  }, [mounted, selectedClubId, refreshNonce]);

  // Members (club-scoped)
  const members = useMemo(() => {
    if (!mounted || !selectedClubId) return [] as any[];
    if (typeof Store.listMembers !== "function") return [] as any[];
    return (Store.listMembers(selectedClubId) as any[]) ?? [];
  }, [mounted, selectedClubId, refreshNonce]);

  // Leaderboard preview (club-scoped; aggregates this month from runs)
  const leaders = useMemo(() => {
    if (!mounted || !selectedClubId)
      return [] as { rank: number; full_name: string; total_miles: number }[];

    const month = monthKeyYYYYMM();
    const memberList: any[] =
      typeof Store.listMembers === "function" ? ((Store.listMembers(selectedClubId) as any[]) ?? []) : [];

    const milesByUser = new Map<string, number>();

    if (typeof (Store as any).listRuns === "function") {
      const runs = (Store as any).listRuns() as any[];
      for (const r of runs) {
        const userId = String(r.user_id ?? "");
        const date = String(r.run_date ?? "");
        const miles = Number(r.miles ?? 0);
        const runClubId = String(r.club_id ?? "");

        if (!userId || !date || !Number.isFinite(miles)) continue;
        if (runClubId !== String(selectedClubId)) continue;
        if (!date.startsWith(month)) continue;

        milesByUser.set(userId, (milesByUser.get(userId) ?? 0) + miles);
      }
    }

    const rows = memberList.map((m) => {
      const id = String(m.id);
      const total = round1(milesByUser.get(id) ?? 0);
      return { id, full_name: String(m.full_name ?? "Member"), total_miles: total };
    });

    rows.sort((a, b) => b.total_miles - a.total_miles || a.full_name.localeCompare(b.full_name));

    return rows.slice(0, 3).map((r, idx) => ({
      rank: idx + 1,
      full_name: r.full_name,
      total_miles: r.total_miles,
    }));
  }, [mounted, selectedClubId, refreshNonce]);

  function onSelectClub(nextId: string) {
    if (!mounted) return;
    setSelectedClubId(nextId);
    Store.setActiveClubId(nextId ? nextId : null);
    // ensure any derived metrics update immediately
    setRefreshNonce((n) => n + 1);
  }

  // âœ… Month summary: GRAND TOTAL across ALL clubs for current runner (this month)
  const monthMiles = useMemo(() => {
    if (!mounted || !me) return 0.0;
    const month = monthKeyYYYYMM();

    if (typeof (Store as any).listRuns !== "function") return 0.0;

    const runs = (Store as any).listRuns() as any[];
    let total = 0;

    for (const r of runs) {
      const userId = String(r.user_id ?? "");
      const date = String(r.run_date ?? "");
      const miles = Number(r.miles ?? 0);

      if (!userId || !date || !Number.isFinite(miles)) continue;
      if (userId !== String(me.id)) continue;
      if (!date.startsWith(month)) continue;

      total += miles;
    }

    return round1(total);
  }, [mounted, me, refreshNonce]);

  const isAdmin = useMemo(() => {
    if (!mounted || !selectedClubId) return false;
    return typeof Store.isClubAdmin === "function" ? Store.isClubAdmin(selectedClubId) : false;
  }, [mounted, selectedClubId, refreshNonce]);

  return (
    <div className="pb-28">
      <GradientHeader
        title="Good morning"
        subtitle="Letâ€™s make progress today."
        userName={me?.full_name ?? ""}
        clubName={clubName ?? undefined}
      />

      <div className="px-5 space-y-5 mt-2">
        {flashToast ? (
          <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-[13px] text-emerald-800">
            {flashToast}
          </div>
        ) : null}

        <WeatherPill />

        {/* Month summary */}
        <Card className="p-5">
          <div className="text-[12px] text-black/45 tracking-[0.18em] uppercase">This month</div>
          <div className="mt-2 text-[30px] font-semibold tracking-[-0.02em]">
            {monthMiles.toFixed(1)} miles
          </div>
          <div className="mt-4">
            <Button onClick={() => router.push("/log")}>Log a Run</Button>
          </div>
        </Card>

        {/* Shoe mileage */}
        <ShoeTrackerCard
          shoes={shoes}
          onAddShoes={() => router.push("/shoes/new")}
          onManageShoes={() => router.push("/shoes")}
        />

        {/* Running Club dropdown */}
        <Card className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[12px] text-black/45 tracking-[0.18em] uppercase">Running Club</div>
              <div className="mt-1 text-[16px] font-semibold tracking-[-0.01em]">Select your club</div>
              <p className="mt-1 text-[13px] text-black/55 leading-relaxed">
                Announcements, members, and leaderboard update based on your selection.
              </p>
            </div>

            <div className="shrink-0">
              <div className="h-11 w-11 rounded-2xl bg-white/70 border border-black/5 shadow-[0_10px_22px_rgba(15,23,42,0.10)] flex items-center justify-center">
                <span className="text-[18px]">ðŸ</span>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <label className="text-[12px] text-black/45 tracking-[0.14em] uppercase">Club</label>
            <select
              value={selectedClubId}
              onChange={(e) => onSelectClub(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-black/10 bg-white/70 px-4 py-3 text-[15px] outline-none"
            >
              <option value="">No club selected</option>
              {clubs.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <div className="mt-3 flex items-center justify-between">
              <div className="text-[12px] text-black/45">You can still browse/join clubs on the Clubs page.</div>
              <button
                onClick={() => router.push("/clubs")}
                className="text-[12px] text-black/55 no-underline hover:text-black/70"
              >
                Open Clubs
              </button>
            </div>
          </div>
        </Card>

        {/* Club modules */}
        {selectedClubId && clubName ? (
          <>
            <AnnouncementsPreview clubName={clubName} items={announcements} />

            {/* Members card */}
            <Card className="p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[12px] text-black/45 tracking-[0.18em] uppercase">Members</div>
                  <div className="mt-1 text-[16px] font-semibold tracking-[-0.01em] truncate">
                    {clubName} Directory
                  </div>
                  <div className="mt-1 text-[13px] text-black/55">
                    {members.length} {members.length === 1 ? "member" : "members"}
                  </div>
                </div>

                <div className="shrink-0">
                  <Button variant="secondary" onClick={() => router.push("/clubs/members")}>
                    See all
                  </Button>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                {members.slice(0, 3).map((m: any) => (
                  <div
                    key={String(m.id)}
                    className="flex items-center justify-between rounded-2xl border border-black/5 bg-white/55 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{m.full_name}</div>
                      <div className="mt-1 text-[12px] text-black/55 truncate">
                        {(m.phone ? String(m.phone) : "") || (m.email ? String(m.email) : "") || ""}
                      </div>
                    </div>
                    {isAdmin ? <div className="text-[12px] text-black/45">Admin</div> : null}
                  </div>
                ))}
                {members.length === 0 ? <div className="text-[13px] text-black/55">No members yet.</div> : null}
              </div>

              <div className="mt-4 text-[12px] text-black/45">
                Members can view the directory. Only admins can invite or remove members.
              </div>
            </Card>

            {/* Leaderboard card */}
            <Card className="p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[12px] text-black/45 tracking-[0.18em] uppercase">Leaderboard</div>
                  <div className="mt-1 text-[16px] font-semibold tracking-[-0.01em] truncate">
                    {clubName} Leaderboard
                  </div>
                  <div className="mt-1 text-[13px] text-black/55">This month</div>
                </div>

                <div className="shrink-0">
                  <Button variant="secondary" onClick={() => router.push("/leaderboard")}>
                    See all
                  </Button>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                {leaders.length === 0 ? (
                  <div className="text-[13px] text-black/55">No miles logged for this club yet.</div>
                ) : (
                  leaders.map((r) => {
                    const first = r.rank === 1;
                    const medal = medalFor(r.rank);
                    const textCls = first ? "text-amber-600" : "text-black/90";

                    return (
                      <div
                        key={`${r.rank}-${r.full_name}`}
                        className="flex items-center justify-between rounded-2xl border border-black/5 bg-white/55 px-4 py-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={[
                              "h-8 w-8 rounded-full flex items-center justify-center font-semibold shrink-0",
                              first ? "bg-amber-500/15 text-amber-700" : "bg-black/5 text-black/80",
                            ].join(" ")}
                          >
                            {medal ? <span className="text-[14px]">{medal}</span> : r.rank}
                          </div>
                          <div className="min-w-0">
                            <div className={["font-semibold truncate", textCls].join(" ")}>{r.full_name}</div>
                          </div>
                        </div>

                        <div className={["font-semibold tabular-nums", textCls].join(" ")}>
                          {r.total_miles.toFixed(1)}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </Card>
          </>
        ) : (
          <Card className="p-5">
            <div className="text-[12px] text-black/45 tracking-[0.18em] uppercase">Clubs</div>
            <div className="mt-1 text-[16px] font-semibold tracking-[-0.01em]">Join a running club</div>
            <p className="mt-1 text-[13px] text-black/55">
              Clubs unlock team leaderboards, announcements, and a member directory.
            </p>
            <div className="mt-4">
              <Button variant="secondary" onClick={() => router.push("/clubs")}>
                Browse clubs
              </Button>
            </div>
          </Card>
        )}
      </div>

      <TabBar />
    </div>
  );
}
