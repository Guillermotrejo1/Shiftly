"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import AccessibleScheduleGrid, {
  type ScheduleGridCell,
} from "@/components/accessible-schedule-grid";
import AccountMenu from "@/components/account-menu";
import { auth } from "@/lib/firebase";

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
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    const firebaseAuth = auth;

    if (!firebaseAuth) {
      return;
    }

    const unsubscribe = onAuthStateChanged(firebaseAuth, (user) => {
      setCurrentUser(user);
    });

    return unsubscribe;
  }, []);

  async function handleSignOut() {
    const firebaseAuth = auth;

    if (!firebaseAuth) {
      return;
    }

    setIsSigningOut(true);

    try {
      await signOut(firebaseAuth);
    } finally {
      setIsSigningOut(false);
    }
  }

  return (
    <main className="app-shell">
      <div className="app-frame relative max-w-6xl">
        {currentUser ? (
          <AccountMenu
            currentUserEmail={currentUser.email ?? "Unknown user"}
            onSignOut={handleSignOut}
            disabled={isSigningOut}
          />
        ) : null}
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
              <Link href="/staff" className="nav-chip text-center">
                Staff
              </Link>
            </div>
          </aside>

          <div>
            <h1 className="view-title">Manager View</h1>
            <p className="view-subtitle mt-4">
              Oversight view for staffing health, weekly coverage, and approval-sensitive handoffs.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <article className="metric-card p-4">
                <p className="text-xs uppercase tracking-wide text-zinc-500">Open Gaps</p>
                <p className="mt-2 text-2xl font-semibold text-zinc-900">3</p>
              </article>
              <article className="metric-card p-4">
                <p className="text-xs uppercase tracking-wide text-zinc-500">Pending Approvals</p>
                <p className="mt-2 text-2xl font-semibold text-zinc-900">2</p>
              </article>
              <article className="metric-card p-4">
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
        </div>
      </div>
    </main>
  );
}
