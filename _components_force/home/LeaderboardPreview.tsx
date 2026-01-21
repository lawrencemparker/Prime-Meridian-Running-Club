import Link from "next/link";
import { Card } from "../ui/Card";

export type LeaderRow = {
  rank: number;
  full_name: string;
  total_miles: number;
};

function medalFor(rank: number) {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return null;
}

export function LeaderboardPreview({
  monthLabel,
  rows,
}: {
  monthLabel: string;
  rows: LeaderRow[];
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[12px] text-black/45 tracking-[0.18em] uppercase">
            Leaderboard
          </div>
          <div className="mt-1 text-[16px] font-semibold tracking-[-0.01em]">
            {monthLabel}
          </div>
        </div>

        <Link href="/leaderboard" className="text-[12px] text-black/55 no-underline">
          Open
        </Link>
      </div>

      <div className="mt-4 space-y-2">
        {rows.slice(0, 3).map((r) => {
          const medal = medalFor(r.rank);
          const first = r.rank === 1;

          const nameCls = first ? "text-amber-600" : "text-black/90";
          const milesCls = first ? "text-amber-600" : "text-black/90";
          const badgeCls = first
            ? "bg-amber-500/15 text-amber-700"
            : "bg-black/5 text-black/80";

          return (
            <div
              key={r.rank}
              className="flex items-center justify-between rounded-2xl bg-white/55 border border-black/5 px-4 py-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={[
                    "h-8 w-8 rounded-full flex items-center justify-center font-semibold",
                    badgeCls,
                  ].join(" ")}
                >
                  {medal ? <span className="text-[14px]">{medal}</span> : r.rank}
                </div>

                <div className={["font-semibold truncate", nameCls].join(" ")}>
                  {r.full_name}
                </div>
              </div>

              <div className={["font-semibold tabular-nums", milesCls].join(" ")}>
                {r.total_miles.toFixed(1)}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
