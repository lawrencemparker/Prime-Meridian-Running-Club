// app/home/page.tsx
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
import { supabaseBrowser } from "@/lib/supabase/client";
import { Store, ACTIVE_CLUB_CHANGED_EVENT } from "@/lib/mcrStore";

type ClubRow = { id: string; name: string; created_by: string; created_at: string };
type MembershipRow = { club_id: string; user_id: string; is_admin: boolean; created_at: string };


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
  const supabase = useMemo(() => supabaseBrowser(), []);

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

  // Recompute on focus / active club change / after profile sync
  const [refreshNonce, setRefreshNonce] = useState(0);

  useEffect(() => {
    if (!mounted) return;

    const bump = () => setRefreshNonce((n) => n + 1);

    const onFocus = () => bump();
    const onChanged = () => bump();

    window.addEventListener("focus", onFocus);
    window.addEventListener(ACTIVE_CLUB_CHANGED_EVENT, onChanged as any);

    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener(ACTIVE_CLUB_CHANGED_EVENT, onChanged as any);
    };
  }, [mounted]);

  // Sync Store.me from Supabase profiles on refresh so header name matches Profile
  useEffect(() => {
    if (!mounted) return;

    (async () => {
      try {
        const { data: userData } = await supabase.auth.getUser();
        const user = userData?.user;
        if (!user) return;

        const { data: profile } = await supabase
          .from("profiles")
          .select("id, full_name, phone")
          .eq("id", user.id)
          .maybeSingle();

        const full_name =
          String(profile?.full_name ?? user.user_metadata?.full_name ?? user.user_metadata?.name ?? "").trim() ||
          "Runner";

        const phone = profile?.phone != null ? String(profile.phone).trim() : "";

        Store.updateMe({
          id: user.id,
          full_name,
          email: user.email ?? undefined,
          phone: phone || undefined,
        });

        setRefreshNonce((n) => n + 1);
      } catch {
        // ignore
      }
    })();
  }, [mounted, supabase]);

  const me = useMemo(() => {
    if (!mounted) return null;
    try {
      return Store.getMe();
    } catch {
      return null;
    }
  }, [mounted, refreshNonce]);

  const firstName = useMemo(() => firstNameFrom(me?.full_name), [me?.full_name]);

  const [clubs, setClubs] = useState<ClubRow[]>([]);

