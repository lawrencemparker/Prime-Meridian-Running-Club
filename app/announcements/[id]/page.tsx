"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { GradientHeader } from "@/components/GradientHeader";
import { Store } from "../../../lib/mcrStore";

function prettyDate(iso: string) {
  try {
    const dt = new Date(iso);
    return dt.toLocaleString();
  } catch {
    return "â€”";
  }
}

export default function AnnouncementDetailPage() {
  const router = useRouter();
  const params = useParams() as { id?: string };

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!mounted) return;
    Store.ensureSeeded?.();
  }, [mounted]);

  const id = String(params?.id ?? "");

 const announcement = useMemo(() => {
  if (!mounted || !id) return null;
  return Store.getAnnouncementById(id);
}, [mounted, id]);


const userName = useMemo(() => {
  if (!mounted) return "Runner";
  return Store.getMe()?.full_name ?? "Runner";
}, [mounted]);


  const clubName = useMemo(() => {
    if (!mounted || !announcement) return null;
    return Store.getClubName?.(announcement.club_id) ?? null;
  }, [mounted, announcement]);

  return (
    <div className="pb-24">
      <GradientHeader
        title="Announcement"
        subtitle={clubName ? `Club: ${clubName}` : "Club update"}
        clubName={clubName ?? undefined}
      />

      <div className="px-5 mt-4">
        {!announcement ? (
          <Card className="p-5">
            <div className="text-[16px] font-semibold">Not found</div>
            <div className="mt-2 text-[13px] text-black/55">
              This announcement may have been removed.
            </div>
            <div className="mt-4">
              <Button variant="secondary" onClick={() => router.back()}>
                Back
              </Button>
            </div>
          </Card>
        ) : (
          <Card className="p-5">
            <div className="text-[12px] text-black/45 tracking-[0.18em] uppercase">
              {prettyDate(announcement.created_at)}
            </div>
            <div className="mt-2 text-[20px] font-semibold tracking-[-0.01em]">
              {announcement.title}
            </div>
            <div className="mt-3 text-[14px] text-black/70 whitespace-pre-wrap leading-relaxed">
              {announcement.body}
            </div>

            <div className="mt-6">
              <Button variant="secondary" onClick={() => router.back()}>
                Back
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
