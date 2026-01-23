"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { supabaseBrowser } from "@/lib/supabase/client";
import { setPendingProfile } from "@/lib/auth/pendingProfile";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
}

/**
 * Matches your Supabase Email provider settings screenshot:
 * - Minimum length: 10
 * - Requires: lowercase, uppercase, digit, symbol
 */
function validatePassword(pwRaw: string): string | null {
  const pw = String(pwRaw ?? "");
  if (!pw) return "Password is required.";
  if (pw.length < 10) return "Password must be at least 10 characters.";
  if (!/[a-z]/.test(pw)) return "Password must include a lowercase letter.";
  if (!/[A-Z]/.test(pw)) return "Password must include an uppercase letter.";
  if (!/[0-9]/.test(pw)) return "Password must include a number.";
  if (!/[^A-Za-z0-9]/.test(pw)) return "Password must include a symbol.";
  return null;
}

export default function SignUpPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp.get("next") || "/home";

  const supabase = useMemo(() => supabaseBrowser(), []);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  // If password is provided => password signup. If empty => magic link signup.
  const [password, setPassword] = useState("");

  const [sentTo, setSentTo] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string>("");

  const nameOk = fullName.trim().length > 0;
  const emailOk = email.trim().length > 0;

  // Requirement you stated:
  // "Send magic link button should be disabled UNTIL both name and email address have a value."
  const canSendMagic = nameOk && emailOk;

  async function submit() {
    setErr("");

    const em = String(email).trim().toLowerCase();
    const fn = String(fullName).trim();
    const ph = String(phone).trim();

    if (!fn) {
      setErr("Enter your name.");
      return;
    }
    if (!em || !em.includes("@")) {
      setErr("Enter a valid email.");
      return;
    }

    // persist until callback completes
    setPendingProfile({
      full_name: fn,
      email: em,
      phone: ph ? ph : null,
    });

    setBusy(true);
    try {
      const redirectTo = `${siteUrl()}/auth/callback?next=${encodeURIComponent(next)}`;

      // If password is present => password signup
      if (password.trim().length > 0) {
        const pwError = validatePassword(password);
        if (pwError) {
          setErr(pwError);
          return;
        }

        const { error } = await supabase.auth.signUp({
          email: em,
          password,
          options: {
            emailRedirectTo: redirectTo,
            data: {
              full_name: fn,
              phone: ph ? ph : null,
            },
          },
        });

        if (error) {
          setErr(error.message);
          return;
        }

        // With email confirmations disabled, this should sign them in immediately.
        // If confirmations enabled, they'll need to confirm email.
        router.replace(next);
        return;
      }

      // Otherwise => magic link signup
      const { error } = await supabase.auth.signInWithOtp({
        email: em,
        options: {
          emailRedirectTo: redirectTo,
          data: {
            full_name: fn,
            phone: ph ? ph : null,
          },
        },
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

  function changeEmail() {
    setSentTo("");
    setErr("");
  }

  return (
    <main className="min-h-[100dvh] flex items-center justify-center px-6">
      <Card className="w-full max-w-sm p-6">
        <div className="text-[20px] font-semibold tracking-[-0.01em]">Create account</div>
        <div className="mt-1 text-[13px] text-black/55">
          Use a password or request a magic link. You can use either to sign in.
        </div>

        {err ? (
          <div className="mt-4 rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-[13px] text-red-800">
            {err}
          </div>
        ) : null}

        {!sentTo ? (
          <div className="mt-5 space-y-3">
            <div>
              <div className="text-[12px] text-black/45 tracking-[0.18em] uppercase">Name</div>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="mt-2 w-full h-11 rounded-2xl border border-black/10 bg-white px-4 text-[14px] outline-none focus:border-black/25"
                placeholder="Lawrence Parker"
                autoComplete="name"
              />
            </div>

            <div>
              <div className="text-[12px] text-black/45 tracking-[0.18em] uppercase">Email</div>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-2 w-full h-11 rounded-2xl border border-black/10 bg-white px-4 text-[14px] outline-none focus:border-black/25"
                placeholder="you@email.com"
                autoComplete="email"
              />
            </div>

            <div>
              <div className="text-[12px] text-black/45 tracking-[0.18em] uppercase">
                Phone (optional)
              </div>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-2 w-full h-11 rounded-2xl border border-black/10 bg-white px-4 text-[14px] outline-none focus:border-black/25"
                placeholder="(555) 555-5555"
                autoComplete="tel"
              />
            </div>

            <div className="pt-1">
              <div className="flex items-center justify-between">
                <div className="text-[12px] text-black/45 tracking-[0.18em] uppercase">
                  Password (optional)
                </div>
                <div className="text-[12px] text-black/45">Magic link sign-up if blank</div>
              </div>

              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-2 w-full h-11 rounded-2xl border border-black/10 bg-white px-4 text-[14px] outline-none focus:border-black/25"
                placeholder="At least 10 chars + upper/lower/number/symb"
                autoComplete="new-password"
                type="password"
              />

              {password.trim().length > 0 ? (
                <div className="mt-2 text-[12px] text-black/55">
                  Password must be at least 10 characters and include uppercase, lowercase, a number,
                  and a symbol.
                </div>
              ) : null}
            </div>

            <div className="mt-2">
              <Button
                className="w-full"
                onClick={() => void submit()}
                disabled={busy || (!password.trim() && !canSendMagic)}
              >
                {busy
                  ? "Working..."
                  : password.trim().length > 0
                    ? "Create account"
                    : "Send magic link"}
              </Button>
            </div>

            <button
              type="button"
              className="mt-3 w-full text-center text-[13px] text-black/55 underline underline-offset-4"
              onClick={() => router.push(`/auth/sign-in?next=${encodeURIComponent(next)}`)}
            >
              Already have an account? Sign in
            </button>
          </div>
        ) : (
          <div className="mt-5">
            <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-[13px] text-emerald-900">
              Check your email for <span className="font-semibold">{sentTo}</span> to continue.
            </div>

            <div className="mt-4 space-y-2">
              <Button
                className="w-full"
                variant="secondary"
                onClick={() => void submit()}
                disabled={busy}
              >
                {busy ? "Resending..." : "Resend link"}
              </Button>

              <button
                type="button"
                className="w-full text-center text-[13px] text-black/55 underline underline-offset-4"
                onClick={changeEmail}
              >
                Change email
              </button>

              <button
                type="button"
                className="w-full text-center text-[13px] text-black/55 underline underline-offset-4"
                onClick={() => router.push(`/auth/sign-in?next=${encodeURIComponent(next)}`)}
              >
                Go to Sign in
              </button>
            </div>
          </div>
        )}
      </Card>
    </main>
  );
}
