"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";

export type AnnouncementDraft = {
  title: string;
  body: string;
};

export function AnnouncementComposerModal({
  open,
  mode,
  initial,
  onClose,
  onSubmit,
  onDelete,
}: {
  open: boolean;
  mode: "create" | "edit";
  initial?: { title: string; body: string } | null;
  onClose: () => void;
  onSubmit: (draft: AnnouncementDraft) => void;
  onDelete?: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setTitle(initial?.title ?? "");
    setBody(initial?.body ?? "");
    setErr(null);
  }, [open, initial]);

  const canSubmit = useMemo(() => {
    return title.trim().length >= 3 && body.trim().length >= 5;
  }, [title, body]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80]">
      <div
        className="absolute inset-0 bg-black/35"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="absolute inset-x-0 bottom-0 pb-6 px-5">
        <Card className="p-5 max-w-[520px] mx-auto">
          <div className="text-[12px] text-black/45 tracking-[0.18em] uppercase">
            {mode === "create" ? "New announcement" : "Edit announcement"}
          </div>

          <div className="mt-1 text-[18px] font-semibold tracking-[-0.02em]">
            {mode === "create" ? "Post an update" : "Update your post"}
          </div>

          <div className="mt-4 space-y-3">
            <div>
              <div className="text-[12px] text-black/45 tracking-[0.18em] uppercase">
                Title
              </div>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Saturday long run at 8:00 AM"
                className="mt-2 w-full rounded-2xl border border-black/10 bg-white/70 px-4 py-3 text-[14px] outline-none focus:border-black/20"
              />
            </div>

            <div>
              <div className="text-[12px] text-black/45 tracking-[0.18em] uppercase">
                Details
              </div>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Meet at the fountain. Route is 9–11 miles. Bring water."
                className="mt-2 w-full min-h-[120px] resize-none rounded-2xl border border-black/10 bg-white/70 px-4 py-3 text-[14px] outline-none focus:border-black/20"
              />
            </div>

            {err ? (
              <div className="rounded-2xl bg-red-500/10 px-4 py-3 text-[13px] text-red-700">
                {err}
              </div>
            ) : null}

            <div className="pt-2 flex items-center gap-3">
              <Button variant="secondary" onClick={onClose}>
                Cancel
              </Button>

              {mode === "edit" && onDelete ? (
                <Button
                  variant="secondary"
                  onClick={onDelete}
                  className="ml-auto"
                >
                  Delete
                </Button>
              ) : (
                <div className="ml-auto" />
              )}

              <Button
                onClick={() => {
                  setErr(null);
                  if (!canSubmit) {
                    setErr("Add a short title and details to post.");
                    return;
                  }
                  onSubmit({ title: title.trim(), body: body.trim() });
                }}
                disabled={!canSubmit}
              >
                {mode === "create" ? "Post" : "Save"}
              </Button>
            </div>

            <div className="pt-2 text-center text-[12px] text-black/40 leading-relaxed">
              Only club admins can post. Members can view announcements.
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
