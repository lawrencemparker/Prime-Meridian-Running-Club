import { supabaseBrowser } from "@/lib/supabaseBrowser";

const PENDING_PROFILE_KEY = "mcr_pending_profile_v1";

export async function ensureProfile() {
  const supabase = supabaseBrowser();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  // read pending fields (from sign-up)
  let pending: { full_name?: string; phone?: string | null } = {};
  try {
    pending = JSON.parse(localStorage.getItem(PENDING_PROFILE_KEY) || "{}");
  } catch {
    pending = {};
  }

  // check if profile exists
  const { data: existing, error: selErr } = await supabase
    .from("profiles")
    .select("id, full_name, phone")
    .eq("id", user.id)
    .maybeSingle();

  if (selErr) {
    // ignore silently; you can surface later
    return;
  }

  const full_name = String(pending.full_name || existing?.full_name || "").trim();
  const phone = pending.phone ?? existing?.phone ?? null;

  if (!existing) {
    await supabase.from("profiles").insert({
      id: user.id,
      full_name: full_name || "Runner",
      phone,
    });
  } else if (full_name && full_name !== existing.full_name) {
    await supabase.from("profiles").update({ full_name, phone }).eq("id", user.id);
  }

  // clear pending once applied
  try {
    localStorage.removeItem(PENDING_PROFILE_KEY);
  } catch {
    // ignore
  }
}
