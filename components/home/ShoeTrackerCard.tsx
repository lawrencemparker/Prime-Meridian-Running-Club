// components/home/ShoeTrackerCard.tsx
"use client";

import { Card } from "../ui/Card";
import { Button } from "../ui/Button";

export type Shoe = {
  id: string;
  name: string;
  miles: number;
  limit: number;
  active: boolean;
};

function clamp01(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

export function ShoeTrackerCard({
  shoes,
  onAddShoes,
  onManageShoes,
}: {
  shoes: Shoe[];
  onAddShoes: () => void;
  onManageShoes: () => void;
}) {
  const primary =
    shoes.find((s) => s.active) ??
    shoes[0] ??
    ({
      id: "none",
      name: "No shoes yet",
      miles: 0,
      limit: 400,
      active: true,
    } as Shoe);

  const pct = clamp01(primary.limit > 0 ? primary.miles / primary.limit : 0);
  const pctLabel = Math.round(pct * 100);

  const milesLeft = Math.max(0, Math.round((primary.limit - primary.miles) * 10) / 10);

  const status =
    pct >= 1 ? "Over limit" : pct >= 0.85 ? "Almost done" : pct >= 0.6 ? "Getting there" : "In good shape";

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[12px] text-black/45 tracking-[0.18em] uppercase">Shoe Mileage</div>

          <div className="mt-1 text-[16px] font-semibold tracking-[-0.01em] truncate">
            {primary.name}
            <span className="ml-2 inline-flex items-center rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-[2px] text-[12px] text-emerald-800 align-middle">
              {status}
            </span>
          </div>

          <div className="mt-2 text-[13px] text-black/55">
            {Math.round(primary.miles * 10) / 10} / {primary.limit} miles {"\u00B7"} {milesLeft} left
          </div>
        </div>

        <div className="shrink-0">
          <div className="h-11 w-11 rounded-2xl bg-white/70 border border-black/5 shadow-[0_10px_22px_rgba(15,23,42,0.10)] flex items-center justify-center">
            <span className="text-[18px]">{"\u{1F45F}"}</span>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <div className="w-full h-[10px] rounded-full bg-black/10 overflow-hidden">
          <div className="h-full rounded-full bg-black/25" style={{ width: `${pctLabel}%` }} />
        </div>

        <div className="mt-2 flex items-center justify-between text-[12px] text-black/45">
          <span>{pctLabel}%</span>
          <span>Limit</span>
        </div>
      </div>

      <div className="mt-5 flex items-center gap-3">
        <Button variant="secondary" onClick={onManageShoes} className="flex-1">
          Manage
        </Button>

        <Button onClick={onAddShoes} className="flex-1 whitespace-nowrap">
          Add pair
        </Button>
      </div>
    </Card>
  );
}
