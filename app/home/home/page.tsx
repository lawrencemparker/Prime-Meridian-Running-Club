"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { GradientHeader } from "../../../components/GradientHeader";
import { Card } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { TabBar } from "../../../components/TabBar";

import { WeatherPill } from "../../../components/WeatherPill";
import { ShoeTrackerCard, Shoe } from "../../../components/home/ShoeTrackerCard";
import {
  AnnouncementsPreview,
  Announcement,
} from "../../../components/home/AnnouncementsPreview";

import { Store } from "../../../lib/mcrStore";

const FLASH_TOAST_KEY = "mcr_flash_toast";

function monthKeyYYYYMM(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function prettyDate(iso: string) {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

function milesFmt(n: number) {
  const v = Number.isFinite(n) ? n : 0;
  // Keep it runner-friendly: 0 decimals for whole, 1 for fractional
  return v % 1 === 0 ? String(v) : v.toFixed(1);
}

export default function HomeHomePage() {
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  const [activeClubId, setActiveClubId] = useState<string>("");
  const [activeClubName, setActiveClubName] = useState<string>("");

  const [runsThisMonth, setRunsThisMonth] = useState<
    {
      id: string;
      user_id: string;
      club_id: string;
      run_date: string;
      miles: number;
      run_type: string;
      race_name?: string;
      notes?: string;
      shoe_id?: string;
    }[]
  >([]);

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [shoes, setShoes] = useState<Shoe[]>([]);

  const [loading, setLoading] = useState(false);

  const monthKey = useMemo(() => monthKeyYYYYMM(new Date()), []);

  useEffect(() => {
    setMounted(true);

    // Read initial selected club from Store, keep in local state so UI reacts immediately
    const clubId = Store.getActiveClubId?.() ?? Store.getActiveClub?.()?.id ?? "";
    const club = Store.getActiveClub?.();

    setActiveClubId(String(clubId || ""));
    setActiveClubName(String(club?.name ?? ""));

    // react to club changes across app
    const onClubChanged = () => {
      const nextClubId =
        Store.getActiveClubId?.() ?? Store.getActiveClub?.()?.id ?? "";
      const nextClub = Store.getActiveClub?.();

      setActiveClubId(String(nextClubId || ""));
      setActiveClubName(String(nextClub?.name ?? ""));
    };

    window.addEventListener("mcr_active_club_changed", onClubChanged as any);

    return () => {
      window.removeEventListener("mcr_active_club_changed", onClubChanged as any);
    };
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!activeClubId) return;

    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        // Runs: single source of truth
        const allRuns = (Store.listRuns?.() ?? []) as any[];
        const clubRuns = allRuns
          .filter((r) => String((r as any).club_id ?? "") === String(activeClubId))
          .map((r) => ({
            id: String(r.id),
            user_id: String(r.user_id ?? ""),
            club_id: String((r as any).club_id ?? ""),
            run_date: String(r.run_date ?? ""),
            miles: Number(r.miles ?? 0),
            run_type: String(r.run_type ?? "training"),
            race_name: r.race_name ? String(r.race_name) : "",
            notes: r.notes ? String(r.notes) : "",
            shoe_id: r.shoe_id ? String(r.shoe_id) : "",
          }));

        const monthRuns = clubRuns.filter((r) => {
          const d = String(r.run_date || "");
          // supports ISO like 2026-01-21..., or YYYY-MM-DD
          return d.slice(0, 7) === monthKey;
        });

        // Announcements
        const anns = (Store.listAnnouncementsForClub?.(activeClubId) ??
          Store.listAnnouncements?.(activeClubId) ??
          []) as any[];

        // Shoes (per user)
        const sh = (Store.listShoes?.() ?? []) as any[];

        if (cancelled) return;

        setRunsThisMonth(monthRuns);
        setAnnouncements(
          anns.map((a: any) => ({
            id: String(a.id),
            club_id: String(a.club_id ?? ""),
            title: String(a.title ?? ""),
            body: String(a.body ?? ""),
            created_at: String(a.created_at ?? ""),
            updated_at: String(a.updated_at ?? ""),
            created_by: String(a.created_by ?? ""),
          }))
        );
        setShoes(
          sh.map((s: any) => ({
            id: String(s.id),
            user_id: String(s.user_id ?? ""),
            name: String(s.name ?? ""),
            brand: s.brand ? String(s.brand) : "",
            model: s.model ? String(s.model) : "",
            nickname: s.nickname ? String(s.nickname) : "",
            retired: Boolean(s.retired ?? s.is_retired ?? false),
            created_at: String(s.created_at ?? ""),
            updated_at: String(s.updated_at ?? ""),
          }))
        );

        // Optional: one-time flash toast support if present
        try {
          const raw = localStorage.getItem(FLASH_TOAST_KEY);
          if (raw) localStorage.removeItem(FLASH_TOAST_KEY);
        } catch {
          // ignore
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [mounted, activeClubId, monthKey]);

  const milesTotalThisMonth = useMemo(() => {
    return runsThisMonth.reduce((sum, r) => sum + (Number(r.miles) || 0), 0);
  }, [runsThisMonth]);

  const lastRun = useMemo(() => {
    if (!runsThisMonth.length) return null;
    const sorted = [...runsThisMonth].sort((a, b) =>
      String(b.run_date).localeCompare(String(a.run_date))
    );
    return sorted[0] ?? null;
  }, [runsThisMonth]);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <GradientHeader
        title={activeClubName ? activeClubName : "My Club Running"}
        subtitle="Home"
        rightSlot={<WeatherPill />}
      />

      <div className="mx-auto w-full max-w-md px-4 pb-24">
        {/* Quick Stats */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Card className="p-4">
            <div className="text-xs text-white/60">Miles this month</div>
            <div className="mt-1 text-2xl font-semibold">{milesFmt(milesTotalThisMonth)}</div>
            <div className="mt-1 text-xs text-white/50">{monthKey}</div>
          </Card>

          <Card className="p-4">
            <div className="text-xs text-white/60">Last run</div>
            <div className="mt-1 text-sm font-medium">
              {lastRun ? prettyDate(lastRun.run_date) : "—"}
            </div>
            <div className="mt-1 text-xs text-white/50">
              {lastRun ? `${milesFmt(lastRun.miles)} mi` : "No runs yet"}
            </div>
          </Card>
        </div>

        {/* Primary Actions */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Button onClick={() => router.push("/home/log")} disabled={loading || !activeClubId}>
            Log Run
          </Button>
          <Button
            variant="secondary"
            onClick={() => router.push("/history")}
            disabled={loading || !activeClubId}
          >
            History
          </Button>
        </div>

        {/* Shoes preview */}
        <div className="mt-4">
          <ShoeTrackerCard shoes={shoes} />
        </div>

        {/* Announcements preview */}
        <div className="mt-4">
          <AnnouncementsPreview announcements={announcements} />
        </div>

        {/* Club/admin actions */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Button variant="secondary" onClick={() => router.push("/clubs")}>
            Clubs
          </Button>
          <Button variant="secondary" onClick={() => router.push("/leaderboard")} disabled={!activeClubId}>
            Leaderboard
          </Button>
        </div>
      </div>

      <TabBar />
    </div>
  );
}
