// app/auth/callback/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function localhostSafeCookieOptions(options: any) {
  const isProd = process.env.NODE_ENV === "production";
  if (isProd) return options;

  const nextOptions: any = { ...options };
  nextOptions.secure = false;
  nextOptions.sameSite = "lax";
  nextOptions.path = "/";
  if (nextOptions.domain) delete nextOptions.domain;
  return nextOptions;
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/home";
  const debug = url.searchParams.get("debug") === "1";

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json(
      { ok: false, error: "Missing Supabase env" },
      { status: 500 }
    );
  }

  // If debug, return JSON; otherwise redirect to next
  const response = debug
    ? NextResponse.json({ ok: true })
    : NextResponse.redirect(new URL(next, url.origin));

  response.headers.set("Cache-Control", "no-store");

  const incomingCookieNames = req.cookies.getAll().map((c) => c.name);

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, localhostSafeCookieOptions(options));
        });
      },
    },
  });

  if (!code) {
    // If no code, show exactly what we got (debug) or redirect to status
    if (debug) {
      return NextResponse.json({
        ok: false,
        reason: "Missing code",
        receivedSearchParams: Object.fromEntries(url.searchParams.entries()),
        incomingCookieNames,
      });
    }

    return NextResponse.redirect(
      new URL(`/auth/callback/status?error=1&reason=Missing%20code`, url.origin)
    );
  }

  const { error: exchangeErr } = await supabase.auth.exchangeCodeForSession(code);

  const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
  const { data: userData, error: userErr } = await supabase.auth.getUser();

  if (debug) {
    const outgoingCookieNames = response.cookies.getAll().map((c) => c.name);

    return NextResponse.json({
      ok: true,
      receivedSearchParams: Object.fromEntries(url.searchParams.entries()),
      incomingCookieNames,
      exchangeError: exchangeErr?.message ?? null,
      session: sessionData.session
        ? { hasSession: true, expires_at: sessionData.session.expires_at }
        : { hasSession: false },
      sessionError: sessionErr?.message ?? null,
      user: userData.user ? { id: userData.user.id, email: userData.user.email } : null,
      userError: userErr?.message ?? null,
      outgoingCookieNames,
    });
  }

  if (exchangeErr) {
    return NextResponse.redirect(
      new URL(
        `/auth/callback/status?error=1&reason=${encodeURIComponent(exchangeErr.message)}`,
        url.origin
      )
    );
  }

  if (sessionErr || !sessionData.session) {
    return NextResponse.redirect(
      new URL(
        `/auth/callback/status?error=1&reason=${encodeURIComponent(
          sessionErr?.message ?? "Session not established after exchange"
        )}`,
        url.origin
      )
    );
  }

  return response;
}
