"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import {
  getCoordinatorStaffByEmail,
  type CoordinatorStaff,
} from "@/lib/coordinatorAuth";
import {
  AppErrorBoundary,
  CoordinatorLoadingSkeleton,
} from "@/components/view-state";

export default function CoordinatorPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [coordinatorStaff, setCoordinatorStaff] =
    useState<CoordinatorStaff | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState(
    auth && db
      ? "Coordinator sign-in ready. Use a coordinator account to continue."
      : "Firebase setup is incomplete."
  );

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setCoordinatorStaff(null);
      setIsAuthLoading(false);

      if (!auth || !db) {
        setStatus("Firebase setup is incomplete.");
        return;
      }

      if (!user) {
        setStatus("No coordinator is signed in.");
        return;
      }

      setStatus("Checking coordinator access...");

      void (async () => {
        try {
          const staff = await getCoordinatorStaffByEmail(user.email ?? "");

          if (!staff) {
            setStatus("Access denied. This account is not a coordinator.");
            await signOut(auth);
            return;
          }

          setCoordinatorStaff(staff);
          setStatus(
            `Welcome ${staff.firstName} ${staff.lastName}. Coordinator access granted.`
          );
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : "Unable to verify coordinator access.";
          setStatus(`Coordinator verification failed: ${message}`);
          await signOut(auth);
        }
      })();
    });

    return unsubscribe;
  }, []);

  async function handleSignIn() {
    if (!email || !password) {
      setStatus("Enter an email and password first.");
      return;
    }

    setIsSubmitting(true);
    setStatus("Signing in as coordinator...");

    try {
      await signInWithEmailAndPassword(auth, email, password);
      setPassword("");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to sign in.";
      setStatus(`Sign in failed: ${message}`);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSignOut() {
    setIsSubmitting(true);
    setStatus("Signing out...");

    try {
      await signOut(auth);
      setCoordinatorStaff(null);
      setStatus("Signed out of the coordinator view.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to sign out.";
      setStatus(`Sign out failed: ${message}`);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AppErrorBoundary
      title="Coordinator view failed"
      description="Refresh the page to try loading the coordinator view again."
    >
      {isAuthLoading ? (
        <CoordinatorLoadingSkeleton />
      ) : (
        <main className="app-shell">
          <div className="app-frame max-w-2xl">
            <div className="grid gap-6 lg:grid-cols-[14rem_minmax(0,1fr)]">
              <aside className="control-rail space-y-3">
                <p className="font-mono text-xs uppercase tracking-[0.18em] text-cyan-100/90">Routes</p>
                <div className="flex flex-col gap-2 text-sm">
                  <Link href="/" className="nav-chip text-center">
                    Dashboard
                  </Link>
                  <Link href="/manager" className="nav-chip text-center">
                    Manager
                  </Link>
                  <Link href="/staff" className="nav-chip text-center">
                    Staff
                  </Link>
                </div>
              </aside>

              <div>
                <h1 className="view-title">
                  Coordinator View
                </h1>
                <p className="view-subtitle mt-4 text-base leading-7">{status}</p>

                <div className="mt-8 grid gap-4 sm:grid-cols-2">
                  <label className="text-sm font-medium text-zinc-900">
                    Email
                    <input
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      className="mt-2 w-full rounded-2xl border border-zinc-300 px-4 py-3 text-zinc-950 outline-none transition focus:border-zinc-950"
                      placeholder="maya.patel@shiftly.dev"
                      autoComplete="email"
                    />
                  </label>
                  <label className="text-sm font-medium text-zinc-900">
                    Password
                    <input
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      className="mt-2 w-full rounded-2xl border border-zinc-300 px-4 py-3 text-zinc-950 outline-none transition focus:border-zinc-950"
                      placeholder="At least 6 characters"
                      autoComplete="current-password"
                    />
                  </label>
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleSignIn}
                    disabled={isSubmitting || isAuthLoading || !(auth && db)}
                    className="rounded-full bg-zinc-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
                  >
                    Sign in
                  </button>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    disabled={isSubmitting || isAuthLoading || !currentUser}
                    className="rounded-full border border-zinc-300 px-5 py-3 text-sm font-medium text-zinc-900 transition hover:border-zinc-950 disabled:cursor-not-allowed disabled:border-zinc-200 disabled:text-zinc-400"
                  >
                    Sign out
                  </button>
                </div>

                <div className="section-card mt-4 p-4 text-sm leading-6 text-zinc-700">
                  <p>
                    {coordinatorStaff
                      ? `Authorized coordinator: ${coordinatorStaff.email}`
                      : currentUser
                        ? `Signed in as ${currentUser.email}, but coordinator access is not approved.`
                        : "No user is signed in."}
                  </p>
                </div>

                <div className="section-card mt-8 p-6 text-sm leading-6 text-zinc-700">
                  <p>This route is coordinator-only.</p>
                  <p>Use the account seeded as staff_001 or any Firestore staff doc with role coordinator.</p>
                </div>
              </div>
            </div>
          </div>
        </main>
      )}
    </AppErrorBoundary>
  );
}