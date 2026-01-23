"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { supabaseBrowser } from "@/lib/supabase/client";
import { Store } from "@/lib/mcrStore";
import { GradientHeader } from "@/components/GradientHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { TabBar } from "@/components/TabBar";

type ClubRow = {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
};

type MembershipRow = {
  club_id: string;
  user_id: string;
  is_admin: boolean;
  created_at: string;
};

type ConfirmState =
  | null
  | {
      mode: "delete" | "leave";
      clubId: string;
      clubName: string;
    };

const ACTIVE_CLUB_KEY = "mcr_active_club_v1";

function setActiveClubId(clubId: string | null) {
  try {
    window.localStorage.setItem(ACTIVE_CLUB_KEY, JSON.stringify(clubId));
  } catch {
    // ignore
  }
}

export default function ClubsPage() {
  const router = useRouter();
  const supabase = useMemo(() => supabaseBrowser(), []);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState(true);
  const [err, setErr] = useState("");

  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

  const [userId, setUserId] = useState("");
  const [userName, setUserName] = useState("Runner");

  const [clubs, setClubs] = useState<ClubRow[]>([]);
  const [memberships, setMemberships] = useState<MembershipRow[]>([]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 2200);
  }

  function roleForClub(clubId: string): "owner" | "admin" | "runner" | null {
    const club = clubs.find((c) => c.id === clubId);
    if (club && club.created_by === userId) return "owner";

    const m = memberships.find((x) => x.club_id === clubId && x.user_id === userId);
    if (!m) return null;
    return m.is_admin ? "admin" : "runner";
  }

  function isMemberApproved(clubId: string) {
    return roleForClub(clubId) != null;
  }

  function canDeleteClub(clubId: string) {
    return roleForClub(clubId) === "owner";
  }

  async function load() {
    setErr("");
    setBusy(true);

    try {
      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();

      if (userErr) {
        setErr(userErr.message);
        return;
      }
      if (!user) {
        router.replace(`/auth/sign-in?next=${encodeURIComponent("/clubs")}`);
        return;
      }

      setUserId(user.id);

      // Prefer metadata full_name, fallback to email/local label
      const meta: any = user.user_metadata ?? {};
      const metaFullName = String(meta.full_name ?? meta.name ?? "").trim();
      setUserName(metaFullName || user.email || "Runner");

      // 1) memberships for this user
      const { data: mems, error: memErr } = await supabase
        .from("memberships")
        .select("club_id,user_id,is_admin,created_at")
        .eq("user_id", user.id);

      if (memErr) {
        setErr(memErr.message);
        return;
      }

      const memRows = (mems ?? []) as MembershipRow[];
      setMemberships(memRows);

      // 2) clubs: fetch clubs where I'm a member OR I created it
      const memberClubIds = Array.from(new Set(memRows.map((m) => m.club_id)));

      const results: ClubRow[] = [];

      if (memberClubIds.length > 0) {
        const { data: clubsByMembership, error: c1Err } = await supabase
          .from("clubs")
          .select("id,name,created_by,created_at")
          .in("id", memberClubIds);

        if (c1Err) {
          setErr(c1Err.message);
          return;
        }

        results.push(...((clubsByMembership ?? []) as ClubRow[]));
      }

      const { data: clubsByOwner, error: c2Err } = await supabase
        .from("clubs")
        .select("id,name,created_by,created_at")
        .eq("created_by", user.id);

      if (c2Err) {
        setErr(c2Err.message);
        return;
      }

      results.push(...((clubsByOwner ?? []) as ClubRow[]));

      // de-dupe
      const dedup = Array.from(new Map(results.map((c) => [c.id, c])).values())
        .sort((a, b) => a.name.localeCompare(b.name));

      setClubs(dedup);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!mounted) return;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  function selectClub(clubId: string) {
    setActiveClubId(clubId);
    showToast("Club selected");
    router.push("/home");
  }

  function openDeleteConfirm(clubId: string, clubName: string) {
    setConfirm({ mode: "delete", clubId, clubName });
  }

  function openLeaveConfirm(clubId: string, clubName: string) {
    setConfirm({ mode: "leave", clubId, clubName });
  }

  function closeConfirm() {
    if (confirmBusy) return;
    setConfirm(null);
  }

  async function confirmAction() {
    if (!confirm) return;
    setConfirmBusy(true);
    setErr("");

    try {
      if (confirm.mode === "delete") {
        // Allowed by RLS only for created_by = auth.uid()
        const { error: delErr } = await supabase.from("clubs").delete().eq("id", confirm.clubId);
        if (delErr) throw delErr;
        showToast("Club deleted");
      } else {
        // Leave club
        const { error: leaveErr } = await supabase
          .from("memberships")
          .delete()
          .eq("club_id", confirm.clubId)
          .eq("user_id", userId);

        if (leaveErr) throw leaveErr;
        showToast("Left club");
      }

      setConfirm(null);
      await load();
    } catch (e: any) {
      showToast(e?.message ? String(e.message) : "Action failed.");
    } finally {
      setConfirmBusy(false);
    }
  }

  function onCreate() {
    // Premium gating for test users: show Premium page until enabled.
    const premiumOn =
      (Store as any)?.isPremium?.() ??
      (Store as any)?.isPremiumActive?.() ??
      false;

    if (!premiumOn) {
      showToast("Premium required to create a club");
      router.push("/premium?next=%2Fclubs%2Fcreate");
      return;
    }

    router.push("/clubs/create");
  }

  return (
    <div className="pb-28">
      <GradientHeader title="Clubs" subtitle="Find and manage your running clubs." userName={userName} />

      <div className="px-5 mt-2 space-y-4">
        {toast ? (
          <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-[13px] text-emerald-800">
            {toast}
          </div>
        ) : null}

        {err ? (
          <div className="rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-[13px] text-red-800">
            {err}
          </div>
        ) : null}

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[12px] text-black/45 tracking-[0.18em] uppercase">Clubs</div>
              <div className="mt-1 text-[16px] font-semibold">Your directory</div>
              <div className="mt-1 text-[13px] text-black/55">
                Select a club to set it as your active club.
              </div>
            </div>

            <Button onClick={onCreate} disabled={busy}>
              Create
            </Button>
          </div>
        </Card>

        {busy ? (
          <Card className="p-5">
            <div className="text-[13px] text-black/55">Loading clubs...</div>
          </Card>
        ) : clubs.length === 0 ? (
          <Card className="p-5">
            <div className="text-[16px] font-semibold">No clubs yet.</div>
            <div className="mt-1 text-[13px] text-black/55">Create a club to get started.</div>
          </Card>
        ) : (
          <div className="space-y-3">
            {clubs.map((c) => {
              const approved = isMemberApproved(c.id);
              const role = roleForClub(c.id);

              return (
                <Card key={c.id} className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[16px] font-semibold">{c.name}</div>
                      <div className="mt-2 text-[12px] text-black/45">Role: {role ?? "—"}</div>
                    </div>

                    <div className="w-[120px] flex flex-col items-end">
                      <Button variant="secondary" onClick={() => selectClub(c.id)}>
                        {approved ? "Select" : "View"}
                      </Button>

                      <div className="mt-2 w-full flex justify-end">
                        {canDeleteClub(c.id) ? (
                          <button
                            onClick={() => openDeleteConfirm(c.id, c.name)}
                            className="text-[12px] text-red-600 hover:text-red-700"
                          >
                            Delete club
                          </button>
                        ) : approved ? (
                          <button
                            onClick={() => openLeaveConfirm(c.id, c.name)}
                            className="text-[12px] text-black/55 hover:text-black/70"
                          >
                            Leave club
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {confirm && (
        <div className="fixed inset-0 z-50">
          <button onClick={closeConfirm} className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" />

          <div className="absolute inset-x-0 top-[96px]">
            <div className="mx-auto max-w-[560px] px-4">
              <Card className="p-6 rounded-[28px] shadow-[0_30px_90px_rgba(15,23,42,0.25)]">
                <div className="flex justify-between gap-3">
                  <div>
                    <div className="text-[12px] text-black/45 tracking-[0.18em] uppercase">
                      {confirm.mode === "delete" ? "Delete club" : "Leave club"}
                    </div>
                    <div className="mt-1 text-[18px] font-semibold">{confirm.clubName}</div>
                    <p className="mt-2 text-[13px] text-black/55">
                      {confirm.mode === "delete"
                        ? "This will permanently remove the club and related data."
                        : "You will be removed from this club."}
                    </p>
                  </div>

                  <button
                    onClick={closeConfirm}
                    className="h-10 w-10 rounded-2xl bg-black/5 flex items-center justify-center"
                    aria-label="Close"
                  >
                    ×
                  </button>
                </div>

                <div className="mt-6 flex gap-3">
                  <Button variant="secondary" onClick={closeConfirm}>
                    Cancel
                  </Button>
                  <Button onClick={confirmAction} disabled={confirmBusy}>
                    {confirm.mode === "delete" ? "Delete club" : "Leave club"}
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        </div>
      )}

      <TabBar />
    </div>
  );
}
