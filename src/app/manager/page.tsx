"use client";

import Link from "next/link";
import AccessibleScheduleGrid, {
  type ScheduleGridCell,
} from "@/components/accessible-schedule-grid";

const managerWeekCells: ScheduleGridCell[] = [
  { id: "mon", label: "Mon", items: ["Coverage review 08:00", "Escalation handoff 16:00"] },
  { id: "tue", label: "Tue", items: ["Overtime check 09:00"] },
  { id: "wed", label: "Wed", items: ["Staff 1:1 blocks 14:00"] },
  { id: "thu", label: "Thu", items: ["Training assignment 10:00"] },
  { id: "fri", label: "Fri", items: ["Weekend prep 15:30"] },
  { id: "sat", label: "Sat", items: [] },
  { id: "sun", label: "Sun", items: [] },
];

export default function ManagerPage() {
  return (
    <main className="flex min-h-screen items-start justify-center bg-zinc-50 p-8">
      <div className="w-full max-w-6xl rounded-3xl bg-white p-8 shadow-sm ring-1 ring-zinc-200">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-semibold text-zinc-950">Manager View</h1>
          <div className="flex flex-wrap gap-2 text-sm">
            <Link href="/" className="rounded-full border border-zinc-300 px-4 py-2 text-zinc-900 hover:border-zinc-900">
              Dashboard
            </Link>
            <Link href="/coordinator" className="rounded-full border border-zinc-300 px-4 py-2 text-zinc-900 hover:border-zinc-900">
              Coordinator
            </Link>
            <Link href="/staff" className="rounded-full border border-zinc-300 px-4 py-2 text-zinc-900 hover:border-zinc-900">
              Staff
            </Link>
          </div>
        </div>

        <p className="mt-4 text-zinc-600">
          Oversight view for staffing health, weekly coverage, and approval-sensitive handoffs.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <article className="rounded-2xl bg-zinc-100 p-4">
            <p className="text-xs uppercase tracking-wide text-zinc-500">Open Gaps</p>
            <p className="mt-2 text-2xl font-semibold text-zinc-900">3</p>
          </article>
          <article className="rounded-2xl bg-zinc-100 p-4">
            <p className="text-xs uppercase tracking-wide text-zinc-500">Pending Approvals</p>
            <p className="mt-2 text-2xl font-semibold text-zinc-900">2</p>
          </article>
          <article className="rounded-2xl bg-zinc-100 p-4">
            <p className="text-xs uppercase tracking-wide text-zinc-500">At-Risk Overtime</p>
            <p className="mt-2 text-2xl font-semibold text-zinc-900">1</p>
          </article>
        </div>

        <div className="mt-8">
          <AccessibleScheduleGrid
            title="Manager weekly schedule grid"
            cells={managerWeekCells}
          />
        </div>
      </div>
    </main>
  );
}
