// app/join/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { GradientHeader } from "@/components/GradientHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

import { Store } from "@/lib/mcrStore";
import { supabaseBrowser } from "@/lib/supabase/client";

const FLASH_TOAST_KEY = "mcr_flash_toast";

function setFlashToast(msg: string) {
  try {
    window.localStorage.setItem(FLASH_TOAST_KEY, msg);
  } catch {
    // ignore
  }
}

export default function JoinPage() {
  const router = useRouter();
  const sp = useSearchParams();

  const token = useMemo(() => String(sp.get("token") ?? "").trim(), [sp]);

  const [status, setStatus] = useState<"idle" | "working" | "done" | "error">("idle");
  const [message, setMessage] = useState<string>("");
  const [details, setDetails] = useState<string>("");

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!token) {
        setStatus("error");
        setMessage("Missing invite token.");
        setDetails("Please use the full invite link you received.");
        return;
      }

      setStatus("working");
      setMessage("Joining club...");
      setDetails("");

      try {
        const supabase = supabaseBrowser();

        // Require an authenticated user. If not signed in yet, the RPC will fail.
        const { data: auth, error: authErr } = await supabase.auth.getUser();
        if (authErr) throw authErr;
        if (!auth?.user) {
          setStatus("error");
          setMessage("Please sign in to accept this invite.");
          setDetails("After signing in, open the invite link again.");
          return;
        }

        // Call server-side function.
        // Recommended: accept_invite returns { club_id, role }.
        const { data, error } = await supabase.rpc("accept_invite", { p_token: token });
        if (error) throw error;

        // Best-effort club_id extraction
        let clubId = "";
        if (data && typeof data === "object") {
          clubId = String((data as any).club_id ?? (Array.isArray(data) ? (data as any)[0]?.club_id : "") ?? "");
        }

        // If function doesn't return club_id, try to lookup by token (may require RLS policy).
        if (!clubId) {
          const { data: inv, error: invErr } = await supabase
            .from("invites")
            .select("club_id")
            .eq("token", token)
            .maybeSingle();
          if (!invErr) clubId = String((inv as any)?.club_id ?? "");
        }

        if (clubId) {
          try {
            (Store as any).setActiveClubId?.(clubId);
          } catch {
            // ignore
          }
        }

        if (cancelled) return;
        setStatus("done");
        setMessage("Invite accepted.");
        setDetails("Redirecting you to Home...");

        setFlashToast("Welcome to the club.");
        router.replace("/home");
      } catch (e: any) {
        if (cancelled) return;
        setStatus("error");
        setMessage("Unable to accept invite.");
        setDetails(e?.message ? String(e.message) : "Please ask the admin to create a new invite link.");
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [router, token]);

  return (
    <div className="pb-10">
      <GradientHeader title="Join" subtitle="Accept invite" />

      <div className="px-5 mt-2">
        <Card className="p-5">
          <div className="text-[12px] text-black/45 tracking-[0.18em] uppercase">Status</div>
          <div className="mt-1 text-[18px] font-semibold tracking-[-0.01em]">{message || ""}</div>

          {details ? <div className="mt-2 text-[13px] text-black/55 leading-relaxed">{details}</div> : null}

          <div className="mt-6 flex gap-2">
            {status === "error" ? (
              <Button variant="secondary" onClick={() => router.replace("/home")}>
                Go to Home
              </Button>
            ) : null}

            {status === "working" ? <Button disabled>Working...</Button> : null}
          </div>
        </Card>
      </div>
    </div>
  );
}
