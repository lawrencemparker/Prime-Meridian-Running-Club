// app/api/whoami/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json(
      { ok: false, error: "Missing Supabase env" },
      { status: 500 }
    );
  }

  // Build a response we can attach cookies to if Supabase refreshes anything.
  const res = NextResponse.json({ ok: true });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          // Keep localhost compatible
          const isProd = process.env.NODE_ENV === "production";
          res.cookies.set(name, value, {
            ...options,
            secure: isProd ? options?.secure : false,
            sameSite: isProd ? options?.sameSite : "lax",
            path: "/",
          });
        });
      },
    },
  });

  // What does Supabase think the user is (from cookies)?
  const { data: userData, error: userErr } = await supabase.auth.getUser();

  // Also check session (sometimes helps show token parse issues)
  const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();

  // Return cookies present (names only, for safety) and auth state
  const cookieNames = req.cookies.getAll().map((c) => c.name);

  return NextResponse.json({
    ok: true,
    cookieNames,
    user: userData?.user
      ? {
          id: userData.user.id,
          email: userData.user.email,
        }
      : null,
    userError: userErr?.message ?? null,
    session: sessionData?.session
      ? {
          hasSession: true,
          expires_at: sessionData.session.expires_at,
        }
      : { hasSession: false },
    sessionError: sessionErr?.message ?? null,
  });
}
