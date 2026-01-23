"use client";

import { useEffect, useMemo } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

const PENDING_PROFILE_KEY = "mcr_pending_profile_v1";

export function PostAuthProfileSync() {
  const supabase = useMemo(() => supabaseBrowser(), []);

  useEffect(() => {
    (async () => {
      let pending: any = null;
      try {
        const raw = window.localStorage.getItem(PENDING_PROFILE_KEY);
        if (!raw) return;
        pending = JSON.parse(raw);
      } catch {
        return;
      }

      const full_name = String(pending?.full_name ?? "").trim();
      const phoneRaw = pending?.phone;
      const phone = phoneRaw != null ? String(phoneRaw).trim() : "";

      if (full_name.length < 2) {
        window.localStorage.removeItem(PENDING_PROFILE_KEY);
        return;
      }

      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      if (!user) return;

      // Upsert profile
      const { error } = await supabase
        .from("profiles")
        .upsert(
          { id: user.id, full_name, phone: phone || null },
          { onConflict: "id" }
        );

      if (!error) {
        window.localStorage.removeItem(PENDING_PROFILE_KEY);
      }
    })();
  }, [supabase]);

  return null;
}
