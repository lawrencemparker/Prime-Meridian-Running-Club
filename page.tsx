"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function SplashPage() {
  const router = useRouter();
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    // Once per session: if already seen, skip immediately
    const seen = sessionStorage.getItem("mcr_splash_seen");
    if (seen === "1") {
      router.replace("/home");
      return;
    }
    sessionStorage.setItem("mcr_splash_seen", "1");

    // Calm & elegant timing (~2.5s total)
    const t1 = setTimeout(() => setExiting(true), 2000); // start fade-out
    const t2 = setTimeout(() => router.replace("/home"), 2550); // navigate after fade

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [router]);

  return (
    <main className="min-h-[100dvh] flex items-center justify-center px-6">
      <div
        className={[
          "flex flex-col items-center gap-6 splash-in",
          exiting ? "splash-exit" : "",
        ].join(" ")}
      >
        <div className="relative h-40 w-40">
          <Image
            src="/logo.jpeg"
            alt="My Club Running"
            fill
            priority
            className="object-contain drop-shadow-[0_22px_40px_rgba(15,23,42,0.18)]"
          />
        </div>

        <div className="w-28 h-1.5 rounded-full bg-black/10 overflow-hidden">
          <div className="h-full w-1/2 bg-[rgb(var(--accent))] rounded-full animate-loader" />
        </div>
      </div>
    </main>
  );
}
