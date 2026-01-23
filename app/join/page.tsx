"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { supabaseBrowser } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function JoinPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const supabase = useMemo(() => supabaseBrowser(), []);

  const token = sp.get("token") || "";
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<"idle" | "ok" | "err">("idle");
  const [msg, setMsg] = useState<string>("");

  useEffect(() => {
    if (!token) {
      setStatus("err");
      setMsg("Missing invite token.");
      return;
    }

    let cancelled = false;

    async function run() {
      setBusy(true);
      setStatus("idle");
      setMsg("");

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        // Must be signed in to accept invite (because accept_invite uses auth.jwt() email)
        if (!user) {
          const next = `/join?token=${encodeURIComponent(token)}`;
          router.replace(`/auth/sign-in?next=${encodeURIComponent(next)}`);
          return;
        }

        // Accept invite via RPC
        const { data: clubId, error } = await supabase.rpc("accept_invite", { p_token: token });

        if (error) throw error;

        // Persist active club locally so the app can reflect the selection immediately
        try {
          window.localStorage.setItem("mcr_active_club_v1", JSON.stringify(String(clubId)));
          window.dispatchEvent(new Event("mcr_active_club_changed"));
        } catch {
          // ignore
        }

        if (!cancelled) {
          setStatus("ok");
          setMsg("Invite accepted. Redirecting…");
        }

        router.replace("/home");
      } catch (e: any) {
        if (!cancelled) {
          setStatus("err");
          setMsg(e?.message ? String(e.message) : "Unable to accept invite.");
        }
      } finally {
        if (!cancelled) setBusy(false);
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [token, router, supabase]);

  return (
    <main className="min-h-[100dvh] flex items-center justify-center px-6">
      <Card className="w-full max-w-sm p-6">
        <div className="text-[20px] font-semibold tracking-[-0.01em]">Join club</div>
        <div className="mt-1 text-[13px] text-black/55">We’ll confirm your invitation.</div>

        {status === "ok" ? (
          <div className="mt-4 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-[13px] text-emerald-900">
            {msg}
          </div>
        ) : null}

        {status === "err" ? (
          <div className="mt-4 rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-[13px] text-red-800">
            {msg}
          </div>
        ) : null}

        <div className="mt-5 flex gap-2">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={() => router.replace("/home")}
            disabled={busy}
          >
            Go home
          </Button>
          <Button
            className="flex-1"
            onClick={() => router.refresh()}
            disabled={busy}
          >
            {busy ? "Working..." : "Retry"}
          </Button>
        </div>
      </Card>
    </main>
  );
}
