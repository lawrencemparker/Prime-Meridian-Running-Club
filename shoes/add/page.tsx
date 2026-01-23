"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ShoesAddRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/shoes/new");
  }, [router]);

  return (
    <div className="px-5 pt-6 text-[13px] text-black/55">
      Redirecting…
    </div>
  );
}
