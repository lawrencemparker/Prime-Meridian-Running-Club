// app/home/home/page.tsx
import Link from "next/link";

export const dynamic = "force-dynamic";

export default function HomeHomePage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      {/* Header (no external component imports) */}
      <header className="sticky top-0 z-10 border-b border-slate-800/60 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-4">
          <div className="flex flex-col">
            <h1 className="text-lg font-semibold leading-tight">Prime Meridian Running Club</h1>
            <p className="text-sm text-slate-300">Home</p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/home/log"
              className="rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400"
            >
              Log Miles
            </Link>
            <Link
              href="/home/leaderboard"
              className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold text-slate-100 hover:bg-slate-900"
            >
              Leaderboard
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="mx-auto w-full max-w-5xl px-4 py-8">
        <section className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardTitle>Log a Run</CardTitle>
            <CardBody>
              Add today’s miles in seconds. Your totals will roll up automatically.
            </CardBody>
            <CardActions>
              <Link
                href="/home/log"
                className="inline-flex w-full items-center justify-center rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400"
              >
                Go to Log
              </Link>
            </CardActions>
          </Card>

          <Card>
            <CardTitle>History</CardTitle>
            <CardBody>
              Review past runs, edit entries, and keep your monthly mileage accurate.
            </CardBody>
            <CardActions>
              <Link
                href="/home/history"
                className="inline-flex w-full items-center justify-center rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold text-slate-100 hover:bg-slate-900"
              >
                View History
              </Link>
            </CardActions>
          </Card>

          <Card>
            <CardTitle>Leaderboard</CardTitle>
            <CardBody>
              See who’s leading this month. Friendly competition, real consistency.
            </CardBody>
            <CardActions>
              <Link
                href="/home/leaderboard"
                className="inline-flex w-full items-center justify-center rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold text-slate-100 hover:bg-slate-900"
              >
                View Leaderboard
              </Link>
            </CardActions>
          </Card>
        </section>

        <section className="mt-6">
          <div className="rounded-2xl border border-slate-800/60 bg-slate-900/30 p-5">
            <h2 className="text-base font-semibold">Quick Links</h2>
            <p className="mt-1 text-sm text-slate-300">
              If your build is failing due to missing UI components (GradientHeader/TabBar/Card/Button),
              this page avoids those imports so you can get a clean deploy while you reconcile component paths.
            </p>

            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <QuickLink href="/home/log" label="Log" />
              <QuickLink href="/home/history" label="History" />
              <QuickLink href="/home/leaderboard" label="Leaderboard" />
              <QuickLink href="/" label="Landing" />
            </div>
          </div>
        </section>

        {/* Minimal footer */}
        <footer className="mt-10 pb-6 text-center text-xs text-slate-400">
          © {new Date().getFullYear()} Prime Meridian Running Club
        </footer>
      </div>
    </main>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-800/60 bg-slate-900/30 p-5 shadow-sm">
      {children}
    </div>
  );
}

function CardTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-base font-semibold">{children}</h3>;
}

function CardBody({ children }: { children: React.ReactNode }) {
  return <p className="mt-2 text-sm text-slate-300">{children}</p>;
}

function CardActions({ children }: { children: React.ReactNode }) {
  return <div className="mt-4">{children}</div>;
}

function QuickLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-slate-800/60 bg-slate-950/30 px-3 py-3 text-sm font-semibold text-slate-100 hover:bg-slate-900"
    >
      {label}
    </Link>
  );
}
