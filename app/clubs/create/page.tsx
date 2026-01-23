﻿"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { supabaseBrowser } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Store } from "@/lib/mcrStore";

export default function CreateClubPage() {
  const router = useRouter();
  const supabase = useMemo(() => supabaseBrowser(), []);

  const [clubName, setClubName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function createClub() {
    setErr("");
    const name = clubName.trim();
    if (!name) {
      setErr("Club name required.");
      return;
    }

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
        router.replace(`/auth/sign-in?next=${encodeURIComponent("/clubs/create")}`);
        return;
      }

      // 1) create club
      const { data: clubRow, error: clubErr } = await supabase
        .from("clubs")
        .insert({
          name,
          created_by: user.id,
        })
        .select("id, name")
        .single();

      if (clubErr) {
        setErr(clubErr.message);
        return;
      }

      // 2) add membership (admin)
      const { error: memErr } = await supabase.from("memberships").insert({
        club_id: clubRow.id,
        user_id: user.id,
        is_admin: true,
      });

      if (memErr) {
        setErr(memErr.message);
        return;
      }

      // 3) set active club locally
      Store.setActiveClubId(clubRow.id);

      router.push("/home");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-[100dvh] flex items-center justify-center px-6">
      <Card className="w-full max-w-sm p-6">
        <div className="text-[20px] font-semibold tracking-[-0.01em]">Create a club</div>
        <div className="mt-1 text-[13px] text-black/55">
          Create a new running club for your members.
        </div>

        {err ? (
          <div className="mt-4 rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-[13px] text-red-800">
            {err}
          </div>
        ) : null}

        <div className="mt-5 space-y-3">
          <div>
            <div className="text-[12px] text-black/45 tracking-[0.18em] uppercase">Club name</div>
            <input
              value={clubName}
              onChange={(e) => setClubName(e.target.value)}
              className="mt-2 w-full h-11 rounded-2xl border border-black/10 bg-white px-4 text-[14px] outline-none focus:border-black/25"
              placeholder="Prime Meridian Running Club"
              autoComplete="off"
            />
          </div>

          <Button className="w-full" onClick={() => void createClub()} disabled={busy}>
            {busy ? "Creating..." : "Create club"}
          </Button>

          <Button className="w-full" variant="secondary" onClick={() => router.back()} disabled={busy}>
            Back
          </Button>
        </div>
      </Card>
    </main>
  );
}
