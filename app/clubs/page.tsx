"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { GradientHeader } from "@/components/GradientHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { TabBar } from "@/components/TabBar";
import { Store, type Club, type ClubMembership } from "@/lib/mcrStore";

type ConfirmState =
  | null
  | {
      mode: "delete" | "leave";
      clubId: string;
      clubName: string;
    };

export default function ClubsPage() {
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [toast, setToast] = useState("");
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

  const [isPremium, setIsPremium] = useState(false);

  useEffect(() => {
    if (!mounted) return;
    Store.ensureSeeded?.();
    setIsPremium(Store.isPremium());
  }, [mounted]);

  const me = mounted ? Store.getMe() : null;

  const userName = useMemo(() => {
    if (!mounted) return "Runner";
    return Store.getMe()?.full_name ?? "Runner";
  }, [mounted]);

  const clubs: Club[] = useMemo(() => {
    if (!mounted) return [];
    return Store.listClubs();
  }, [mounted, refreshNonce]);

  const memberships: ClubMembership[] = useMemo(() => {
    if (!mounted) return [];
    return Store.listMemberships();
  }, [mounted, refreshNonce]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 2200);
  }

  function myRole(clubId: string): "admin" | "runner" | null {
    if (!me) return null;
    const m = memberships.find((x) => x.club_id === clubId && x.id === me.id);
    if (!m) return null;
    return m.is_admin ? "admin" : "runner";
  }

  function isMemberApproved(clubId: string) {
    return myRole(clubId) != null;
  }

  function isAdmin(clubId: string) {
    return myRole(clubId) === "admin";
  }

  function selectClub(clubId: string) {
    Store.setActiveClubId(clubId);
    showToast("Club selected");
    setRefreshNonce((n) => n + 1);
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

    try {
      if (confirm.mode === "delete") {
        Store.deleteClub(confirm.clubId);
        showToast("Club deleted");
      } else {
        Store.leaveClub(confirm.clubId);
        showToast("Left club");
      }

      setConfirm(null);
      setRefreshNonce((n) => n + 1);
    } catch (e: any) {
      showToast(e?.message ? String(e.message) : "Action failed.");
    } finally {
      setConfirmBusy(false);
    }
  }

  function onCreate() {
    if (!mounted) return;
    if (!isPremium) {
      showToast("Premium required to create a club");
      return;
    }
    router.push("/clubs/create");
  }

  return (
    <div className="pb-28">
      <GradientHeader
        title="Clubs"
        subtitle="Find and manage your running clubs."
        userName={userName}
      />

      <div className="px-5 mt-2 space-y-4">
        {toast ? (
          <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-[13px] text-emerald-800">
            {toast}
          </div>
        ) : null}

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[12px] text-black/45 tracking-[0.18em] uppercase">
                Clubs
              </div>
              <div className="mt-1 text-[16px] font-semibold">Your directory</div>
              <div className="mt-1 text-[13px] text-black/55">
                Select a club to set it as your active club.
              </div>
            </div>

            <Button onClick={onCreate} disabled={!isPremium}>
              Create
            </Button>
          </div>
        </Card>

        <div className="space-y-3">
          {clubs.map((c) => {
            const approved = isMemberApproved(c.id);
            const admin = isAdmin(c.id);

            return (
              <Card key={c.id} className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[16px] font-semibold">{c.name}</div>
                    <div className="mt-2 text-[12px] text-black/45">
                      Role: {myRole(c.id) ?? "—"}
                    </div>
                  </div>

                  <div className="w-[120px] flex flex-col items-end">
                    <Button variant="secondary" onClick={() => selectClub(c.id)}>
                      {approved ? "Select" : "View"}
                    </Button>

                    <div className="mt-2 w-full flex justify-end">
                      {admin ? (
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
      </div>

      {/* Confirmation modal – positioned higher */}
      {confirm && (
        <div className="fixed inset-0 z-50">
          <button
            onClick={closeConfirm}
            className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
          />

          <div className="absolute inset-x-0 top-[96px]">
            <div className="mx-auto max-w-[560px] px-4">
              <Card className="p-6 rounded-[28px] shadow-[0_30px_90px_rgba(15,23,42,0.25)]">
                <div className="flex justify-between gap-3">
                  <div>
                    <div className="text-[12px] text-black/45 tracking-[0.18em] uppercase">
                      {confirm.mode === "delete" ? "Delete club" : "Leave club"}
                    </div>
                    <div className="mt-1 text-[18px] font-semibold">
                      {confirm.clubName}
                    </div>
                    <p className="mt-2 text-[13px] text-black/55">
                      {confirm.mode === "delete"
                        ? "This will permanently remove the club, its members, and its announcements from this device."
                        : "You will be removed from this club. This action does not notify administrators."}
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
