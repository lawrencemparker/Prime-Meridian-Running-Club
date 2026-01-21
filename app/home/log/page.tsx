"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { GradientHeader } from "../../components/GradientHeader";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Store } from "../../lib/mcrStore";

export default function LogPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const clubs = useMemo(
    () => (mounted ? Store.listClubs() : []),
    [mounted]
  );

  const defaultClub = Store.getCurrentClubId?.() || "";

  const [clubId, setClubId] = useState(defaultClub);
  const [date, setDate] = useState("");
  const [miles, setMiles] = useState("");
  const [type, setType] = useState("training");
  const [notes, setNotes] = useState("");

  const canSave =
    clubId && date.length === 10 && Number(miles) > 0;

  function save() {
    if (!canSave) return;

    Store.addRun({
      user_id: Store.getMe().id,
      club_id: clubId,
      run_date: date,
      miles: Number(miles),
      run_type: type,
      notes: notes || null,
    });

    router.push("/home");
  }

  return (
    <div className="pb-28">
      <GradientHeader title="Log a Run" />

      <div className="px-5 mt-4">
        <Card className="p-5 space-y-4">
          <div>
            <label className="text-xs uppercase tracking-wider text-black/50">
              Running Club
            </label>
            <select
              className="mt-2 w-full rounded-2xl border px-4 py-3"
              value={clubId}
              onChange={(e) => setClubId(e.target.value)}
            >
              <option value="">Select a club</option>
              {clubs.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <input
            placeholder="Miles"
            value={miles}
            onChange={(e) => setMiles(e.target.value)}
          />

          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="training">Training</option>
            <option value="race">Race</option>
          </select>

          <textarea
            placeholder="How did it feel?"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button onClick={save} disabled={!canSave}>
              Save
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
