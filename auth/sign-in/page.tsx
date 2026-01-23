"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { supabaseBrowser } from "@/lib/supabase/client";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
}

function normalizeEmail(raw: string) {
  return String(raw ?? "")
    .toLowerCase()
    .trim()
    .replace(/^["'“”‘’]+|["'“”‘’]+$/g, "")
    .replace(/[\s\u00A0\u200B-\u200D\uFEFF]+/g, "");
}

function isValidEmail(em: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em);
}

type Mode = "password" | "magic";

export default function SignInPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp.get("next") || "/home";

  const supabase = useMemo(() => supabaseBrowser(), []);

  const [mode, setMode] = useState<Mode>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [sentTo, setSentTo] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string>("");

  async function submit() {
    setErr("");

    const rawEmail = email;
    const em = normalizeEmail(rawEmail);
    const pw = String(password).trim();

    if (!isValidEmail(em)) {
      setErr(`Enter a valid email. (Received: ${JSON.stringify(rawEmail)})`);
      return;
    }

    setBusy(true);
    try {
      if (mode === "password") {
        if (!pw) {
          setErr("Enter your password.");
          return;
        }

        const { error } = await supabase.auth.signInWithPassword({
          email: em,
          password: pw,
        });

        if (error) {
          setErr(error.message);
          return;
        }

        router.replace(next);
        return;
      }

      // Magic link: TEMP DEBUG MODE
      const redirectTo = `${siteUrl()}/auth/callback?next=${encodeURIComponent(next)}&debug=1`;

      const { error } = await supabase.auth.signInWithOtp({
        email: em,
        options: { emailRedirectTo: redirectTo },
      });

      if (error) {
        setErr(error.message);
        return;
      }

      setSentTo(em);
    } finally {
      setBusy(false);
    }
  }

  function resetSent() {
    setSentTo("");
    setErr("");
  }

  return (
    <main className="min-h-[100dvh] flex items-center justify-center px-6">
      <Card className="w-full max-w-sm p-6">
        <div className="text-[20px] font-semibold tracking-[-0.01em]">Sign in</div>
        <div className="mt-1 text-[13px] text-black/55">Use password or magic link.</div>

        {err ? (
          <div className="mt-4 rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-[13px] text-red-800">
            {err}
          </div>
        ) : null}

        {!sentTo ? (
          <div className="mt-5 space-y-3">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setMode("password");
                  setErr("");
                }}
                className={`flex-1 h-10 rounded-2xl border text-[13px] ${
                  mode === "password" ? "border-black/25 bg-black/5" : "border-black/10 bg-white"
                }`}
              >
                Password
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("magic");
                  setErr("");
                }}
                className={`flex-1 h-10 rounded-2xl border text-[13px] ${
                  mode === "magic" ? "border-black/25 bg-black/5" : "border-black/10 bg-white"
                }`}
              >
                Magic link
              </button>
            </div>

            <div>
              <div className="text-[12px] text-black/45 tracking-[0.18em] uppercase">Email</div>
              <input
                type="email"
                inputMode="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (err) setErr("");
                }}
                className="mt-2 w-full h-11 rounded-2xl border border-black/10 bg-white px-4 text-[14px] outline-none focus:border-black/25"
                placeholder="you@email.com"
                autoComplete="email"
              />
            </div>

            {mode === "password" ? (
              <div>
                <div className="text-[12px] text-black/45 tracking-[0.18em] uppercase">Password</div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (err) setErr("");
                  }}
                  className="mt-2 w-full h-11 rounded-2xl border border-black/10 bg-white px-4 text-[14px] outline-none focus:border-black/25"
                  placeholder="Your password"
                  autoComplete="current-password"
                />
              </div>
            ) : (
              <div className="text-[12px] text-black/55">
                We’ll email you a magic link. (Debug mode will show callback details.)
              </div>
            )}

            <div className="mt-2">
              <Button className="w-full" onClick={() => void submit()} disabled={busy}>
                {busy ? "Working..." : mode === "password" ? "Sign in" : "Send magic link"}
              </Button>
            </div>

            <button
              type="button"
              className="mt-3 w-full text-center text-[13px] text-black/55 underline underline-offset-4"
              onClick={() => router.push(`/auth/sign-up?next=${encodeURIComponent(next)}`)}
            >
              Need an account? Sign up
            </button>
          </div>
        ) : (
          <div className="mt-5">
            <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-[13px] text-emerald-900">
              Link sent to <span className="font-semibold">{sentTo}</span>. Open your email to continue.
            </div>

            <div className="mt-4 space-y-2">
              <Button className="w-full" variant="secondary" onClick={() => void submit()} disabled={busy}>
                {busy ? "Resending..." : "Resend link"}
              </Button>

              <button
                type="button"
                className="w-full text-center text-[13px] text-black/55 underline underline-offset-4"
                onClick={resetSent}
              >
                Change email
              </button>
            </div>
          </div>
        )}
      </Card>
    </main>
  );
}
