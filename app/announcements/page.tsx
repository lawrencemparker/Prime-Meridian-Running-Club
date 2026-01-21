"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { GradientHeader } from "@/components/GradientHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { TabBar } from "@/components/TabBar";
import { Store } from "@/lib/mcrStore";

function fmtRelative(iso: string) {
  try {
    const d = new Date(iso);
    const diff = Date.now() - d.getTime();
    const mins = Math.round(diff / 60000);
    if (mins < 2) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.round(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.round(hrs / 24);
    return `${days}d ago`;
  } catch {
    return "";
  }
}

export default function AnnouncementsPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const me = mounted ? Store.getMe() : null;

  const activeClubId = mounted ? (Store.getActiveClubId?.() ?? null) : null;
  const approvedClubId = mounted ? (Store.getMyApprovedClubId?.() ?? null) : null;
  const clubId = activeClubId ?? approvedClubId;

  const clubName = useMemo(() => {
    if (!mounted || !clubId) return null;
    if (typeof Store.getClubName === "function") return Store.getClubName(clubId);
    const clubs = typeof Store.listClubs === "function" ? Store.listClubs() : [];
    return clubs.find((c: any) => c.id === clubId)?.name ?? null;
  }, [mounted, clubId]);

  const isAdmin = mounted && clubId ? Store.isClubAdmin?.(clubId) : false;

  const items = useMemo(() => {
    if (!mounted || !clubId || typeof Store.listAnnouncements !== "function") return [];
    return Store.listAnnouncements(clubId);
  }, [mounted, clubId]);

  return (
    <div className="pb-28">
      <GradientHeader
        title="Announcements"
        subtitle={clubName ? "Updates from your club." : "Join a club to see announcements."}
        userName={me?.full_name ?? ""}
        clubName={clubName}
        rightSlot={
          clubId && isAdmin ? (
            <Button
              variant="secondary"
              className="!px-4 !py-2 !text-[13px]"
              onClick={() => router.push("/announcements/new")}
            >
              New
            </Button>
          ) : null
        }
      />

      <div className="px-5 space-y-4 mt-2">
        {!clubId ? (
          <Card className="p-5">
            <div className="text-[12px] text-black/45 tracking-[0.18em] uppercase">Clubs</div>
            <div className="mt-1 text-[16px] font-semibold tracking-[-0.01em]">
              Join a running club
            </div>
            <p className="mt-1 text-[13px] text-black/55">
              Announcements are available once youâ€™re in a club.
            </p>
            <div className="mt-4">
              <Button variant="secondary" onClick={() => router.push("/clubs")}>
                Browse clubs
              </Button>
            </div>
          </Card>
        ) : items.length === 0 ? (
          <Card className="p-6 text-center">
            <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-black/5 flex items-center justify-center">
              <span className="text-[22px]">ðŸ“£</span>
            </div>
            <div className="text-[16px] font-semibold">No announcements yet</div>
            <p className="mt-1 text-[13px] text-black/55">
              {isAdmin
                ? "Post your first update to keep everyone aligned."
                : "Check back soon â€” your admin will post updates here."}
            </p>

            {isAdmin ? (
              <div className="mt-4">
                <Button onClick={() => router.push("/announcements/new")}>
                  Post an announcement
                </Button>
              </div>
            ) : null}
          </Card>
        ) : (
          <div className="space-y-3">
            {items.map((a: any) => (
              <button
                key={a.id}
                className="w-full text-left"
                onClick={() => router.push(`/announcements/${a.id}`)}
              >
                <Card className="p-5">
                  <div className="text-[12px] text-black/45 tracking-[0.18em] uppercase">
                    {fmtRelative(a.created_at)}
                  </div>
                  <div className="mt-1 text-[16px] font-semibold tracking-[-0.01em]">
                    {a.title}
                  </div>
                  <div className="mt-2 text-[13px] text-black/60 line-clamp-2">
                    {a.body}
                  </div>
                </Card>
              </button>
            ))}
          </div>
        )}
      </div>

      <TabBar />
    </div>
  );
}
