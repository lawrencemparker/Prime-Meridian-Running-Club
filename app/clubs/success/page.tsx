"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Card } from "../../../components/ui/Card";

export default function ClubSuccessPage() {
  const router = useRouter();

  useEffect(() => {
    const t = setTimeout(() => router.replace("/home"), 950);
    return () => clearTimeout(t);
  }, [router]);

  return (
    <main className="min-h-[100dvh] flex items-center justify-center px-6">
      <Card className="w-full max-w-sm p-6 text-center">
        <div className="mx-auto mb-4 h-14 w-14 rounded-full bg-emerald-500/12 flex items-center justify-center">
          <span className="text-[26px]">✅</span>
        </div>

        <h1 className="text-[20px] font-semibold tracking-[-0.01em]">
          Club created
        </h1>

        <p className="mt-2 text-[14px] text-black/60">
          You’re now the admin. Taking you back home…
        </p>

        <div className="mt-5 flex items-center justify-center gap-2 text-[12px] text-black/45">
          <span className="inline-block h-2 w-2 rounded-full bg-black/20 animate-pulse" />
          <span>Redirecting</span>
        </div>
      </Card>
    </main>
  );
}