useEffect(() => {
  if (!mounted) return;

  (async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setClubs([]);
        return;
      }

      // memberships for this user
      const { data: mems, error: memErr } = await supabase
        .from("memberships")
        .select("club_id,user_id,is_admin,created_at")
        .eq("user_id", user.id);

      if (memErr) {
        // If RLS blocks memberships, you’ll see empty clubs here.
        setClubs([]);
        return;
      }

      const memRows = (mems ?? []) as MembershipRow[];
      const memberClubIds = Array.from(new Set(memRows.map((m) => m.club_id)));

      const results: ClubRow[] = [];

      // clubs by membership
      if (memberClubIds.length > 0) {
        const { data: clubsByMembership, error: c1Err } = await supabase
          .from("clubs")
          .select("id,name,created_by,created_at")
          .in("id", memberClubIds);

        if (!c1Err) results.push(...((clubsByMembership ?? []) as ClubRow[]));
      }

      // clubs by ownership
      const { data: clubsByOwner, error: c2Err } = await supabase
        .from("clubs")
        .select("id,name,created_by,created_at")
        .eq("created_by", user.id);

      if (!c2Err) results.push(...((clubsByOwner ?? []) as ClubRow[]));

      // de-dupe + sort
      const dedup = Array.from(new Map(results.map((c) => [c.id, c])).values()).sort((a, b) =>
        a.name.localeCompare(b.name)
      );

      setClubs(dedup);
    } catch {
      setClubs([]);
    }
  })();
}, [mounted, supabase, refreshNonce]);


  const [selectedClubId, setSelectedClubId] = useState<string>("");

  useEffect(() => {
    if (!mounted) return;

    let current: string = "";
    try {
      current = String((Store.getActiveClubId?.() ?? Store.getCurrentClubId?.() ?? "") || "");
    } catch {
      current = "";
    }

    if (current && clubs.some((c: any) => String(c.id) === current)) {
      setSelectedClubId(current);
      return;
    }

    if (!current && clubs.length > 0) {
      const first = String(clubs[0].id);
      setSelectedClubId(first);
      try {
        Store.setActiveClubId(first);
      } catch {
        // ignore
      }
      return;
    }

    setSelectedClubId("");
  }, [mounted, clubs]);

  const clubName = useMemo(() => {
  if (!mounted || !selectedClubId) return null;
  const found = clubs.find((c) => String(c.id) === String(selectedClubId));
  return found?.name ?? null;
}, [mounted, selectedClubId, clubs]);


  const shoes: Shoe[] = useMemo(() => {
    if (!mounted) return [];
    try {
      return typeof Store.listShoes === "function" ? ((Store.listShoes() as any) ?? []) : [];
    } catch {
      return [];
    }
  }, [mounted, refreshNonce]);

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

  const members = useMemo(() => {
    if (!mounted || !selectedClubId) return [] as any[];
    if (typeof Store.listMembers !== "function") return [] as any[];
    try {
      return (Store.listMembers(selectedClubId) as any[]) ?? [];
    } catch {
      return [];
    }
  }, [mounted, selectedClubId, refreshNonce]);

  const isAdmin = useMemo(() => {
    if (!mounted || !selectedClubId) return false;
    if (typeof Store.isAdmin !== "function") return false;
    try {
      return !!Store.isAdmin(selectedClubId);
    } catch {
      return false;
    }
  }, [mounted, selectedClubId, refreshNonce]);

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
          (typeof Store.getUserName === "function" ? Store.getUserName(uid) : null) ??
          "Runner";

        totalsByUser.set(uid, { full_name: String(name), total: miles });
      }
    }

    return Array.from(totalsByUser.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 5)
      .map((x, idx) => ({ rank: idx + 1, full_name: x.full_name, total_miles: round1(x.total) }));
  }, [mounted, selectedClubId, refreshNonce]);

  function onSelectClub(nextId: string) {
    setSelectedClubId(nextId);
    try {
      Store.setActiveClubId(nextId || null);
    } catch {
      // ignore
    }
    setRefreshNonce((n) => n + 1);
  }

  return (
    <div className="pb-28">
      <GradientHeader title={`Hello, ${firstName}`} subtitle="Let’s make progress today" />
      <PostAuthProfileSync />

      <div className="px-5 mt-2">
        {flashToast ? (
          <div className="mb-3 rounded-2xl border border-black/10 bg-white/70 px-4 py-3 text-[13px] text-black/70">
            {flashToast}
          </div>
        ) : null}

        {/* Weather — full width to match other cards */}
        <Card className="w-full p-4">
          <div className="flex justify-center">
            <WeatherPill />
          </div>
        </Card>

        {/* Select Your Club — styled to match other cards */}
        <Card className="mt-4 p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[12px] text-black/45 tracking-[0.18em] uppercase">Running Club</div>

              <div className="mt-1 text-[18px] font-semibold tracking-[-0.01em]">Select your club</div>

              <div className="mt-1 text-[13px] text-black/55">
                Announcements, members, and leaderboard update based on your selection.
              </div>
            </div>

            <div className="shrink-0">
              <div className="h-12 w-12 rounded-2xl bg-white/70 border border-black/5 shadow-sm flex items-center justify-center text-[20px]">
                {"\u{1F3C1}"}
              </div>
            </div>
          </div>

          <div className="mt-4">
            <div className="text-[12px] text-black/45 tracking-[0.18em] uppercase">Club</div>

            <div className="relative mt-2">
              <select
                value={selectedClubId}
                onChange={(e) => onSelectClub(e.target.value)}
                className={[
                  "w-full h-11 rounded-2xl",
                  "border border-black/10 bg-white/70",
                  "px-4 pr-12",
                  "text-[14px] text-black/80",
                  "outline-none appearance-none",
                ].join(" ")}
              >
                <option value="">No club selected</option>
                {clubs.map((c: any) => (
                  <option key={String(c.id)} value={String(c.id)}>
                    {String(c.name)}
                  </option>
                ))}
              </select>

              <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-black/55">
                <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M7 10l5 5 5-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>

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

        {/* Shoe Mileage */}
        <div className="mt-4">
          <ShoeTrackerCard
            shoes={shoes}
            onManageShoes={() => router.push("/shoes")}
            onAddShoes={() => router.push("/shoes/new")}
          />
        </div>

        {/* Club modules */}
        {selectedClubId && clubName ? (
          <>
            <div className="mt-4">
              <AnnouncementsPreview clubName={clubName} items={announcements ?? []} />
            </div>

            <div className="mt-4">
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
              </Card>
            </div>

            <div className="mt-4">
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
                <Button variant="secondary" onClick={() => router.push("/clubs/create")}>
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
