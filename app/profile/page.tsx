import { GradientHeader } from "@/components/GradientHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { TabBar } from "@/components/TabBar";

export default function ProfilePage() {
  return (
    <div className="pb-28">
      <GradientHeader title="Profile" subtitle="Emergency info stays private." />

      <div className="px-5 space-y-4 mt-4">

        <Card className="p-4 space-y-3">
          <div>
            <label className="text-[13px] text-black/60">Full name</label>
            <input className="mt-1 w-full h-12 rounded-xl border border-black/10 px-3 bg-white" />
          </div>

          <div>
            <label className="text-[13px] text-black/60">Phone</label>
            <input className="mt-1 w-full h-12 rounded-xl border border-black/10 px-3 bg-white" />
          </div>

          <div className="pt-2 text-[14px] font-semibold">Emergency Contact</div>

          <div>
            <label className="text-[13px] text-black/60">Name</label>
            <input className="mt-1 w-full h-12 rounded-xl border border-black/10 px-3 bg-white" />
          </div>

          <div>
            <label className="text-[13px] text-black/60">Phone</label>
            <input className="mt-1 w-full h-12 rounded-xl border border-black/10 px-3 bg-white" />
          </div>

          <div>
            <label className="text-[13px] text-black/60">Medical notes</label>
            <textarea className="mt-1 w-full min-h-24 rounded-xl border border-black/10 px-3 py-2 bg-white" />
          </div>

          <Button>Save</Button>
          <Button variant="secondary">Log out</Button>
        </Card>
      </div>

      <TabBar />
    </div>
  );
}
