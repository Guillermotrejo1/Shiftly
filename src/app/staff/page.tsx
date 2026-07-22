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
    <main className="flex min-h-screen items-start justify-center bg-zinc-50 p-8">
      <div className="w-full max-w-6xl rounded-3xl bg-white p-8 shadow-sm ring-1 ring-zinc-200">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-semibold text-zinc-950">Staff View</h1>
          <div className="flex flex-wrap gap-2 text-sm">
            <Link href="/" className="rounded-full border border-zinc-300 px-4 py-2 text-zinc-900 hover:border-zinc-900">
              Dashboard
            </Link>
            <Link href="/coordinator" className="rounded-full border border-zinc-300 px-4 py-2 text-zinc-900 hover:border-zinc-900">
              Coordinator
            </Link>
            <Link href="/manager" className="rounded-full border border-zinc-300 px-4 py-2 text-zinc-900 hover:border-zinc-900">
              Manager
            </Link>
          </div>
        </div>

        <p className="mt-4 text-zinc-600">
          Personal schedule, assignment awareness, and upcoming shift visibility.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <article className="rounded-2xl bg-zinc-100 p-4">
            <p className="text-xs uppercase tracking-wide text-zinc-500">Assigned Hours</p>
            <p className="mt-2 text-2xl font-semibold text-zinc-900">29.5h</p>
          </article>
          <article className="rounded-2xl bg-zinc-100 p-4">
            <p className="text-xs uppercase tracking-wide text-zinc-500">Next Shift</p>
            <p className="mt-2 text-2xl font-semibold text-zinc-900">Tue 12:00</p>
          </article>
          <article className="rounded-2xl bg-zinc-100 p-4">
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
    </main>
  );
}
