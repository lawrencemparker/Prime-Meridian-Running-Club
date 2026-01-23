"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { GradientHeader } from "@/components/GradientHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { TabBar } from "@/components/TabBar";

import { Store } from "../../../lib/mcrStore";
import { supabaseBrowser } from "@/lib/supabase/client";

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

function makeTokenHex(bytes = 16) {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export default function ClubMembersPage() {
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  const [toast, setToast] = useState("");

  // Invite modal
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"member" | "admin">("member");
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [inviteLink, setInviteLink] = useState("");

  // Remove confirm modal
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmMember, setConfirmMember] = useState<any>(null);
  const [removeBusy, setRemoveBusy] = useState(false);
  const [removeError, setRemoveError] = useState("");

  const [tick, setTick] = useState(0);

  useEffect(() => {
    setMounted(true);
    try {
      Store.ensureSeeded?.();
    } catch {
      // ignore
    }

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

  const [clubName, setClubName] = useState<string>("");
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [members, setMembers] = useState<any[]>([]);

  useEffect(() => {
    if (!mounted || !clubId) {
      setClubName("");
      setIsAdmin(false);
      setMembers([]);
      return;
    }

    let cancelled = false;

async function addMember() {
  if (!clubId) return;

  // For invites: email is REQUIRED by your invites table schema
  const email = String(addEmail ?? "").trim().toLowerCase();
  if (!email) {
    setAddError("Email is required to send an invite.");
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    setAddError("Enter a valid email address.");
    return;
  }

  setAddBusy(true);
  setAddError("");

  try {
    const supabase = supabaseBrowser();

    // Generate token client-side (UUID). RLS will enforce admin-only insert.
    const token =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    const { error } = await supabase.from("invites").insert({
      club_id: clubId,
      email,
      role: "member",
      token,
    });

    if (error) throw error;

    const url = `${window.location.origin}/join?token=${encodeURIComponent(token)}`;

    // Copy to clipboard (best UX)
    try {
      await navigator.clipboard.writeText(url);
      queueToast("Invite link copied to clipboard.");
    } catch {
      queueToast("Invite created.");
    }

    setAddBusy(false);
    setAddOpen(false);

    // Optionally refresh list
    setTick((v) => v + 1);

    // If clipboard failed, at least show the link in a toast
    if (!navigator?.clipboard) {
      queueToast(url);
    }
  } catch (e: any) {
    setAddBusy(false);
    setAddError(e?.message ? String(e.message) : "Unable to create invite.");
  }
}


    async function load() {
      try {
        const supabase = supabaseBrowser();
        const { data: auth } = await supabase.auth.getUser();
        const user = auth?.user;

        // Club name
        const { data: clubRow, error: clubErr } = await supabase
          .from("clubs")
          .select("name")
          .eq("id", clubId)
          .maybeSingle();
        if (clubErr) throw clubErr;

        // Memberships for this club
        const { data: ms, error: msErr } = await supabase
          .from("memberships")
          .select("user_id,is_admin,created_at")
          .eq("club_id", clubId)
          .order("created_at", { ascending: true });
        if (msErr) throw msErr;

        const userIds = Array.from(new Set((ms ?? []).map((m: any) => String(m?.user_id)).filter(Boolean)));

        // Profiles
        let profilesById: Record<string, any> = {};
        if (userIds.length) {
          const { data: prof, error: profErr } = await supabase
            .from("profiles")
            .select("id,full_name")
            .in("id", userIds);
          if (profErr) throw profErr;
          profilesById = Object.fromEntries((prof ?? []).map((p: any) => [String(p?.id), p]));
        }

        const mapped = (ms ?? []).map((m: any) => {
          const uid = String(m?.user_id ?? "");
          const p = profilesById[uid];
          return {
            id: uid,
            club_id: clubId,
            full_name: String(p?.full_name ?? "").trim() || "Member",
            email: "",
            phone: "",
            is_admin: Boolean(m?.is_admin),
          };
        });

        const admin = Boolean(
          user && (ms ?? []).some((m: any) => String(m?.user_id) === String(user.id) && Boolean(m?.is_admin))
        );

        if (!cancelled) {
          setClubName(String(clubRow?.name ?? ""));
          setIsAdmin(admin);
          setMembers(mapped);
        }
      } catch {
        // fallback to Store
        try {
          const n =
            typeof Store.getClubName === "function"
              ? Store.getClubName(clubId)
              : Store.listClubs?.().find((c: any) => String(c.id) === String(clubId))?.name;

          const raw =
            typeof Store.listMembers === "function"
              ? Store.listMembers(clubId)
              : typeof (Store as any).listMemberships === "function"
                ? ((Store as any).listMemberships() as any[]).filter((m) => String(m?.club_id) === String(clubId))
                : [];

          const mapped = (raw ?? []).map((m: any) => ({
            ...m,
            id: String(m?.id ?? ""),
            club_id: String(m?.club_id ?? ""),
            full_name: String(m?.full_name ?? "").trim() || "Member",
            email: String(m?.email ?? "").trim() || "",
            phone: String(m?.phone ?? "").trim() || "",
            is_admin: Boolean(m?.is_admin),
          }));

          const admin = typeof Store.isClubAdmin === "function" ? Store.isClubAdmin(clubId) : false;

          if (!cancelled) {
            setClubName(String(n ?? ""));
            setIsAdmin(Boolean(admin));
            setMembers(mapped);
          }
        } catch {
          if (!cancelled) {
            setClubName("");
            setIsAdmin(false);
            setMembers([]);
          }
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [mounted, clubId, tick]);

  function queueToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 2600);
  }

  function closePage() {
    router.back();
  }

  function openInvite() {
    setInviteError("");
    setInviteEmail("");
    setInviteRole("member");
    setInviteLink("");
    setInviteOpen(true);
  }

  function closeInvite() {
    if (inviteBusy) return;
    setInviteOpen(false);
    setInviteError("");
  }

  async function createInvite() {
    if (!clubId) return;
    const email = String(inviteEmail ?? "").trim().toLowerCase();
    if (!email || !email.includes("@")) {
      setInviteError("Please enter a valid email address.");
      return;
    }

    setInviteBusy(true);
    setInviteError("");

    try {
      const supabase = supabaseBrowser();
      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();

      if (userErr) throw userErr;
      if (!user) throw new Error("You must be signed in to invite members.");

      const token = makeTokenHex(16);

      const { error: insErr } = await supabase.from("invites").insert({
        club_id: clubId,
        email,
        role: inviteRole,
        token,
        created_by: user.id,
      });

      if (insErr) throw insErr;

      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const link = `${origin}/join?token=${encodeURIComponent(token)}`;

      setInviteLink(link);
      queueToast("Invite created.");
    } catch (e: any) {
      setInviteError(e?.message ? String(e.message) : "Unable to create invite.");
    } finally {
      setInviteBusy(false);
      setTick((v) => v + 1);
    }
  }

  async function copyInviteLink() {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      queueToast("Invite link copied.");
    } catch {
      queueToast("Unable to copy. Please copy manually.");
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

        {/* Directory header card */}
        <Card className="p-5">
          <div className="text-[12px] text-black/45 tracking-[0.18em] uppercase">Directory</div>

          {/* REQUIRED: {Club Name} Club under Directory */}
          <div className="mt-1 text-[16px] font-semibold tracking-[-0.01em] break-words">
            {clubName ? `${clubName} Club` : "Club"}
          </div>

          <div className="mt-1 text-[13px] text-black/55">
            {members.length} {members.length === 1 ? "member" : "members"}
          </div>

          <div className="mt-4 flex gap-2">
            <Button onClick={openInvite} disabled={!isAdmin} className="flex-1">
              Add member
            </Button>
            <Button variant="secondary" onClick={closePage} className="flex-1">
              Done
            </Button>
          </div>

          <div className="mt-4 text-[12px] text-black/45">
            Members can view the directory. Only admins can invite or remove members.
          </div>
        </Card>

        {/* Members list */}
        <Card className="p-5">
          <div className="text-[12px] text-black/45 tracking-[0.18em] uppercase">Members</div>

          <div className="mt-4 space-y-3">
            {members.length === 0 ? (
              <div className="text-[13px] text-black/55">No members yet.</div>
            ) : (
              members.map((m: any) => {
                const you = me?.id && String(me.id) === String(m.id);
                const admin = Boolean(m.is_admin);
                const name = String(m.full_name ?? "Member").trim() || "Member";

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
                        <div className="text-[15px] font-semibold leading-tight break-words">{name}</div>

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

      {/* Invite Modal */}
      {inviteOpen ? (
        <div className="fixed inset-0 z-50">
          <button
            aria-label="Close"
            onClick={closeInvite}
            className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
          />

          <div className="absolute inset-x-0 top-[96px] md:top-[140px]">
            <div className="mx-auto max-w-[560px] px-4">
              <Card className="p-5 rounded-[28px] shadow-[0_30px_90px_rgba(15,23,42,0.25)]">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[12px] text-black/45 tracking-[0.18em] uppercase">Invite</div>
                    <div className="mt-1 text-[18px] font-semibold tracking-[-0.01em]">Add member</div>
                    <p className="mt-1 text-[13px] text-black/55 leading-relaxed">
                      Create an invite link for a runner to join this club.
                    </p>
                  </div>

                  <button
                    onClick={closeInvite}
                    className="h-10 w-10 rounded-2xl bg-black/5 hover:bg-black/10 active:bg-black/15 transition flex items-center justify-center"
                    aria-label="Close"
                  >
                    <span className="text-[18px] leading-none">×</span>
                  </button>
                </div>

                <div className="mt-5 space-y-4">
                  <div>
                    <label className="text-[12px] text-black/45 tracking-[0.14em] uppercase">Email</label>
                    <input
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className="mt-2 w-full rounded-2xl border border-black/10 bg-white/70 px-4 py-3 text-[15px] outline-none"
                      placeholder="runner@email.com"
                    />
                  </div>

                  <div>
                    <label className="text-[12px] text-black/45 tracking-[0.14em] uppercase">Role</label>
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value as any)}
                      className="mt-2 w-full rounded-2xl border border-black/10 bg-white/70 px-4 py-3 text-[15px] outline-none"
                    >
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>

                  {inviteError ? (
                    <div className="rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-[13px] text-red-700">
                      {inviteError}
                    </div>
                  ) : null}

                  {inviteLink ? (
                    <div className="rounded-2xl border border-black/10 bg-white/60 px-4 py-3">
                      <div className="text-[12px] text-black/45 tracking-[0.14em] uppercase">Invite link</div>
                      <div className="mt-2 break-words text-[13px] text-black/70">{inviteLink}</div>
                      <div className="mt-3 flex gap-2">
                        <Button variant="secondary" onClick={copyInviteLink} className="flex-1">
                          Copy link
                        </Button>
                        <Button
                          onClick={() => {
                            setInviteOpen(false);
                            setInviteLink("");
                            setInviteEmail("");
                            setInviteRole("member");
                          }}
                          className="flex-1"
                        >
                          Done
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </div>

                {!inviteLink ? (
                  <div className="mt-6 flex gap-2">
                    <Button variant="secondary" onClick={closeInvite} disabled={inviteBusy}>
                      Cancel
                    </Button>
                    <Button onClick={createInvite} disabled={inviteBusy}>
                      {inviteBusy ? "Creating..." : "Create invite"}
                    </Button>
                  </div>
                ) : null}
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
