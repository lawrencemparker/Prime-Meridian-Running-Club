﻿"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { supabaseBrowser } from "@/lib/supabase/client";
import { Store } from "@/lib/mcrStore";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

type ProfileRow = {
  id: string;
  full_name: string | null;
  phone: string | null;
  updated_at?: string | null;
};

export default function ProfilePage() {
  const router = useRouter();
  const supabase = useMemo(() => supabaseBrowser(), []);

  const [busy, setBusy] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string>("");

  const [userId, setUserId] = useState<string>("");
  const [email, setEmail] = useState<string>("");

  const [fullName, setFullName] = useState<string>("");
  const [phone, setPhone] = useState<string>("");

  async function load() {
    setErr("");
    setBusy(true);

    try {
      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();

      if (userErr) {
        setErr(userErr.message);
        return;
      }

      if (!user) {
        router.replace(`/auth/sign-in?next=${encodeURIComponent("/profile")}`);
        return;
      }

      setUserId(user.id);
      setEmail(user.email ?? "");

      const meta: any = user.user_metadata ?? {};
      const metaFullName = String(meta.full_name ?? meta.name ?? "").trim();
      const metaPhone = String(meta.phone ?? "").trim();

      const { data: profile, error: profErr } = await supabase
        .from("profiles")
        .select("id, full_name, phone, updated_at")
        .eq("id", user.id)
        .maybeSingle<ProfileRow>();

      if (profErr) {
        setErr(profErr.message);
        return;
      }

      // If no profile row exists yet, create it with NON-NULL full_name
      if (!profile) {
        const { error: upsertErr } = await supabase.from("profiles").upsert(
          {
            id: user.id,
            full_name: metaFullName || "", // never null
            phone: metaPhone ? metaPhone : null,
          },
          { onConflict: "id" }
        );

        if (upsertErr) {
          setErr(upsertErr.message);
          return;
        }

        setFullName(metaFullName || "");
        setPhone(metaPhone || "");

        // Sync into Store so Home header matches Profile
        Store.updateMe({
          id: user.id,
          full_name: metaFullName || "Runner",
          email: user.email ?? "",
          phone: metaPhone || undefined,
        });

        return;
      }

      setFullName(profile.full_name ?? "");
      setPhone(profile.phone ?? "");

      // Sync into Store
      Store.updateMe({
        id: user.id,
        full_name: (profile.full_name ?? metaFullName ?? "Runner").trim() || "Runner",
        email: user.email ?? "",
        phone: (profile.phone ?? metaPhone) ? String(profile.phone ?? metaPhone) : undefined,
      });
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    setErr("");
    if (!userId) return;

    const fn = fullName.trim();
    const ph = phone.trim();

    setSaving(true);
    try {
      const { error: upsertErr } = await supabase.from("profiles").upsert(
        {
          id: userId,
          full_name: fn || "", // never null
          phone: ph ? ph : null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );

      if (upsertErr) {
        setErr(upsertErr.message);
        return;
      }

      // Sync into Store immediately after save
      Store.updateMe({
        id: userId,
        full_name: fn || "Runner",
        email,
        phone: ph || undefined,
      });
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="min-h-[100dvh] px-6 py-8">
      <div className="mx-auto w-full max-w-xl space-y-4">
        <Card className="p-6">
          <div className="text-[20px] font-semibold tracking-[-0.01em]">Profile</div>
          <div className="mt-1 text-[13px] text-black/55">Emergency info stays private.</div>

          {err ? (
            <div className="mt-4 rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-[13px] text-red-800">
              {err}
            </div>
          ) : null}

          {busy ? (
            <div className="mt-6 text-[13px] text-black/55">Loading profile...</div>
          ) : (
            <div className="mt-5 space-y-4">
              <div>
                <div className="text-[12px] text-black/45 tracking-[0.18em] uppercase">Email</div>
                <input
                  value={email}
                  readOnly
                  className="mt-2 w-full h-11 rounded-2xl border border-black/10 bg-black/[0.03] px-4 text-[14px] outline-none"
                  placeholder="you@email.com"
                />
              </div>

              <div>
                <div className="text-[12px] text-black/45 tracking-[0.18em] uppercase">Full name</div>
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="mt-2 w-full h-11 rounded-2xl border border-black/10 bg-white px-4 text-[14px] outline-none focus:border-black/25"
                  placeholder="Your name"
                  autoComplete="name"
                />
              </div>

              <div>
                <div className="text-[12px] text-black/45 tracking-[0.18em] uppercase">Phone</div>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="mt-2 w-full h-11 rounded-2xl border border-black/10 bg-white px-4 text-[14px] outline-none focus:border-black/25"
                  placeholder="(555) 555-5555"
                  autoComplete="tel"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <Button className="flex-1" onClick={() => void save()} disabled={saving}>
                  {saving ? "Saving..." : "Save"}
                </Button>

                <Button
                  className="flex-1"
                  variant="secondary"
                  onClick={() => router.back()}
                  disabled={saving}
                >
                  Back
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </main>
  );
}
