"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { GradientHeader } from "@/components/GradientHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { TabBar } from "@/components/TabBar";
import { supabaseBrowser } from "@/lib/supabase/client";
import { Store, ACTIVE_CLUB_CHANGED_EVENT } from "@/lib/mcrStore";

type Scope = "this_month" | "last_month" | "all_time";

type MemberRow = {
  user_id: string;
  is_admin: boolean;
  full_name: string;
};

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

// Unicode escapes to avoid emoji mojibake.
function medalFor(rank: number) {
  if (rank === 1) return "\u{1F947}"; // 🥇
  if (rank === 2) return "\u{1F948}"; // 🥈
  if (rank === 3) return "\u{1F949}"; // 🥉
  return null;
}

function firstNameFrom(fullName?: string | null) {
  const s = String(fullName ?? "").trim();
  if (!s) return "Runner";
  return s.split(/\s+/)[0] || "Runner";
}

export default function LeaderboardPage() {
  const router = useRouter();
  const supabase = useMemo(() => supabaseBrowser(), []);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Seed once (safe if Store is still present for other screens)
  useEffect(() => {
    if (!mounted) return;
    try {
      Store.ensureSeeded?.();
    } catch {
      // ignore
    }
  }, [mounted]);

  // Refresh on focus + active club change
  const [refreshNonce, setRefreshNonce] = useState(0);
  useEffect(() => {
    if (!mounted) return;
    const bump = () => setRefreshNonce((n) => n + 1);
    window.addEventListener("focus", bump);
    window.addEventListener(ACTIVE_CLUB_CHANGED_EVENT, bump as any);
    return () => {
      window.removeEventListener("focus", bump);
      window.removeEventListener(ACTIVE_CLUB_CHANGED_EVENT, bump as any);
    };
  }, [mounted]);

  const clubId = useMemo(() => {
    if (!mounted) return "";
    try {
      const active = typeof Store.getActiveClubId === "function" ? Store.getActiveClubId() : "";
      const current = typeof Store.getCurrentClubId === "function" ? Store.getCurrentClubId() : "";
      return String(active || current || "");
    } catch {
      return "";
    }
  }, [mounted, refreshNonce]);

  // Option A: hard-gate Leaderboard if user has no selected club
  useEffect(() => {
    if (!mounted) return;
    if (!clubId) router.replace("/home");
  }, [mounted, clubId, router]);

  const [meFullName, setMeFullName] = useState<string>("Runner");
  const [clubName, setClubName] = useState<string>("");
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [rows, setRows] = useState<{ rank: number; name: string; miles: number }[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  const [scope, setScope] = useState<Scope>("this_month");

  const monthForScope = useMemo(() => {
    const now = new Date();
    if (scope === "this_month") return monthKeyYYYYMM(now);
    if (scope === "last_month") return monthKeyYYYYMM(addMonths(now, -1));
    return null;
  }, [scope]);

  // Load: me, club, members, runs (club-scoped) and compute leaderboard.
  useEffect(() => {
    if (!mounted) return;
    if (!clubId) return;

    let alive = true;

    (async () => {
      setLoading(true);
      setError("");

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          // Not signed in => send to sign in
          router.replace(`/auth/sign-in?next=${encodeURIComponent("/leaderboard")}`);
          return;
        }

        // Me name (use profiles)
        const { data: profile, error: pErr } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", user.id)
          .maybeSingle();

        if (!alive) return;
        if (!pErr) {
          const name = String(profile?.full_name ?? "").trim();
          setMeFullName(name || "Runner");
        }

        // Club name
        const { data: clubRow, error: cErr } = await supabase
          .from("clubs")
          .select("name")
          .eq("id", clubId)
          .maybeSingle();

        if (!alive) return;
        if (!cErr) setClubName(String(clubRow?.name ?? "").trim());

        // Memberships -> user ids
        const { data: mems, error: mErr } = await supabase
          .from("memberships")
          .select("user_id,is_admin")
          .eq("club_id", clubId);

        if (!alive) return;
        if (mErr) throw mErr;

        const memRows = (mems ?? []) as { user_id: string; is_admin: boolean }[];
        const userIds = Array.from(new Set(memRows.map((m) => String(m.user_id))));

        // Profiles for those users
        const { data: profs, error: prErr } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", userIds.length ? userIds : ["00000000-0000-0000-0000-000000000000"]);

        if (!alive) return;
        if (prErr) throw prErr;

        const nameById = new Map<string, string>();
        for (const p of profs ?? []) {
          nameById.set(String((p as any).id), String((p as any).full_name ?? "").trim() || "Runner");
        }

        const memberRows: MemberRow[] = memRows.map((m) => ({
          user_id: String(m.user_id),
          is_admin: !!m.is_admin,
          full_name: nameById.get(String(m.user_id)) || "Runner",
        }));

        setMembers(memberRows);

        // Runs (club-scoped)
        const runQuery = supabase
          .from("runs")
          .select("user_id,miles,run_date")
          .eq("club_id", clubId);

        const { data: runs, error: rErr } = await runQuery;
        if (!alive) return;
        if (rErr) throw rErr;

        const month = monthForScope; // YYYY-MM or null

        const milesByUser = new Map<string, number>();
        for (const r of (runs ?? []) as any[]) {
          const uid = String(r.user_id ?? "");
          const miles = Number(r.miles ?? 0);
          const date = String(r.run_date ?? "");
          if (!uid || !date || !Number.isFinite(miles)) continue;
          if (month && !date.startsWith(month)) continue;
          milesByUser.set(uid, (milesByUser.get(uid) ?? 0) + miles);
        }

        const computed = memberRows
          .map((m) => ({
            id: m.user_id,
            name: m.full_name,
            miles: Math.round(((milesByUser.get(m.user_id) ?? 0) as number) * 10) / 10,
          }))
          .sort((a, b) => b.miles - a.miles || a.name.localeCompare(b.name))
          .map((r, idx) => ({ rank: idx + 1, name: r.name, miles: r.miles }));

        setRows(computed);
      } catch (e: any) {
        setError(e?.message ? String(e.message) : "Unable to load leaderboard.");
        setMembers([]);
        setRows([]);
      } finally {
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [mounted, clubId, scope, monthForScope, refreshNonce, supabase, router]);

  const firstName = useMemo(() => firstNameFrom(meFullName), [meFullName]);

  return (
    <div className="pb-16">
      <GradientHeader title="Leaderboard" subtitle="Miles (club only)" />

      <div className="px-5 mt-4 space-y-4">
        <Card className="p-5">
          <div className="text-[18px] font-semibold">Leaderboard</div>
          <div className="mt-1 text-[13px] text-black/55">
            {firstName}
            {clubName ? ` · ${clubName}` : ""}
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-[12px] text-black/45 tracking-[0.18em] uppercase">View</div>
              <div className="mt-1 text-[16px] font-semibold">
                {scope === "this_month" ? "This Month" : scope === "last_month" ? "Last Month" : "All Time"}
              </div>
              <div className="mt-1 text-[13px] text-black/55">Club: {clubName || "Selected"}</div>
            </div>

            <div className="text-right">
              <div className="text-[12px] text-black/45 tracking-[0.18em] uppercase">Month</div>
              <div className="mt-1 text-[13px] text-black/70">{monthForScope ?? "—"}</div>
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <Button
              variant={scope === "this_month" ? "primary" : "secondary"}
              onClick={() => setScope("this_month")}
              className="flex-1"
            >
              This Month
            </Button>
            <Button
              variant={scope === "last_month" ? "primary" : "secondary"}
              onClick={() => setScope("last_month")}
              className="flex-1"
            >
              Last Month
            </Button>
            <Button
              variant={scope === "all_time" ? "primary" : "secondary"}
              onClick={() => setScope("all_time")}
              className="flex-1"
            >
              All Time
            </Button>
          </div>

          {error ? (
            <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-[13px] text-red-700">
              {error}
            </div>
          ) : null}

          {loading ? (
            <div className="mt-4 text-[13px] text-black/55">Loading…</div>
          ) : rows.length === 0 ? (
            <div className="mt-4 text-[13px] text-black/55">No members found for this club yet.</div>
          ) : (
            <div className="mt-5 divide-y divide-black/5">
              {rows.map((r) => (
                <div key={r.rank} className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 text-center">
                      <div className="text-[12px] text-black/50">#{r.rank}</div>
                      <div className="text-[14px]">{medalFor(r.rank) ?? ""}</div>
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{r.name}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[12px] text-black/45">Miles</div>
                    <div className="font-semibold">{r.miles}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <TabBar active="leaderboard" />
    </div>
  );
}
