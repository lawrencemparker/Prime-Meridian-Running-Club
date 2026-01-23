﻿// app/home/page.tsx
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

import { PostAuthProfileSync } from "@/components/auth/PostAuthProfileSync";
import { Store, ACTIVE_CLUB_CHANGED_EVENT } from "@/lib/mcrStore";
import { supabaseBrowser } from "@/lib/supabase/client";

type ClubRow = { id: string; name: string; created_by?: string | null };

async function loadClubsForDropdown() {
  const supabase = supabaseBrowser();

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr) throw userErr;
  if (!user) return [] as ClubRow[];

  // 1) Clubs via memberships (normal path)
  // NOTE: this assumes you have a foreign key from memberships.club_id -> clubs.id
  const { data: viaMemberships, error: memErr } = await supabase
    .from("memberships")
    .select("club_id, clubs:club_id ( id, name, created_by )")
    .eq("user_id", user.id);

  // If RLS blocks memberships select, we still want to try owner fallback
  const memClubs: ClubRow[] =
    (viaMemberships ?? [])
      .map((r: any) => r?.clubs)
      .filter(Boolean)
      .map((c: any) => ({
        id: String(c.id),
        name: String(c.name ?? ""),
        created_by: c.created_by ?? null,
      })) ?? [];

  // 2) Fallback: clubs where user is the owner (critical for “membership missing”)
  const { data: ownerClubs, error: ownerErr } = await supabase
    .from("clubs")
    .select("id,name,created_by")
    .eq("created_by", user.id)
    .order("created_at", { ascending: false });

  // If memberships failed but owner works, we still proceed.
  if (memErr && ownerErr) {
    // both failed, surface the memberships error first (usually more informative)
    throw memErr;
  }

  const owner: ClubRow[] =
    (ownerClubs ?? []).map((c: any) => ({
      id: String(c.id),
      name: String(c.name ?? ""),
      created_by: c.created_by ?? null,
    })) ?? [];

  // 3) Merge + dedupe (owner always included)
  const merged = [...memClubs, ...owner];
  const byId = new Map<string, ClubRow>();
  for (const c of merged) byId.set(String(c.id), c);

  return Array.from(byId.values());
}


const FLASH_TOAST_KEY = "mcr_flash_toast";

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
    return "—";
  }
}

