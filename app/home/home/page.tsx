"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { GradientHeader } from "../../components/GradientHeader";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { TabBar } from "../../components/TabBar";

import { WeatherPill } from "../../components/WeatherPill";
import { ShoeTrackerCard, Shoe } from "../../components/home/ShoeTrackerCard";
import {
  AnnouncementsPreview,
  Announcement,
} from "../../components/home/AnnouncementsPreview";

import { Store } from "../../lib/mcrStore";

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

  // Read initial selected club from Store, keep in local state so UI reacts immediately
  const [selectedClubId, setSelectedClubId] = useState<string>("");

  useEffect(() => {
    if (!mounted) return;
    const current = Store.getCurrentClubId?.() ?? "";
    setSelectedClubId(current || "");
  }, [mounted]);

  // Also refresh when tab focus returns (covers changes made on /clubs)
  useEffect(() => {
    if (!mounted) return;
    const onFocus = () => {
      const current = Store.getCurrentClubId?.() ?? "";
      setSelectedClubId(current || "");
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [mounted]);

  const me = mounted ? Store.getMe() : null;

  const clubs = useMemo(() => {
    if (!mounted) return [];
    return typeof Store.listClubs === "function" ? Store.listClubs() : [];
  }, [mounted]);

  const clubName = useMemo(() => {
    if (!mounted || !selectedClubId) return null;
    if (typeof Store.getClubName === "function") return Store.getClubName(selectedClubId);
    const found = clubs.find((c: any) => c.id === selectedClubId);
    return found?.name ?? null;
  }, [mounted, selectedClubId, clubs]);

  // Shoes
  const shoes: Shoe[] = useMemo(() => {
    if (!mounted) return [];
    return typeof Store.listShoes === "function" ? Store.listShoes() : [];
  }, [mounted]);

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
  }, [mounted, selectedClubId]);

  // Members preview (club-scoped)
  const members: Member[] = useMemo(() => {
    if (!mounted || !selectedClubId) return [];
    if (typeof Store.listMembers !== "function") return [];
    return Store.listMembers(selectedClubId);
  }, [mounted, selectedClubId]);

  // Leaderboard preview (club-scoped; aggregates this month from runs)
  const leaders: LeaderRow[] = useMemo(() => {
    if (!mounted || !selectedClubId) return [];

    const month = monthKeyYYYYMM();
    const memberList: any[] =
      typeof Store.listMembers === "function" ? (Store.listMembers(selectedClubId) as any[]) : [];

    const milesByUser = new Map<string, number>();

    if (typeof (Store as any).listRuns === "function") {
      const runs = (Store as any).listRuns() as any[];
      for (const r of runs) {
        const userId = String(r.user_id ?? "");
        const date = String(r.run_date ?? "");
        const miles = Number(r.miles ?? 0);
        if (!userId || !date || !Number.isFinite(miles)) continue;
        if (!date.startsWith(month)) continue;
        milesByUser.set(userId, (milesByUser.get(userId) ?? 0) + miles);
      }
    }

    const rows = memberList.map((m) => {
      const id = String(m.id);
      const total = Math.round(((milesByUser.get(id) ?? 0) as number) * 10) / 10;
      return { id, full_name: m.full_name, total_miles: total };
    });

    rows.sort((a, b) => b.total_miles - a.total_miles || a.full_name.localeCompare(b.full_name));
    return rows.slice(0, 3).map((r, idx) => ({
      rank: idx + 1,
      full_name: r.full_name,
      total_miles: r.total_miles,
    }));
  }, [mounted, selectedClubId]);

  function onSelectClub(nextId: string) {
    if (!mounted) return;
    setSelectedClubId(nextId);
    Store.setActiveClubId(nextId ? nextId : null);
  }

  // Miles summary (can be upgraded later)
  const monthMiles = 0.0;

  return (
    <div className="pb-28">
      <GradientHeader
        title="Good morning"
        subtitle="Let’s make progress today."
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
              <div className="text-[12px] text-black/45 tracking-[0.18em] uppercase">
                Running Club
              </div>
              <div className="mt-1 text-[16px] font-semibold tracking-[-0.01em]">
                Select your club
              </div>
              <p className="mt-1 text-[13px] text-black/55 leading-relaxed">
                Announcements, members, and leaderboard update based on your selection.
              </p>
            </div>

            <div className="shrink-0">
              <div className="h-11 w-11 rounded-2xl bg-white/70 border border-black/5 shadow-[0_10px_22px_rgba(15,23,42,0.10)] flex items-center justify-center">
                <span className="text-[18px]">🏁</span>
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
              <div className="text-[12px] text-black/45">
                You can still browse/join clubs on the Clubs page.
              </div>
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

<Card className="p-5">
  <div className="flex items-center justify-between gap-3">
    <div>
      <div className="text-[12px] text-black/45 tracking-[0.18em] uppercase">
        {clubName} Directory
      </div>
      <div className="mt-1 text-[16px] font-semibold tracking-[-0.01em]">
        Members
      </div>
      <div className="mt-1 text-[13px] text-black/55">
        Emergency-ready contact details for club members.
      </div>
    </div>
    <Button onClick={() => router.push("/clubs/members")}>See all</Button>
  </div>

  <div className="mt-4 space-y-2">
    {members.slice(0, 5).map((m) => (
      <div
        key={m.id}
        className="w-full rounded-2xl bg-white/55 border border-black/5 px-4 py-3"
      >
        <div className="font-semibold tracking-[-0.01em]">{m.full_name}</div>
        <div className="mt-1 text-[13px] text-black/60">
          {m.email ? m.email : ""}
          {m.phone ? (m.email ? " · " : "") + m.phone : ""}
        </div>
      </div>
    ))}
    {members.length === 0 ? (
      <div className="text-[13px] text-black/55">
        No members found for this club yet.
      </div>
    ) : null}
  </div>
</Card>

<Card className="p-5">
  <div className="flex items-center justify-between gap-3">
    <div>
      <div className="text-[12px] text-black/45 tracking-[0.18em] uppercase">
        {clubName} Leaderboard
      </div>
      <div className="mt-1 text-[16px] font-semibold tracking-[-0.01em]">
        This month
      </div>
      <div className="mt-1 text-[13px] text-black/55">
        Total miles logged for this club.
      </div>
    </div>
    <Button onClick={() => router.push("/leaderboard")}>See all</Button>
  </div>

  <div className="mt-4 space-y-2">
    {leaders.slice(0, 5).map((r) => (
      <div
        key={r.user_id}
        className="flex items-center justify-between rounded-2xl bg-white/55 border border-black/5 px-4 py-3"
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="shrink-0 w-7 text-center font-semibold">
            {r.rank === 1 ? "🥇" : r.rank === 2 ? "🥈" : r.rank === 3 ? "🥉" : r.rank}
          </div>
          <div className={["font-semibold truncate", r.rank === 1 ? "text-amber-600" : "text-black/90"].join(" ")}>
            {r.full_name}
          </div>
        </div>
        <div className={["font-semibold tabular-nums", r.rank === 1 ? "text-amber-600" : "text-black/90"].join(" ")}>
          {Number(r.miles).toFixed(1)}
        </div>
      </div>
    ))}
    {leaders.length === 0 ? (
      <div className="text-[13px] text-black/55">
        No miles logged for this club yet.
      </div>
    ) : null}
  </div>
</Card>
          </>
        ) : (
          <Card className="p-5">
            <div className="text-[12px] text-black/45 tracking-[0.18em] uppercase">Clubs</div>
            <div className="mt-1 text-[16px] font-semibold tracking-[-0.01em]">
              Join a running club
            </div>
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
