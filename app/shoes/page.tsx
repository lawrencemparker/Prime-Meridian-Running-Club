// app/shoes/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Store, type Shoe } from "@/lib/mcrStore";

const TOAST_KEY = "mcr_flash_toast";

export default function ShoesPage() {
  const router = useRouter();
  const [shoes, setShoes] = useState<Shoe[]>([]);
  const [toast, setToast] = useState<string>("");

  function pullToastOnce() {
    try {
      const msg = window.localStorage.getItem(TOAST_KEY) || "";
      if (msg) {
        setToast(msg);
        window.localStorage.removeItem(TOAST_KEY);
        setTimeout(() => setToast(""), 2600);
      }
    } catch {
      // ignore
    }
  }

  function refresh() {
    setShoes(Store.listShoes());
  }

  useEffect(() => {
    Store.ensureSeeded?.();
    refresh();
    pullToastOnce();
  }, []);

  function toggleRetired(shoe: Shoe) {
    const nextActive = !shoe.active;
    Store.setShoeActive(shoe.id, nextActive);
    refresh();

    const msg = nextActive ? `Shoe unretired: ${shoe.name}` : `Shoe retired: ${shoe.name}`;
    setToast(msg);
    setTimeout(() => setToast(""), 2600);
  }

  return (
    <div className="px-5 pb-28">
      <div className="mx-auto max-w-[560px] pt-8">
        {toast ? (
          <div className="mb-4 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-[13px] text-emerald-800">
            {toast}
          </div>
        ) : null}

        <Card className="p-5 rounded-[28px] shadow-[0_30px_90px_rgba(15,23,42,0.10)]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[12px] text-black/45 tracking-[0.18em] uppercase whitespace-nowrap">
                Shoe Mileage
              </div>
              <div className="mt-1 text-[18px] font-semibold tracking-[-0.01em] whitespace-nowrap">
                Manage shoes
              </div>
            </div>

            <div className="shrink-0">
              <Button
                onClick={() => router.push("/shoes/new")}
                className="px-4 py-2 text-[14px] rounded-2xl"
              >
                Add
              </Button>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {shoes.length === 0 ? (
              <div className="text-[13px] text-black/55">No shoes yet.</div>
            ) : (
              shoes.map((s) => {
                const isRetired = !s.active;
                return (
                  <div
                    key={s.id}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-black/5 bg-white/55 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{s.name}</div>
                      <div className="mt-1 text-[12px] text-black/55">
                        {Number(s.miles ?? 0).toFixed(1)} / {Number(s.limit ?? 0).toFixed(0)} miles{" "}
                        {"\u00B7"} {isRetired ? "Retired" : "Active"}
                      </div>
                    </div>

                    <button
                      onClick={() => toggleRetired(s)}
                      className="shrink-0 rounded-xl border border-black/10 bg-white/70 px-3 py-2 text-[13px] font-semibold hover:bg-white active:bg-white"
                      type="button"
                    >
                      {isRetired ? "Unretire" : "Retire"}
                    </button>
                  </div>
                );
              })
            )}
          </div>

          <div className="mt-5">
            <Button variant="secondary" onClick={() => router.back()}>
              Done
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
