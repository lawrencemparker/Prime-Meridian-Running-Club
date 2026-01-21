import Link from "next/link";
import { Card } from "../ui/Card";

export type Member = {
  id: string;
  full_name: string;
  phone?: string | null;
  email?: string | null;
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase()).join("");
}

export function MembersPreview({ items }: { items: Member[] }) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[12px] text-black/45 tracking-[0.18em] uppercase">
            Members
          </div>
          <div className="mt-1 text-[16px] font-semibold tracking-[-0.01em]">
            Directory
          </div>
        </div>

        <Link href="/clubs/members" className="text-[12px] text-black/55 no-underline">
          See all
        </Link>
      </div>

      <div className="mt-4 space-y-3">
        {items.slice(0, 4).map((m) => (
          <div
            key={m.id}
            className="flex items-center justify-between rounded-2xl bg-white/55 border border-black/5 p-4"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-black/5 flex items-center justify-center font-semibold">
                {initials(m.full_name)}
              </div>
              <div>
                <div className="font-semibold">{m.full_name}</div>
                <div className="mt-1 flex flex-wrap gap-2">
                  {m.phone ? (
                    <span className="text-[12px] text-black/55 bg-black/5 px-2 py-1 rounded-full">
                      {m.phone}
                    </span>
                  ) : null}
                  {m.email ? (
                    <span className="text-[12px] text-black/55 bg-black/5 px-2 py-1 rounded-full">
                      {m.email}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        ))}
        {items.length === 0 ? (
          <div className="text-[13px] text-black/55">
            No members yet for this club.
          </div>
        ) : null}
      </div>
    </Card>
  );
}
