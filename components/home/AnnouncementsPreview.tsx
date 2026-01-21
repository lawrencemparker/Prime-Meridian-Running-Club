"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";

export type Announcement = {
  id: string;
  title: string;
  created_at: string;
};

function formatLabel(created_at: string) {
  if (!created_at) return "";
  if (created_at.toLowerCase().includes("today")) return "Today";
  if (created_at.toLowerCase().includes("day")) return created_at.toUpperCase();
  return created_at.toUpperCase();
}

export function AnnouncementsPreview({
  clubName,
  items,
}: {
  clubName: string;
  items: Announcement[];
}) {
  const top = useMemo(() => items.slice(0, 2), [items]);

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[12px] text-black/45 tracking-[0.18em] uppercase">
            Announcements
          </div>
          <div className="mt-1 text-[16px] font-semibold tracking-[-0.01em] truncate">
            {clubName}
          </div>
        </div>

        <Link href="/announcements" className="shrink-0">
          <Button
            variant="secondary"
            className="h-9 px-4 rounded-full text-[13px] font-semibold"
          >
            View
          </Button>
        </Link>
      </div>

      <div className="mt-4 space-y-3">
        {top.length === 0 ? (
          <div className="rounded-2xl border border-black/10 bg-white/60 px-4 py-4">
            <div className="text-[12px] text-black/45 tracking-[0.18em] uppercase">
              No announcements yet
            </div>
            <div className="mt-1 text-[13px] text-black/55">
              Admins can post updates like meeting times, workouts, and schedule changes.
            </div>
          </div>
        ) : (
          top.map((a) => (
            <div
              key={a.id}
              className="rounded-2xl border border-black/10 bg-white/60 px-4 py-4"
            >
              <div className="text-[12px] text-black/40 tracking-[0.18em] uppercase">
                {formatLabel(a.created_at)}
              </div>
              <div className="mt-1 text-[14px] font-semibold text-black/85">
                {a.title}
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
