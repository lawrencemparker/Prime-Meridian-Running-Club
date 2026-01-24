// app/auth/reset-password/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = supabaseBrowser();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        // expected
      }
    });
  }, [supabase]);

  async function handleSubmit() {
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      password,
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    router.replace("/home");
  }

  return (
    <div className="px-5 pt-24">
      <Card className="p-6">
        <h1 className="text-lg font-semibold">Reset your password</h1>
        <p className="mt-1 text-sm text-black/60">
          Enter a new password to continue.
        </p>

        <div className="mt-4 space-y-3">
          <input
            type="password"
            placeholder="New password"
            className="w-full rounded-xl border px-4 py-3"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <input
            type="password"
            placeholder="Confirm password"
            className="w-full rounded-xl border px-4 py-3"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />

          {error && (
            <div className="text-sm text-red-600">{error}</div>
          )}

          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Updating…" : "Update password"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