function medalFor(rank: number) {
  if (rank === 1) return "\u{1F947}";
  if (rank === 2) return "\u{1F948}";
  if (rank === 3) return "\u{1F949}";
  return null;
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

function firstNameFrom(fullName?: string | null) {
  const s = String(fullName ?? "").trim();
  if (!s) return "Runner";
  return s.split(/\s+/)[0] || "Runner";
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

  // Seed once on mount
  useEffect(() => {
    if (!mounted) return;
    try {
      Store.ensureSeeded();
    } catch {
      // ignore
    }
  }, [mounted]);

  // Force refresh when tab refocuses / active club changes
  const [refreshNonce, setRefreshNonce] = useState(0);

  useEffect(() => {
    if (!mounted) return;

    const sync = () => setRefreshNonce((n) => n + 1);

    const onFocus = () => sync();
    const onChanged = () => sync();

    window.addEventListener("focus", onFocus);
    window.addEventListener(ACTIVE_CLUB_CHANGED_EVENT, onChanged as any);

    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener(ACTIVE_CLUB_CHANGED_EVENT, onChanged as any);
    };
  }, [mounted]);

  // Me (local store) — used for header name
  const me = useMemo(() => {
    if (!mounted) return null;
    try {
      return Store.getMe();
    } catch {
      return null;
    }
  }, [mounted, refreshNonce]);

  const firstName = useMemo(() => firstNameFrom(me?.full_name), [me?.full_name]);

  /**
   * Clubs (Supabase memberships -> clubs)
   * This fixes: "Club exists on /clubs but not in /home dropdown"
   */
  const [clubs, setClubs] = useState<any[]>([]);
  useEffect(() => {
    if (!mounted) return;

    let cancelled = false;

    async function loadClubs() {
      try {
        const supabase = supabaseBrowser();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) throw new Error("no-user");

        const { data: mems, error: memErr } = await supabase
          .from("memberships")
          .select("club_id")
          .eq("user_id", user.id);

        if (memErr) throw memErr;

        const clubIds = Array.from(new Set((mems ?? []).map((m: any) => String(m?.club_id ?? "")))).filter(Boolean);

        if (!clubIds.length) {
          if (!cancelled) setClubs([]);
          return;
        }

        const { data: clubRows, error: clubErr } = await supabase
          .from("clubs")
          .select("id,name")
          .in("id", clubIds);

        if (clubErr) throw clubErr;

        const opts = (clubRows ?? [])
          .map((c: any) => ({ id: String(c?.id ?? ""), name: String(c?.name ?? "") }))
          .filter((c: any) => c.id)
          .sort((a, b) => a.name.localeCompare(b.name));

        if (!cancelled) setClubs(opts);
      } catch {
        // Fallback to local Store data (dev/seeded)
        try {
          const local = (Store as any).listClubs?.() ?? [];
          const opts = (local ?? [])
            .map((c: any) => ({ id: String(c?.id ?? ""), name: String(c?.name ?? "") }))
            .filter((c: any) => c.id)
            .sort((a: any, b: any) => String(a.name).localeCompare(String(b.name)));

          if (!cancelled) setClubs(opts);
        } catch {
          if (!cancelled) setClubs([]);
        }
      }
    }

    void loadClubs();
    return () => {
      cancelled = true;
    };
  }, [mounted, refreshNonce]);

  // IMPORTANT: read/write ACTIVE club
  const activeClubId = useMemo(() => {
    if (!mounted) return "";
    try {
      if (typeof (Store as any).getActiveClubId === "function") return String((Store as any).getActiveClubId() || "");
      return String((Store as any).activeClubId || "");
    } catch {
      return "";
    }
  }, [mounted, refreshNonce]);

  const [selectedClubId, setSelectedClubId] = useState<string>("");

  // Keep dropdown controlled value aligned with store active club
  useEffect(() => {
    if (!mounted) return;

    if (activeClubId && clubs.some((c: any) => String(c.id) === String(activeClubId))) {
      setSelectedClubId(String(activeClubId));
      return;
    }

    if (selectedClubId && clubs.some((c: any) => String(c.id) === String(selectedClubId))) return;

    const first = clubs[0]?.id ? String(clubs[0].id) : "";
    setSelectedClubId(first);

    if (first) {
      try {
        Store.setActiveClubId(first);
      } catch {
        // ignore
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, clubs.length, activeClubId]);

  const clubName = useMemo(() => {
    if (!mounted || !selectedClubId) return null;
    try {
      if (typeof Store.getClubName === "function") return Store.getClubName(selectedClubId);
      const found = clubs.find((c) => String(c.id) === String(selectedClubId));
      return found?.name ?? null;
    } catch {
      return null;
    }
  }, [mounted, selectedClubId, clubs]);

  // Shoes
  const shoes: Shoe[] = useMemo(() => {
    if (!mounted) return [];
    try {
      return typeof Store.listShoes === "function" ? ((Store.listShoes() as any) ?? []) : [];
    } catch {
      return [];
    }
  }, [mounted, refreshNonce]);

  // Announcements preview (club-scoped)
  const announcements: Announcement[] = useMemo(() => {
    if (!mounted || !selectedClubId) return [];
    if (typeof Store.listAnnouncements !== "function") return [];

    let recsRaw: any = [];
    try {
      recsRaw = Store.listAnnouncements(selectedClubId);
    } catch {
      recsRaw = [];
    }

    const recs = Array.isArray(recsRaw) ? recsRaw : [];
    return recs.slice(0, 3).map((a: any) => ({
      id: String(a?.id ?? ""),
      title: String(a?.title ?? ""),
      created_at: prettyDate(String(a?.created_at ?? "")),
    }));
  }, [mounted, selectedClubId, refreshNonce]);

  // Members
  const members = useMemo(() => {
    if (!mounted || !selectedClubId) return [] as any[];
    if (typeof Store.listMembers !== "function") return [] as any[];
    try {
      return (Store.listMembers(selectedClubId) as any[]) ?? [];
    } catch {
      return [];
    }
  }, [mounted, selectedClubId, refreshNonce]);

  // Admin flag
  const isAdmin = useMemo(() => {
    if (!mounted || !selectedClubId) return false;
    if (typeof Store.isAdmin !== "function") return false;
    try {
      return !!Store.isAdmin(selectedClubId);
    } catch {
      return false;
    }
  }, [mounted, selectedClubId, refreshNonce]);

  // Leaderboard preview (club-scoped; this month)
  const leaders = useMemo(() => {
    if (!mounted || !selectedClubId) return [] as { rank: number; full_name: string; total_miles: number }[];

    const month = monthKeyYYYYMM();

    let runs: any[] = [];
    try {
      runs = typeof (Store as any).listRuns === "function" ? ((Store as any).listRuns() ?? []) : [];
    } catch {
      runs = [];
    }

    const filtered = runs
      .filter((r) => String(r?.club_id ?? "") === String(selectedClubId))
      .filter((r) => String(r?.run_date ?? "").startsWith(month));

    const totalsByUser = new Map<string, { full_name: string; total: number }>();

    for (const r of filtered) {
      const uid = String(r?.user_id ?? "");
      const miles = Number(r?.miles ?? 0);
      if (!uid || !Number.isFinite(miles)) continue;

      const prev = totalsByUser.get(uid);
      if (prev) prev.total += miles;
      else {
        const name =
          (typeof Store.getMemberName === "function" ? Store.getMemberName(selectedClubId, uid) : null) ??
          "Runner";
        totalsByUser.set(uid, { full_name: String(name), total: miles });
      }
    }

    const rows = Array.from(totalsByUser.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 3)
      .map((r, idx) => ({ rank: idx + 1, full_name: r.full_name, total_miles: round1(r.total) }));

    return rows;
  }, [mounted, selectedClubId, refreshNonce]);

  return (
    <div className="pb-28">
      <PostAuthProfileSync />
      <GradientHeader title={`Hello, ${firstName}`} subtitle="Let’s make progress today" />

      <div className="px-5 mt-2 space-y-3">
        {flashToast ? (
          <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-[13px] text-emerald-800">
            {flashToast}
          </div>
        ) : null}

        {/* Weather */}
        <WeatherPill />

        {/* Running Club selector */}
        <Card className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="text-[12px] text-black/45 tracking-[0.18em] uppercase">Running Club</div>
              <div className="mt-1 text-[22px] font-semibold tracking-[-0.02em]">Select your club</div>
              <p className="mt-2 text-[15px] text-black/55 leading-relaxed">
                Announcements, members, and leaderboard update based on your selection.
              </p>
            </div>

            <div className="shrink-0">
              <div className="h-14 w-14 rounded-3xl bg-white/70 border border-black/5 shadow-[0_16px_40px_rgba(15,23,42,0.10)] flex items-center justify-center">
                <span className="text-[22px]">🏁</span>
              </div>
            </div>
          </div>

          <div className="mt-5">
            <div className="text-[12px] text-black/45 tracking-[0.18em] uppercase">Club</div>

            <select
              value={selectedClubId || ""}
              onChange={(e) => {
                const v = String(e.target.value || "");
                setSelectedClubId(v);

                try {
                  Store.setActiveClubId(v || null);
                } catch {
                  // ignore
                }
              }}
              className="mt-2 w-full rounded-2xl border border-black/10 bg-white/70 px-4 py-3 text-[16px] outline-none"
            >
              <option value="">{clubs.length ? "No club selected" : "No clubs yet"}</option>
              {clubs.map((c: any) => (
                <option key={String(c.id)} value={String(c.id)}>
                  {String(c.name)}
                </option>
              ))}
            </select>

            <div className="mt-4 flex items-center justify-between text-[14px] text-black/45">
              <div>You can still browse/join clubs on the Clubs page.</div>
              <button
                className="text-black/55 hover:text-black/70 active:text-black/80 transition"
                onClick={() => router.push("/clubs")}
              >
                Open Clubs
              </button>
            </div>
          </div>
        </Card>

        {/* Shoe Mileage */}
        <ShoeTrackerCard
          shoes={shoes}
          onManageShoes={() => router.push("/shoes")}
          onAddShoes={() => router.push("/shoes")}
        />

        {/* Announcements */}
        <AnnouncementsPreview
          clubName={clubName || ""}
          clubId={selectedClubId || ""}
          isAdmin={isAdmin}
          announcements={announcements}
          onView={() => router.push("/clubs/announcements")}
        />

        {/* Members */}
        <Card className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[12px] text-black/45 tracking-[0.18em] uppercase">Members</div>
              <div className="mt-1 text-[16px] font-semibold tracking-[-0.01em]">
                {clubName ? `${clubName} Directory` : "Club Directory"}
              </div>
              <div className="mt-1 text-[13px] text-black/55">
                {selectedClubId ? `${members.length} members` : "Select a club to view members."}
              </div>
            </div>

            <Button
              variant="secondary"
              onClick={() => router.push("/clubs/members")}
              disabled={!selectedClubId}
            >
              See all
            </Button>
          </div>

          <div className="mt-4 text-[12px] text-black/45">
            Members can view the directory. Only admins can invite or remove members.
          </div>
        </Card>

        {/* Leaderboard preview / Create club */}
        {selectedClubId ? (
          <>
            <div className="mt-4">
              <Card className="p-5">
                <div className="text-[12px] text-black/45 tracking-[0.18em] uppercase">Leaderboard</div>
                <div className="mt-1 text-[16px] font-semibold tracking-[-0.01em]">Top miles this month</div>
                <p className="mt-1 text-[13px] text-black/55">Miles (club only)</p>

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

                <div className="mt-4">
                  <Button variant="secondary" onClick={() => router.push("/leaderboard")}>
                    View
                  </Button>
                </div>
              </Card>
            </div>
          </>
        ) : (
          <div className="mt-4">
            <Card className="p-5">
              <div className="text-[12px] text-black/45 tracking-[0.18em] uppercase">Clubs</div>
              <div className="mt-1 text-[16px] font-semibold tracking-[-0.01em]">Create a Running Club</div>
              <p className="mt-1 text-[13px] text-black/55">
                Create a club to invite runners, post announcements, and track miles on a monthly leaderboard.
              </p>
              <div className="mt-4">
                <Button
                  variant="secondary"
                  onClick={() => {
                    // Premium gating: route non-premium users to the Premium screen first.
                    const premiumOn =
                      (Store as any)?.isPremium?.() ??
                      (Store as any)?.isPremiumActive?.() ??
                      false;

                    if (!premiumOn) {
                      router.push("/premium?next=%2Fclubs%2Fcreate");
                      return;
                    }

                    router.push("/clubs/create");
                  }}
                >
                  Create a club
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>

      <TabBar />
    </div>
  );
}
