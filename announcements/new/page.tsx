"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Store } from "../../../lib/mcrStore";

const TOAST_KEY = "mcr_flash_toast";

export default function NewAnnouncementPage() {
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!mounted) return;
    Store.ensureSeeded?.();
  }, [mounted]);

  const clubId = useMemo(() => {
    if (!mounted) return null;
    return Store.getActiveClubId?.() ?? Store.getCurrentClubId?.() ?? null;
  }, [mounted]);

  const isAdmin = useMemo(() => {
    if (!mounted || !clubId) return false;
    return typeof Store.isClubAdmin === "function" ? Store.isClubAdmin(clubId) : false;
  }, [mounted, clubId]);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const titleClean = String(title ?? "").trim();
  const bodyClean = String(body ?? "").trim();

  const canPost = Boolean(clubId) && isAdmin && titleClean.length > 0 && bodyClean.length > 0;

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>("");

  function close() {
    router.back();
  }

  async function post() {
    setError("");

    if (!clubId) {
      setError("Please select a club first.");
      return;
    }
    if (!isAdmin) {
      setError("Only admins can post announcements.");
      return;
    }
    if (!titleClean || !bodyClean) {
      setError("Please enter both a title and a message.");
      return;
    }
    if (saving) return;

    setSaving(true);
    try {
      const a = Store.addAnnouncement({
        club_id: clubId,
        title: titleClean,
        body: bodyClean,
        audience: "club",
      });

      if (typeof window !== "undefined") {
        window.localStorage.setItem(TOAST_KEY, `Announcement posted: ${a.title}`);
      }

      router.replace("/announcements");
    } catch (e: any) {
      setSaving(false);
      setError(e?.message ? String(e.message) : "Unable to post announcement.");
    }
  }

  return (
    <div className="fixed inset-0 z-50">
      <button
        aria-label="Close"
        onClick={close}
        className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
      />

      <div className="absolute inset-x-0 top-[96px] md:top-[140px]">
        <div className="mx-auto max-w-[560px] px-4">
          <Card className="p-5 rounded-[28px] shadow-[0_30px_90px_rgba(15,23,42,0.25)]">
            <div className="min-w-0">
              <div className="text-[12px] text-black/45 tracking-[0.18em] uppercase">
                New announcement
              </div>
              <div className="mt-1 text-[18px] font-semibold tracking-[-0.01em]">
                Post an update
              </div>
              <p className="mt-1 text-[13px] text-black/55 leading-relaxed">
                Members can read announcements â€” only admins can post.
              </p>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <label className="text-[12px] text-black/45 tracking-[0.14em] uppercase">
                  Title
                </label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-black/10 bg-white/70 px-4 py-3 text-[15px] outline-none"
                  placeholder="e.g., Practice at 5am"
                />
              </div>

              <div>
                <label className="text-[12px] text-black/45 tracking-[0.14em] uppercase">
                  Message
                </label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={5}
                  className="mt-2 w-full resize-none rounded-2xl border border-black/10 bg-white/70 px-4 py-3 text-[15px] outline-none"
                  placeholder="Write your update..."
                />
              </div>

              {error ? (
                <div className="rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-[13px] text-red-700">
                  {error}
                </div>
              ) : null}
            </div>

            <div className="mt-6 flex gap-2">
              <Button variant="secondary" onClick={close}>
                Cancel
              </Button>
              <Button onClick={post} disabled={!canPost || saving}>
                {saving ? "Posting..." : "Post"}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
