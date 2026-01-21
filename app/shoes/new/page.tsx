"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { Store } from "../../../lib/mcrStore";

const TOAST_KEY = "mcr_flash_toast";

export default function AddShoeModalPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [limit, setLimit] = useState<string>("400");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>("");

  const limitNum = useMemo(() => {
    const n = Number(limit);
    if (!Number.isFinite(n)) return NaN;
    return Math.round(n);
  }, [limit]);

  const nameClean = String(name ?? "").trim();

  const canSave =
    nameClean.length >= 2 &&
    Number.isFinite(limitNum) &&
    limitNum >= 50 &&
    limitNum <= 2000;

  useEffect(() => {
    Store.ensureSeeded?.();
  }, []);

  // Prevent background scroll while modal is open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  function close() {
    router.back();
  }

  async function save() {
    if (!canSave || saving) return;
    setSaving(true);
    setError("");

    try {
      const me = typeof Store.getMe === "function" ? Store.getMe() : null;

      // IMPORTANT: preserve Store method "this" context
      const addShoeFn = (Store as any).addShoe as any;
      if (typeof addShoeFn !== "function") {
        throw new Error("Store.addShoe is not available.");
      }

      let shoe: any;

      try {
        // Preferred: newer API accepts an object payload
        shoe = addShoeFn.call(Store, {
          name: nameClean,
          limit: limitNum,
          active: true,
          user_id: me?.id,
        });
      } catch {
        // Fallback: older API accepts (userId, name)
        shoe = addShoeFn.call(Store, String(me?.id ?? "local-user"), nameClean);
      }

      if (typeof window !== "undefined") {
        window.localStorage.setItem(
          TOAST_KEY,
          `Shoe added: ${String(shoe?.name ?? nameClean)}`
        );
      }

      setTimeout(() => {
        router.replace("/shoes");
      }, 200);
    } catch (e: any) {
      setError(e?.message ? String(e.message) : "Unable to save shoe.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50">
      <button
        aria-label="Close"
        onClick={close}
        className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
      />

      {/* Modal positioned higher (mid-screen style) */}
      <div className="absolute inset-x-0 top-[96px] md:top-[140px]">
        <div className="mx-auto max-w-[560px] px-4">
          <Card className="p-5 rounded-[28px] shadow-[0_30px_90px_rgba(15,23,42,0.25)]">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[12px] text-black/45 tracking-[0.18em] uppercase">
                  Shoe Mileage
                </div>
                <div className="mt-1 text-[18px] font-semibold tracking-[-0.01em]">
                  Add running shoes
                </div>
                <p className="mt-1 text-[13px] text-black/55 leading-relaxed">
                  Track mileage per pair. Runners select the shoe used for each run.
                </p>
              </div>

              <button
                onClick={close}
                className="h-10 w-10 rounded-2xl bg-black/5 hover:bg-black/10 active:bg-black/15 transition flex items-center justify-center"
                aria-label="Close"
              >
                <span className="text-[18px] leading-none">×</span>
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <label className="text-[12px] text-black/45 tracking-[0.14em] uppercase">
                  Shoe name
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder='e.g., "Nike Pegasus 40"'
                  className="mt-2 w-full rounded-2xl border border-black/10 bg-white/70 px-4 py-3 text-[15px] outline-none"
                />
              </div>

              <div>
                <label className="text-[12px] text-black/45 tracking-[0.14em] uppercase">
                  Mileage limit
                </label>

                <div className="mt-2 flex items-center gap-2">
                  <input
                    value={limit}
                    onChange={(e) => setLimit(e.target.value)}
                    inputMode="numeric"
                    placeholder="400"
                    className="w-full rounded-2xl border border-black/10 bg-white/70 px-4 py-3 text-[15px] outline-none"
                  />
                  <div className="text-[13px] text-black/45 whitespace-nowrap pr-1">
                    miles
                  </div>
                </div>

                {!Number.isNaN(limitNum) && (limitNum < 50 || limitNum > 2000) ? (
                  <div className="mt-2 text-[12px] text-red-600">
                    Please choose a limit between 50 and 2000 miles.
                  </div>
                ) : null}
              </div>

              {error ? (
                <div className="rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-[13px] text-red-700">
                  {error}
                </div>
              ) : null}
            </div>

            <div className="mt-6 flex gap-2">
              <Button variant="secondary" onClick={close}>
                Cancel
              </Button>
              <Button onClick={save} disabled={!canSave || saving}>
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
