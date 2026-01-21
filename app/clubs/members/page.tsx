"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { GradientHeader } from "../../../components/GradientHeader";
import { Card } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { TabBar } from "../../../components/TabBar";

import { Store } from "../../../lib/mcrStore";

const FLASH_TOAST_KEY = "mcr_flash_toast";

function setFlashToast(msg: string) {
  try {
    window.localStorage.setItem(FLASH_TOAST_KEY, msg);
  } catch {
    // ignore
  }
}

function readFlashToastOnce(): string {
  try {
    const v = window.localStorage.getItem(FLASH_TOAST_KEY) || "";
    if (v) window.localStorage.removeItem(FLASH_TOAST_KEY);
    return v;
  } catch {
    return "";
  }
}

function initials(name: any) {
  const s = String(name ?? "").trim();
  if (!s) return "M";
  const parts = s.split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] ?? "M";
  const b = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
  return (a + b).toUpperCase();
}

export default function ClubMembersPage() {
  const router = useRouter();

  const [mounted, setMounted] = useState(false);

  // toast banner (optional, but avoids “black” alert style and confirms actions)
  const [toast, setToast] = useState("");

  // Add Member modal
  const [addOpen, setAddOpen] = useState(false);
  const [addName, setAddName] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addBusy, setAddBusy] = useState(false);
  const [addError, setAddError] = useState("");

  // Remove confirm modal
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmMember, setConfirmMember] = useState<any>(null);
  const [removeBusy, setRemoveBusy] = useState(false);
  const [removeError, setRemoveError] = useState("");

  // local refresh trigger
  const [tick, setTick] = useState(0);

  useEffect(() => {
    setMounted(true);
    try {
      Store.ensureSeeded?.();
    } catch {
      // ignore
    }
    // show any toast queued by previous page
    const msg = readFlashToastOnce();
    if (msg) {
      setToast(msg);
      setTimeout(() => setToast(""), 2600);
    }
  }, []);

  const me = useMemo(() => {
    if (!mounted) return null;
    try {
      return typeof Store.getMe === "function" ? Store.getMe() : null;
    } catch {
      return null;
    }
  }, [mounted]);

  const clubId = useMemo(() => {
    if (!mounted) return "";
    try {
      const active =
        (typeof (Store as any).getActiveClubId === "function" ? (Store as any).getActiveClubId() : null) ??
        (typeof Store.getCurrentClubId === "function" ? Store.getCurrentClubId() : null) ??
        null;

      const fallback =
        typeof (Store as any).getMyApprovedClubId === "function" ? (Store as any).getMyApprovedClubId() : null;

      return String(active ?? fallback ?? "");
    } catch {
      return "";
    }
  }, [mounted]);

  const clubName = useMemo(() => {
    if (!mounted || !clubId) return "";
    try {
      const n =
        typeof Store.getClubName === "function"
          ? Store.getClubName(clubId)
          : Store.listClubs?.().find((c: any) => String(c.id) === String(clubId))?.name;
      return String(n ?? "");
    } catch {
      return "";
    }
  }, [mounted, clubId]);

  const isAdmin = useMemo(() => {
    if (!mounted || !clubId) return false;
    try {
      return typeof Store.isClubAdmin === "function" ? Store.isClubAdmin(clubId) : false;
    } catch {
      return false;
    }
  }, [mounted, clubId]);

  const members = useMemo(() => {
    if (!mounted || !clubId) return [];
    try {
      const raw =
        typeof Store.listMembers === "function"
          ? Store.listMembers(clubId)
          : typeof (Store as any).listMemberships === "function"
            ? ((Store as any).listMemberships() as any[]).filter((m) => String(m?.club_id) === String(clubId))
            : [];

      return (raw ?? []).map((m: any) => ({
        ...m,
        id: String(m?.id ?? ""),
        club_id: String(m?.club_id ?? ""),
        full_name: String(m?.full_name ?? "").trim() || "Member",
        email: String(m?.email ?? "").trim() || "",
        phone: String(m?.phone ?? "").trim() || "",
        is_admin: Boolean(m?.is_admin),
      }));
    } catch {
      return [];
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, clubId, tick]);

  const canAdd = useMemo(() => {
    const nameClean = String(addName ?? "").trim();
    return nameClean.length >= 2 && !addBusy;
  }, [addName, addBusy]);

  function closePage() {
    router.back();
  }

  function openAdd() {
    setAddError("");
    setAddName("");
    setAddEmail("");
    setAddOpen(true);
  }

  function closeAdd() {
    if (addBusy) return;
    setAddOpen(false);
    setAddError("");
  }

  function queueToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 2600);
  }

  async function addMember() {
    if (!canAdd || !clubId) return;
    setAddBusy(true);
    setAddError("");

    const full_name = String(addName ?? "").trim();
    const email = String(addEmail ?? "").trim();

    try {
      const fn = (Store as any).addMember;
      if (typeof fn !== "function") {
        throw new Error("Store.addMember is not available. Please ensure lib/mcrStore.ts exports addMember().");
      }

      // Try common signatures:
      // 1) addMember(clubId, { full_name, email, is_admin })
      // 2) addMember(clubId, full_name, email)
      try {
        fn(clubId, { full_name, email, is_admin: false });
      } catch {
        fn(clubId, full_name, email);
      }

      setAddBusy(false);
      setAddOpen(false);

      queueToast(`Added ${full_name}.`);
      setTick((v) => v + 1);
    } catch (e: any) {
      setAddBusy(false);
      setAddError(e?.message ? String(e.message) : "Unable to add member.");
    }
  }

  function requestRemove(member: any) {
    setRemoveError("");
    setConfirmMember(member);
    setConfirmOpen(true);
  }

  function closeConfirm() {
    if (removeBusy) return;
    setConfirmOpen(false);
    setConfirmMember(null);
    setRemoveError("");
  }

  async function confirmRemove() {
    if (!confirmMember || !clubId) return;

    setRemoveBusy(true);
    setRemoveError("");

    try {
      const fn = (Store as any).removeMember;
      if (typeof fn !== "function") {
        throw new Error("Store.removeMember is not available. Please ensure lib/mcrStore.ts exports removeMember().");
      }

      fn(clubId, String(confirmMember.id));

      setRemoveBusy(false);
      setConfirmOpen(false);

      const name = String(confirmMember.full_name ?? "Member").trim() || "Member";
      queueToast(`Removed ${name}.`);
      setTick((v) => v + 1);
    } catch (e: any) {
      setRemoveBusy(false);
      setRemoveError(e?.message ? String(e.message) : "Unable to remove member.");
    }
  }

  return (
    <div className="pb-28">
      <GradientHeader title="Members" subtitle="Club directory" clubName={clubName || undefined} />

      <div className="px-5 mt-2 space-y-3">
        {toast ? (
          <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-[13px] text-emerald-800">
            {toast}
          </div>
        ) : null}

        {/* Header card */}
        <Card className="p-5">
          <div className="text-[12px] text-black/45 tracking-[0.18em] uppercase">Directory</div>
          <div className="mt-1 text-[16px] font-semibold tracking-[-0.01em] break-words">{clubName || "Club"}</div>
          <div className="mt-1 text-[13px] text-black/55">
            {members.length} {members.length === 1 ? "member" : "members"}
          </div>

          {/* Buttons UNDER the club name (per your request) */}
          <div className="mt-4 flex gap-2">
            {isAdmin ? (
              <Button onClick={openAdd} className="flex-1">
                Add member
              </Button>
            ) : (
              <Button disabled className="flex-1">
                Add member
              </Button>
            )}
            <Button variant="secondary" onClick={closePage} className="flex-1">
              Done
            </Button>
          </div>

          <div className="mt-4 text-[12px] text-black/45">
            Members can view the directory. Only admins can invite or remove members.
          </div>
        </Card>

        {/* Space BETWEEN the two cards is provided by space-y-3 on the container */}
        <Card className="p-5">
          <div className="text-[12px] text-black/45 tracking-[0.18em] uppercase">Members</div>

          <div className="mt-4 space-y-3">
            {members.length === 0 ? (
              <div className="text-[13px] text-black/55">No members yet.</div>
            ) : (
              members.map((m: any) => {
                const you = me?.id && String(me.id) === String(m.id);
                const admin = Boolean(m.is_admin);
                const name = String(m.full_name ?? "Member");
                const roleLine = admin ? "Admin" : "Member";
                const contact = m.email || m.phone || "";

                return (
                  <div
                    key={String(m.id)}
                    className={[
                      "rounded-2xl border border-black/5 px-4 py-4",
                      you ? "bg-black/5" : "bg-white/60",
                    ].join(" ")}
                  >
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-full bg-black/10 flex items-center justify-center font-semibold text-[13px] shrink-0">
                        {initials(name)}
                      </div>

                      <div className="min-w-0 flex-1">
                        {/* Full name visible */}
                        <div className="text-[15px] font-semibold leading-tight break-words">{name}</div>

                        {/* Role UNDER name */}
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          {you ? (
                            <span className="rounded-full bg-black/10 px-2 py-0.5 text-[11px] text-black/70">
                              You
                            </span>
                          ) : null}
                          {admin ? (
                            <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] text-emerald-800">
                              Admin
                            </span>
                          ) : (
                            <span className="rounded-full bg-black/5 px-2 py-0.5 text-[11px] text-black/60">
                              Member
                            </span>
                          )}
                        </div>

                        {/* Optional contact */}
                        {contact ? (
                          <div className="mt-2 text-[12px] text-black/55 break-words">{contact}</div>
                        ) : null}

                        {/* Remove button UNDER role/contact (per your request) */}
                        <div className="mt-3">
                          <Button
                            variant="secondary"
                            onClick={() => requestRemove(m)}
                            disabled={!isAdmin}
                            className="w-full"
                          >
                            Remove
                          </Button>
                        </div>

                        {/* In case you want the role label as text under name too */}
                        <div className="sr-only">{roleLine}</div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="mt-4 text-[12px] text-black/45">
            Members can view the directory. Only admins can invite or remove members.
          </div>
        </Card>
      </div>

      <TabBar />
      {/* Add Member Modal */}
      {addOpen ? (
        <div className="fixed inset-0 z-50">
          <button
            aria-label="Close"
            onClick={closeAdd}
            className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
          />

          <div className="absolute inset-x-0 top-[96px] md:top-[140px]">
            <div className="mx-auto max-w-[560px] px-4">
              <Card className="p-5 rounded-[28px] shadow-[0_30px_90px_rgba(15,23,42,0.25)]">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[12px] text-black/45 tracking-[0.18em] uppercase">Members</div>
                    <div className="mt-1 text-[18px] font-semibold tracking-[-0.01em]">Add member</div>
                    <p className="mt-1 text-[13px] text-black/55 leading-relaxed">
                      Adds a runner to this club directory.
                    </p>
                  </div>

                  <button
                    onClick={closeAdd}
                    className="h-10 w-10 rounded-2xl bg-black/5 hover:bg-black/10 active:bg-black/15 transition flex items-center justify-center"
                    aria-label="Close"
                  >
                    <span className="text-[18px] leading-none">×</span>
                  </button>
                </div>

                <div className="mt-5 space-y-4">
                  <div>
                    <label className="text-[12px] text-black/45 tracking-[0.14em] uppercase">Full name</label>
                    <input
                      value={addName}
                      onChange={(e) => setAddName(e.target.value)}
                      className="mt-2 w-full rounded-2xl border border-black/10 bg-white/70 px-4 py-3 text-[15px] outline-none"
                      placeholder='e.g., "Lorenzo Stevens"'
                    />
                    {addName && String(addName).trim().length < 2 ? (
                      <div className="mt-2 text-[12px] text-red-600">Full name is required.</div>
                    ) : null}
                  </div>

                  <div>
                    <label className="text-[12px] text-black/45 tracking-[0.14em] uppercase">Email (optional)</label>
                    <input
                      value={addEmail}
                      onChange={(e) => setAddEmail(e.target.value)}
                      className="mt-2 w-full rounded-2xl border border-black/10 bg-white/70 px-4 py-3 text-[15px] outline-none"
                      placeholder="name@email.com"
                    />
                  </div>

                  {addError ? (
                    <div className="rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-[13px] text-red-700">
                      {addError}
                    </div>
                  ) : null}
                </div>

                <div className="mt-6 flex gap-2">
                  <Button variant="secondary" onClick={closeAdd} disabled={addBusy}>
                    Cancel
                  </Button>
                  <Button onClick={addMember} disabled={!canAdd}>
                    {addBusy ? "Adding..." : "Add"}
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        </div>
      ) : null}

      {/* Confirm Remove Modal */}
      {confirmOpen ? (
        <div className="fixed inset-0 z-50">
          <button
            aria-label="Close"
            onClick={closeConfirm}
            className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
          />

          <div className="absolute inset-x-0 top-[120px] md:top-[160px]">
            <div className="mx-auto max-w-[560px] px-4">
              <Card className="p-5 rounded-[28px] shadow-[0_30px_90px_rgba(15,23,42,0.25)]">
                <div className="text-[12px] text-black/45 tracking-[0.18em] uppercase">Confirm</div>
                <div className="mt-1 text-[18px] font-semibold tracking-[-0.01em]">Remove member?</div>
                <p className="mt-1 text-[13px] text-black/55 leading-relaxed">
                  This will remove{" "}
                  <span className="font-semibold text-black/80">
                    {String(confirmMember?.full_name ?? "Member").trim() || "Member"}
                  </span>{" "}
                  from this club.
                </p>

                {removeError ? (
                  <div className="mt-4 rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-[13px] text-red-700">
                    {removeError}
                  </div>
                ) : null}

                <div className="mt-6 flex gap-2">
                  <Button variant="secondary" onClick={closeConfirm} disabled={removeBusy}>
                    Cancel
                  </Button>
                  <Button onClick={confirmRemove} disabled={removeBusy}>
                    {removeBusy ? "Removing..." : "Remove"}
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
