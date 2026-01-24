"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anon) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
  }

  return createClient(url, anon);
}

export default function AuthPage() {
  const router = useRouter();
  const sp = useSearchParams();

  const next = useMemo(() => sp.get("next") || "/home", [sp]);

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit() {
    setErr(null);
    setMsg(null);

    if (!email.trim()) {
      setErr("Email is required.");
      return;
    }
    if (!password.trim()) {
      setErr("Password is required.");
      return;
    }

    setSaving(true);
    try {
      const supabase = getSupabase();

      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) throw error;

        // Successful sign-in -> go where middleware wanted us to go.
        router.replace(next);
        return;
      }

      // SIGN UP
      if (!fullName.trim()) {
        setErr("Full name is required for sign up.");
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          // Store the fields so your profile sync (or trigger) can write them to public.profiles
          data: {
            full_name: fullName.trim(),
            phone: phone.trim() || null,
          },
        },
      });

      if (error) throw error;

      // If email confirmation is enabled, session may be null.
      if (!data.session) {
        setMsg("Check your email to confirm your account, then sign in.");
        setMode("signin");
        return;
      }

      router.replace(next);
    } catch (e: any) {
      setErr(e?.message || "Authentication failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-120px)] flex items-center justify-center px-4">
      <Card className="w-full max-w-[520px] p-6">
        <div className="text-[18px] font-semibold text-black/85">
          {mode === "signin" ? "Sign in" : "Create account"}
        </div>
        <div className="mt-1 text-[13px] text-black/55">
          {mode === "signin"
            ? "Sign in to continue."
            : "Create your account to continue."}
        </div>

        {mode === "signup" ? (
          <div className="mt-5 space-y-3">
            <div>
              <div className="text-[12px] text-black/55 mb-1">Full name</div>
              <input
                className="w-full h-[48px] rounded-[14px] border border-black/10 px-4 text-[14px] outline-none"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your name"
                autoComplete="name"
              />
            </div>

            <div>
              <div className="text-[12px] text-black/55 mb-1">
                Phone (optional)
              </div>
              <input
                className="w-full h-[48px] rounded-[14px] border border-black/10 px-4 text-[14px] outline-none"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="555-555-5555"
                autoComplete="tel"
              />
            </div>
          </div>
        ) : null}

        <div className="mt-5 space-y-3">
          <div>
            <div className="text-[12px] text-black/55 mb-1">Email</div>
            <input
              className="w-full h-[48px] rounded-[14px] border border-black/10 px-4 text-[14px] outline-none"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              autoComplete="email"
            />
          </div>

          <div>
            <div className="text-[12px] text-black/55 mb-1">Password</div>
            <input
              className="w-full h-[48px] rounded-[14px] border border-black/10 px-4 text-[14px] outline-none"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              placeholder="••••••••"
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
            />
          </div>
        </div>

        {err ? (
          <div className="mt-4 text-[13px] text-red-600">{err}</div>
        ) : null}
        {msg ? (
          <div className="mt-4 text-[13px] text-black/60">{msg}</div>
        ) : null}

        <div className="mt-5">
          <Button onClick={onSubmit} disabled={saving}>
            {saving
              ? "Please wait…"
              : mode === "signin"
              ? "Sign in"
              : "Create account"}
          </Button>
        </div>

        <div className="mt-4 text-[13px] text-black/55">
          {mode === "signin" ? (
            <>
              Don&apos;t have an account?{" "}
              <button
                className="underline"
                onClick={() => {
                  setErr(null);
                  setMsg(null);
                  setMode("signup");
                }}
              >
                Create one
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button
                className="underline"
                onClick={() => {
                  setErr(null);
                  setMsg(null);
                  setMode("signin");
                }}
              >
                Sign in
              </button>
            </>
          )}
        </div>

        <div className="mt-2 text-[12px] text-black/40">
          After sign-in you will be redirected to:{" "}
          <span className="font-mono">{next}</span>
        </div>
      </Card>
    </div>
  );
}
