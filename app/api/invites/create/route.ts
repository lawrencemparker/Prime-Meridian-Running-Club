import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseServer } from "@/lib/supabase/server";

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(req: NextRequest) {
  const { supabase, res } = supabaseServer(req);

  const {
    club_id,
    email,
    role = "member",
  }: { club_id?: string; email?: string; role?: "member" | "admin" } = await req.json();

  if (!club_id) return NextResponse.json({ error: "Missing club_id" }, { status: 400 });
  if (!email || !isValidEmail(email)) return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  if (role !== "member" && role !== "admin") return NextResponse.json({ error: "Invalid role" }, { status: 400 });

  const {
    data: { user },
    error: uErr,
  } = await supabase.auth.getUser();

  if (uErr || !user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const token = crypto.randomBytes(32).toString("hex");

  const { data: invite, error: insErr } = await supabase
    .from("invites")
    .insert({
      club_id,
      email: email.toLowerCase(),
      role,
      token,
      created_by: user.id,
    })
    .select("id, token, expires_at")
    .single();

  if (insErr) {
    // If RLS blocks insert, you’ll see it here (admin check failed).
    return NextResponse.json({ error: insErr.message }, { status: 403 });
  }

  // Build invite URL
  const origin = req.headers.get("origin") || process.env.NEXT_PUBLIC_SITE_URL || "";
  const inviteUrl = `${origin}/invite?token=${encodeURIComponent(invite.token)}`;

  // Email sending hook (optional). Implement later with provider.
  // For now: return inviteUrl so you can paste/share manually.
  // If you add Resend/Postmark later, send here and still return inviteUrl.
  return NextResponse.json(
    { ok: true, inviteUrl, expires_at: invite.expires_at },
    { headers: res.headers }
  );
}
