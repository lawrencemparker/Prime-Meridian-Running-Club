// app/clubs/announcements/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { TabBar } from "@/components/TabBar";
import { GradientHeader } from "@/components/GradientHeader";
import { Store, Announcement } from "../../../lib/mcrStore";

function prettyDate(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

type ModalMode = "create" | "edit";

export default function ClubAnnouncementsPage() {
  const router = useRouter();

  const [mounted, setMounted] = useState(false);

  // List state (forces UI refresh)
  const [items, setItems] = useState<Announcement[]>([]);

  // Modal (create/edit)
  const [openModal, setOpenModal] = useState(false);
  const [mode, setMode] = useState<ModalMode>("create");
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form fields
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  // Busy flags
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Inline banner
  const [banner, setBanner] = useState<string | null>(null);
  const bannerTimerRef = useRef<number | null>(null);

  const clubId = useMemo(() => {
    return Store.getActiveClubId() ?? Store.getMyApprovedClubId();
  }, []);

  const clubName = useMemo(() => {
    if (!clubId) return null;
    return Store.getClubName(clubId);
  }, [clubId]);

  const isAdmin = useMemo(() => {
    if (!clubId) return false;
    return Store.isClubAdmin(clubId);
  }, [clubId]);

  useEffect(() => {
    setMounted(true);
    return () => {
      if (bannerTimerRef.current) window.clearTimeout(bannerTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!clubId) router.replace("/clubs");
  }, [mounted, clubId, router]);

  function refresh() {
    if (!clubId) return;
    setItems(Store.listAnnouncements(clubId));
  }

  useEffect(() => {
    if (!mounted) return;
    if (!clubId) return;
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, clubId]);

  function showBanner(message: string) {
    setBanner(message);
    if (bannerTimerRef.current) window.clearTimeout(bannerTimerRef.current);
    bannerTimerRef.current = window.setTimeout(() => setBanner(null), 2400);
  }

  function resetModalState() {
    setTitle("");
    setBody("");
    setSaving(false);
    setDeleting(false);
    setEditingId(null);
    setMode("create");
  }

  function openCreate() {
    setMode("create");
    setEditingId(null);
    setTitle("");
    setBody("");
    setSaving(false);
    setDeleting(false);
    setOpenModal(true);
  }

  function openEdit(a: Announcement) {
    // hard guard: only admins can edit
    if (!isAdmin) return;

    setMode("edit");
    setEditingId(a.id);
    setTitle(a.title ?? "");
    setBody(a.body ?? "");
    setSaving(false);
    setDeleting(false);
    setOpenModal(true);
  }

  function closeModal() {
    setOpenModal(false);
    resetModalState();
  }

  async function onPostOrSave() {
    if (!clubId) return;

    const t = title.trim();
    const b = body.trim();
    if (!t) return alert("Please enter a title.");
    if (!b) return alert("Please enter details.");

    setSaving(true);
    try {
      if (mode === "create") {
        Store.createAnnouncement({ club_id: clubId, title: t, body: b });
        refresh();
        closeModal();
        showBanner("Announcement posted");
        return;
      }

      if (!editingId) {
        setSaving(false);
        alert("Missing announcement id.");
        return;
      }

      Store.updateAnnouncementById(editingId, { title: t, body: b });

      refresh();
      closeModal();
      showBanner("Changes saved");
    } catch (e: any) {
      setSaving(false);
      alert(e?.message ?? "Could not save announcement");
    }
  }

  async function onDelete() {
    if (!editingId) return;
    const ok = window.confirm("Delete this announcement? This cannot be undone.");
    if (!ok) return;

    setDeleting(true);
    try {
      Store.deleteAnnouncement(editingId);
      refresh();
      closeModal();
      showBanner("Announcement deleted");
    } catch (e: any) {
      setDeleting(false);
      alert(e?.message ?? "Could not delete announcement");
    }
  }

  if (!mounted) return null;

  return (
    <div className="pb-28">
      <GradientHeader
        title="Announcements"
        subtitle={clubName ?? ""}
        rightSlot={
          isAdmin ? (
            <Button
              className="h-9 px-4 rounded-full text-[13px] font-semibold"
              onClick={openCreate}
            >
              New
            </Button>
          ) : null
        }
      />

      <div className="px-5 space-y-4 mt-2">
        {banner ? (
          <Card className="px-4 py-3 border border-emerald-200 bg-emerald-50">
            <div className="text-[13px] text-emerald-900 font-semibold">{banner}</div>
          </Card>
        ) : null}

        {items.length === 0 ? (
          <Card className="p-5">
            <div className="text-[12px] text-black/45 tracking-[0.18em] uppercase">
              No announcements yet
            </div>
            <div className="mt-2 text-[14px] text-black/60">
              Post updates like meeting times, workouts, schedule changes, and race plans.
            </div>

            {isAdmin ? (
              <div className="mt-4">
                <Button onClick={openCreate}>Create first announcement</Button>
              </div>
            ) : (
              <div className="mt-4 text-[12px] text-black/45">
                Only club admins can post announcements.
              </div>
            )}
          </Card>
        ) : (
          <div className="space-y-3">
            {items.map((a) => (
              <div
                key={a.id}
                role={isAdmin ? "button" : undefined}
                tabIndex={isAdmin ? 0 : -1}
                onClick={() => openEdit(a)}
                onKeyDown={(e) => {
                  if (!isAdmin) return;
                  if (e.key === "Enter" || e.key === " ") openEdit(a);
                }}
                className={[
                  "relative",
                  isAdmin
                    ? "cursor-pointer select-none active:scale-[0.995] transition-transform"
                    : "cursor-default",
                ].join(" ")}
              >
                <Card className="px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 pr-2">
                      <div className="text-[14px] font-semibold text-black/85">
                        {a.title}
                      </div>
                      <div className="mt-1 text-[13px] text-black/60 line-clamp-2">
                        {a.body}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-[12px] text-black/40 whitespace-nowrap">
                        {prettyDate(a.created_at)}
                      </div>

                      {isAdmin ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            openEdit(a);
                          }}
                          className="h-8 px-3 rounded-full border border-black/10 bg-white/80 text-[12px] font-semibold text-black/75 hover:bg-white"
                          aria-label="Edit announcement"
                        >
                          Edit
                        </button>
                      ) : null}
                    </div>
                  </div>

                  {isAdmin ? (
                    <div className="mt-2 text-[12px] text-black/40">Tap to edit</div>
                  ) : null}
                </Card>
              </div>
            ))}
          </div>
        )}

        <Card className="p-5">
          <div className="text-[12px] text-black/45 tracking-[0.18em] uppercase">Tip</div>
          <div className="mt-2 text-[13px] text-black/55 leading-relaxed">
            Keep announcements short and actionable. Use the title for the headline and the details for time,
            location, and any changes.
          </div>
        </Card>
      </div>

      <TabBar />

      {/* Create/Edit Modal */}
      {openModal ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center px-4 pb-6">
          <div className="absolute inset-0 bg-black/30" onClick={closeModal} />

          <div className="relative w-full max-w-[420px] rounded-[28px] bg-white shadow-[0_30px_80px_rgba(0,0,0,0.18)] border border-black/10 overflow-hidden">
            <div className="p-5">
              <div className="text-[12px] text-black/45 tracking-[0.18em] uppercase">
                {mode === "create" ? "New announcement" : "Edit announcement"}
              </div>

              <div className="mt-1 text-[16px] font-semibold tracking-[-0.01em]">
                {mode === "create" ? "Post an update" : "Make changes"}
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
                    className="mt-2 w-full h-11 rounded-2xl border border-black/10 bg-white px-4 text-[14px] outline-none focus:border-black/25"
                  />
                </div>

                <div>
                  <div className="text-[12px] text-black/45 tracking-[0.18em] uppercase">
                    Details
                  </div>
                  <textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Meeting spot, pace groups, route, what to bring..."
                    rows={4}
                    className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-[14px] outline-none focus:border-black/25 resize-none"
                  />
                </div>
              </div>

              <div className="mt-5 flex gap-3">
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={closeModal}
                  disabled={saving || deleting}
                >
                  Cancel
                </Button>

                <Button
                  className="flex-1"
                  onClick={onPostOrSave}
                  disabled={saving || deleting}
                >
                  {saving ? "Savingâ€¦" : mode === "create" ? "Post" : "Save"}
                </Button>
              </div>

              {mode === "edit" ? (
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={onDelete}
                    disabled={saving || deleting}
                    className="w-full text-[13px] font-semibold text-red-600 py-2 rounded-2xl hover:bg-red-50 disabled:opacity-60"
                  >
                    {deleting ? "Deletingâ€¦" : "Delete announcement"}
                  </button>
                </div>
              ) : null}

              <div className="mt-3 text-[12px] text-black/45">
                Members can view announcements. Only admins can post and edit.
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
