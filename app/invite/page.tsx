"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { GradientHeader } from "@/components/GradientHeader";

export default function InvitePage() {
  const router = useRouter();
  const sp = useSearchParams();

  const token = useMemo(() => (sp?.get("token") || "").trim(), [sp]);

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string>("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) setErr("Missing invite token.");
  }, [token]);

  async function accept() {
    if (!token || busy) return;
    setBusy(true);
    setErr("");

    try {
      const supabase = supabaseBrowser();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        // Not signed in — send to sign-in, then come back.
        router.replace(`/auth/sign-in?next=${encodeURIComponent(`/invite?token=${token}`)}`);
        return;
      }

      const { data, error } = await supabase.rpc("accept_invite", { p_token: token });

      if (error) throw error;

      // data is club_id
      setDone(true);

      // Optional: set active club if Store method exists (client-side only)
      try {
        const { Store } = await import("@/lib/mcrStore");
        if (typeof (Store as any).setActiveClubId === "function") {
          (Store as any).setActiveClubId(String(data));
        }
      } catch {
        // ignore
      }

      router.replace("/home");
    } catch (e: any) {
      setErr(e?.message ? String(e.message) : "Unable to accept invite.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="pb-16">
      <GradientHeader title="Invitation" subtitle="Join your running club" />

      <div className="px-5 mt-4 space-y-4">
        <Card className="p-5">
          {done ? (
            <div className="text-black/70">Invite accepted. Redirecting…</div>
          ) : (
            <>
              <div className="font-semibold text-[16px]">Accept invite</div>
              <div className="mt-1 text-[13px] text-black/60">
                This will add you to the club and unlock club features (leaderboard, announcements, members).
              </div>

              {err ? (
                <div className="mt-3 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-[13px] text-red-700">
                  {err}
                </div>
              ) : null}

              <div className="mt-4">
                <Button onClick={accept} disabled={!token || busy}>
                  {busy ? "Accepting…" : "Accept Invite"}
                </Button>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
