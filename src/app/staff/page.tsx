"use client";

import Link from "next/link";
import AccessibleScheduleGrid, {
  type ScheduleGridCell,
} from "@/components/accessible-schedule-grid";

const staffWeekCells: ScheduleGridCell[] = [
  { id: "mon", label: "Mon", items: ["Front Desk 08:00-14:00"] },
  { id: "tue", label: "Tue", items: ["Operations 12:00-18:00"] },
  { id: "wed", label: "Wed", items: [] },
  { id: "thu", label: "Thu", items: ["Support Queue 09:00-13:00"] },
  { id: "fri", label: "Fri", items: ["Coverage Float 10:00-16:00"] },
  { id: "sat", label: "Sat", items: ["Weekend Rotation 11:00-15:00"] },
  { id: "sun", label: "Sun", items: [] },
];

export default function StaffPage() {
  return (
    <main className="app-shell">
      <div className="app-frame max-w-6xl">
        <div className="grid gap-6 xl:grid-cols-[17rem_minmax(0,1fr)]">
          <aside className="control-rail space-y-3">
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-cyan-100/90">Routes</p>
            <div className="flex flex-col gap-2 text-sm">
              <Link href="/" className="nav-chip text-center">
                Dashboard
              </Link>
              <Link href="/coordinator" className="nav-chip text-center">
                Coordinator
              </Link>
              <Link href="/manager" className="nav-chip text-center">
                Manager
              </Link>
            </div>
          </aside>

          <div>
            <h1 className="view-title">Staff View</h1>
            <p className="view-subtitle mt-4">
              Personal schedule, assignment awareness, and upcoming shift visibility.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <article className="metric-card p-4">
                <p className="text-xs uppercase tracking-wide text-zinc-500">Assigned Hours</p>
                <p className="mt-2 text-2xl font-semibold text-zinc-900">29.5h</p>
              </article>
              <article className="metric-card p-4">
                <p className="text-xs uppercase tracking-wide text-zinc-500">Next Shift</p>
                <p className="mt-2 text-2xl font-semibold text-zinc-900">Tue 12:00</p>
              </article>
              <article className="metric-card p-4">
                <p className="text-xs uppercase tracking-wide text-zinc-500">Open Swap Requests</p>
                <p className="mt-2 text-2xl font-semibold text-zinc-900">0</p>
              </article>
            </div>

            <div className="mt-8">
              <AccessibleScheduleGrid
                title="Staff weekly schedule grid"
                cells={staffWeekCells}
              />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
