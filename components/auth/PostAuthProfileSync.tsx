"use client";

import { useEffect } from "react";

import { Store } from "@/lib/mcrStore";
import { supabaseBrowser } from "@/lib/supabase/client";

type ProfileRow = {
  id: string;
  email?: string | null;
  full_name?: string | null;
  phone?: string | null;
};

function clean(v: unknown) {
  return String(v ?? "").trim();
}

/**
 * Runs after auth (usually placed on /home) to ensure:
 * - a `profiles` row exists for the logged-in user
 * - Store.getMe() reflects the user's full_name/phone for UI prefill
 *
 * This component is intentionally "silent" (renders nothing) and idempotent.
 */
export function PostAuthProfileSync() {
  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        Store.ensureSeeded();
      } catch {
        // ignore
      }

      try {
        const supabase = supabaseBrowser();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user || cancelled) return;

        // Fetch profile (may not exist yet)
        const { data, error } = await supabase
          .from("profiles")
          .select("id,email,full_name,phone")
          .eq("id", user.id)
          .maybeSingle();

        if (error) throw error;

        const row: ProfileRow | null = (data as any) ?? null;

        const derivedName =
          (user.user_metadata?.full_name as string | undefined) ||
          (user.user_metadata?.name as string | undefined) ||
          "";
        const derivedPhone = (user.phone as string | undefined) || "";

        // Ensure row exists
        if (!row) {
          const insert: ProfileRow = {
            id: user.id,
            email: user.email ?? null,
            full_name: derivedName ? clean(derivedName) : null,
            phone: derivedPhone ? clean(derivedPhone) : null,
          };

          const { error: insErr } = await supabase.from("profiles").insert(insert as any);
          if (insErr) throw insErr;

          if (cancelled) return;

          Store.updateMe({
            id: user.id,
            email: user.email ?? undefined,
            full_name: insert.full_name ?? undefined,
            phone: insert.phone ?? undefined,
          });

          return;
        }

        if (cancelled) return;

        // If the DB row is missing name/phone but Auth has it, patch only the missing fields.
        const patch: Partial<ProfileRow> = {};
        if (!row.full_name && derivedName) patch.full_name = clean(derivedName);
        if (!row.phone && derivedPhone) patch.phone = clean(derivedPhone);

        if (Object.keys(patch).length) {
          const { error: upErr } = await supabase
            .from("profiles")
            .update(patch as any)
            .eq("id", user.id);
          if (upErr) throw upErr;
        }

        const finalName = (patch.full_name ?? row.full_name) ?? "";
        const finalPhone = (patch.phone ?? row.phone) ?? "";

        Store.updateMe({
          id: user.id,
          email: (row.email ?? user.email) ?? undefined,
          full_name: finalName || undefined,
          phone: finalPhone || undefined,
        });
      } catch {
        // If Supabase isn't configured in this environment, ignore.
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
