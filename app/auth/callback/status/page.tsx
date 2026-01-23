"use client";

import { useSearchParams, useRouter } from "next/navigation";

export default function AuthCallbackStatusPage() {
  const sp = useSearchParams();
  const router = useRouter();

  const error = sp.get("error");
  const reason = sp.get("reason");
  const next = sp.get("next") || "/home";

  return (
    <main className="min-h-[100dvh] flex items-center justify-center px-6">
      <div className="w-full max-w-sm rounded-[28px] border border-black/10 bg-white/70 shadow-[0_30px_90px_rgba(15,23,42,0.10)] p-6">
        <div className="text-[12px] text-black/45 tracking-[0.18em] uppercase">Authentication</div>
        <div className="mt-1 text-[18px] font-semibold">Magic Link</div>

        {!error ? (
          <p className="mt-3 text-[14px] text-black/60">Signing you in…</p>
        ) : (
          <>
            <p className="mt-3 text-[14px] text-black/60">
              We couldn’t complete sign-in. Please request a new link.
            </p>
            {reason ? (
              <p className="mt-2 text-[12px] text-black/45 break-words">Reason: {reason}</p>
            ) : null}

            <div className="mt-5 flex gap-3">
              <button
                className="flex-1 h-[48px] rounded-full border border-black/10 bg-white/80 text-[14px] font-semibold"
                onClick={() => router.replace(`/auth/sign-in?next=${encodeURIComponent(next)}`)}
                type="button"
              >
                Try again
              </button>
              <button
                className="flex-1 h-[48px] rounded-full border border-black/10 bg-white/80 text-[14px] font-semibold"
                onClick={() => router.replace("/")}
                type="button"
              >
                Home
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
