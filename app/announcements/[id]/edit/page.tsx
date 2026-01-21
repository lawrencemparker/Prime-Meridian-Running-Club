"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { Card } from "../../../../components/ui/Card";
import { Button } from "../../../../components/ui/Button";
import { Store } from "../../../../lib/mcrStore";

export default function EditAnnouncementPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();

  const [mounted, setMounted] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => setMounted(true), []);

  const rec = useMemo(() => {
    if (!mounted) return null;
    return Store.getAnnouncement?.(params.id) ?? null;
  }, [mounted, params.id]);

  const isAdmin = useMemo(() => {
    if (!mounted || !rec) return false;
    return Store.isClubAdmin?.(rec.club_id) ?? false;
  }, [mounted, rec]);

  useEffect(() => {
    if (!mounted) return;
    if (!rec) {
      router.replace("/announcements");
      return;
    }
    if (!isAdmin) {
      router.replace(`/announcements/${params.id}`);
      return;
    }
    setTitle(rec.title);
    setBody(rec.body);
  }, [mounted, rec, isAdmin, router, params.id]);

  async function onSave() {
    setErr(null);
    try {
      setSaving(true);
      Store.updateAnnouncement(params.id, { title, body });
      router.replace(`/announcements/${params.id}`);
    } catch (e: any) {
      setErr(String(e?.message ?? "Unable to save."));
    } finally {
      setSaving(false);
    }
  }

  if (!mounted) return null;

  return (
    <main className="min-h-[100dvh] flex items-center justify-center px-6">
      <Card className="w-full max-w-sm p-6">
        <div className="text-[12px] text-black/45 tracking-[0.18em] uppercase">
          Edit announcement
        </div>
        <div className="mt-1 text-[18px] font-semibold tracking-[-0.01em]">
          Update your post
        </div>

        {err ? (
          <div className="mt-3 rounded-xl bg-red-500/10 px-3 py-2 text-[13px] text-red-700">
            {err}
          </div>
        ) : null}

        <div className="mt-5 space-y-3">
          <div>
            <div className="text-[12px] text-black/45 tracking-[0.18em] uppercase">
              Title
            </div>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-black/10 bg-white/70 px-4 py-3 text-[14px] outline-none focus:border-black/20"
            />
          </div>

          <div>
            <div className="text-[12px] text-black/45 tracking-[0.18em] uppercase">
              Message
            </div>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={6}
              className="mt-2 w-full resize-none rounded-2xl border border-black/10 bg-white/70 px-4 py-3 text-[14px] outline-none focus:border-black/20"
            />
          </div>

          <div className="pt-1 flex gap-3">
            <Button
              variant="secondary"
              className="w-1/2"
              onClick={() => router.replace(`/announcements/${params.id}`)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button className="w-1/2" onClick={onSave} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      </Card>
    </main>
  );
}
