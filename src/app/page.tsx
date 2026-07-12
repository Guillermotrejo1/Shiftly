"use client";

import { useEffect, useState } from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";
import {
  collection,
  getDocs,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import {
  getCoordinatorStaffByEmail,
  type CoordinatorStaff,
} from "@/lib/coordinatorAuth";
import { seedMockFirestore } from "@/lib/seedFirestore";
import type { Shift, Staff } from "@/types/scheduling";

type DirectoryStaff = Staff & { id: string };
type AvailabilityFilter = "all" | "available" | "unavailable";
type DirectoryShift = Shift & { id: string };

export default function Home() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [coordinatorStaff, setCoordinatorStaff] =
    useState<CoordinatorStaff | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState(
    auth && db
      ? "Firebase Auth and Firestore are connected. Sign in to seed Firestore."
      : "Firebase setup is incomplete."
  );
  const [isSeeding, setIsSeeding] = useState(false);
  const [directoryStaff, setDirectoryStaff] = useState<DirectoryStaff[]>([]);
  const [directoryShifts, setDirectoryShifts] = useState<DirectoryShift[]>([]);
  const [isDirectoryLoading, setIsDirectoryLoading] = useState(false);
  const [unitFilter, setUnitFilter] = useState("all");
  const [availabilityFilter, setAvailabilityFilter] =
    useState<AvailabilityFilter>("all");
  const [selectedStaff, setSelectedStaff] =
    useState<DirectoryStaff | null>(null);

  const unitOptions = Array.from(
    new Set(directoryStaff.map((staff) => staff.department ?? "Unassigned"))
  ).sort((a, b) => a.localeCompare(b));

  const filteredDirectoryStaff = directoryStaff.filter((staff) => {
    const unit = staff.department ?? "Unassigned";
    const matchesUnit = unitFilter === "all" || unit === unitFilter;
    const matchesAvailability =
      availabilityFilter === "all" ||
      (availabilityFilter === "available" ? staff.isActive : !staff.isActive);

    return matchesUnit && matchesAvailability;
  });

  const selectedStaffShiftHistory = selectedStaff
    ? directoryShifts
        .filter((shift) => shift.assignedStaffIds.includes(selectedStaff.id))
        .sort((a, b) => b.startTime.localeCompare(a.startTime))
    : [];

  function mapStaffDocument(snapshot: QueryDocumentSnapshot<DocumentData>) {
    const staff = snapshot.data() as Staff;

    return {
      ...staff,
      id: snapshot.id,
    } satisfies DirectoryStaff;
  }

  function mapShiftDocument(snapshot: QueryDocumentSnapshot<DocumentData>) {
    const shift = snapshot.data() as Shift;

    return {
      ...shift,
      id: snapshot.id,
    } satisfies DirectoryShift;
  }

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
        setDirectoryStaff([]);
          setDirectoryShifts([]);
          setSelectedStaff(null);
        setUnitFilter("all");
        setAvailabilityFilter("all");
        setStatus("Welcome to Shiftly. Sign in to continue.");
        return;
      }

      setStatus("Checking coordinator access...");

      void (async () => {
        const staff = await getCoordinatorStaffByEmail(user.email ?? "");

        if (!staff) {
          setDirectoryStaff([]);
          setDirectoryShifts([]);
          setSelectedStaff(null);
          setUnitFilter("all");
          setAvailabilityFilter("all");
          setStatus("");
          return;
        }

        setCoordinatorStaff(staff);
        setStatus(``);
      })();
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!coordinatorStaff || !db) {
      return;
    }

    void (async () => {
      setIsDirectoryLoading(true);

      try {
        const [staffSnapshot, shiftSnapshot] = await Promise.all([
          getDocs(collection(db, "staff")),
          getDocs(collection(db, "shifts")),
        ]);

        const staff = staffSnapshot.docs
          .map(mapStaffDocument)
          .sort((a: DirectoryStaff, b: DirectoryStaff) =>
            `${a.lastName} ${a.firstName}`.localeCompare(
              `${b.lastName} ${b.firstName}`
            )
          );

        const shifts = shiftSnapshot.docs
          .map(mapShiftDocument)
          .sort((a: DirectoryShift, b: DirectoryShift) =>
            b.startTime.localeCompare(a.startTime)
          );

        setDirectoryStaff(staff);
        setDirectoryShifts(shifts);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Unable to load staff directory.";
        setStatus(`Staff directory failed to load: ${message}`);
      } finally {
        setIsDirectoryLoading(false);
      }
    })();
  }, [coordinatorStaff]);

  async function handleCreateAccount() {
    if (!email || !password) {
      setStatus("Enter an email and password first.");
      return;
    }

    setIsSubmitting(true);
    setStatus("Creating account...");

    try {
      const credential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      setStatus(`Account created and signed in as ${credential.user.email}.`);
      setEmail("");
      setPassword("");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to create account.";
      setStatus(`Create account failed: ${message}`);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSignIn() {
    if (!email || !password) {
      setStatus("Enter an email and password first.");
      return;
    }

    setIsSubmitting(true);
    setStatus("Signing in...");

    try {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      setStatus(`Signed in as ${credential.user.email}.`);
      setEmail("");
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
      setStatus("Signed out. Sign in again to seed Firestore.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to sign out.";
      setStatus(`Sign out failed: ${message}`);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSeed() {
    if (!currentUser?.email || !coordinatorStaff) {
      setStatus("Only a coordinator can seed Firestore.");
      return;
    }

    setIsSeeding(true);
    setStatus("Checking coordinator access before seeding Firestore...");

    try {
      const result = await seedMockFirestore(currentUser.email);
      setStatus(
        `Seed complete: ${result.staffCount} staff records and ${result.shiftCount} shifts written to Firestore.`
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to seed Firestore.";
      setStatus(`Seed failed: ${message}`);
    } finally {
      setIsSeeding(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 p-8">
      <div className="w-full max-w-2xl rounded-3xl bg-white p-8 shadow-sm ring-1 ring-zinc-200">
        <h1 className="text-3xl font-semibold text-zinc-950">
          Shiftly
        </h1>
        <p className="mt-4 text-base leading-7 text-zinc-600">{status}</p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium text-zinc-900">
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              suppressHydrationWarning
              className="mt-2 w-full rounded-2xl border border-zinc-300 px-4 py-3 text-zinc-950 outline-none transition focus:border-zinc-950"
              placeholder="spider@gmail.com"
              autoComplete="email"
            />
          </label>
          <label className="text-sm font-medium text-zinc-900">
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              suppressHydrationWarning
              className="mt-2 w-full rounded-2xl border border-zinc-300 px-4 py-3 text-zinc-950 outline-none transition focus:border-zinc-950"
              placeholder="At least 6 characters"
              autoComplete="current-password"
            />
          </label>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          {!currentUser && (
            <button
              type="button"
              onClick={handleCreateAccount}
              disabled={isSubmitting || isAuthLoading || !(auth && db)}
              className="rounded-full bg-zinc-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
            >
              {isSubmitting ? "Working..." : "Create account"}
            </button>
          )}
          {!currentUser && (
            <button
              type="button"
              onClick={handleSignIn}
              disabled={isSubmitting || isAuthLoading || !(auth && db)}
              className="rounded-full border border-zinc-300 px-5 py-3 text-sm font-medium text-zinc-900 transition hover:border-zinc-950 disabled:cursor-not-allowed disabled:border-zinc-200 disabled:text-zinc-400"
            >
              Sign in
            </button>
          )}
          <button
            type="button"
            onClick={handleSignOut}
            disabled={isSubmitting || isAuthLoading || !currentUser}
            className="rounded-full border border-zinc-300 px-5 py-3 text-sm font-medium text-zinc-900 transition hover:border-zinc-950 disabled:cursor-not-allowed disabled:border-zinc-200 disabled:text-zinc-400"
          >
            Sign out
          </button>
        </div>
        <div className="mt-4 rounded-2xl bg-zinc-100 p-4 text-sm leading-6 text-zinc-700">
          <p>{isAuthLoading ? "Checking auth session..." : currentUser ? `Current user: ${currentUser.email}` : "No user is signed in."}</p>
        </div>
        {coordinatorStaff ? (
          <div className="mt-8 rounded-2xl bg-zinc-100 p-6 text-sm leading-6 text-zinc-700">
            <p>This will write:</p>
            <p>12 mock staff records into the staff collection.</p>
            <p>14 mock shifts covering one full week into the shifts collection.</p>
          </div>
        ) : null}
        {coordinatorStaff ? (
          <button
            type="button"
            onClick={handleSeed}
            disabled={isSeeding || isSubmitting || !(auth && db)}
            className="mt-6 rounded-full bg-zinc-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
          >
            {isSeeding ? "Seeding..." : "Seed Firestore"}
          </button>
        ) : null}
        {coordinatorStaff ? (
          <section className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-semibold text-zinc-950">Staff Directory</h2>
              <p className="text-sm text-zinc-600">
                Showing {filteredDirectoryStaff.length} of {directoryStaff.length} staff
              </p>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium text-zinc-900">
                Unit
                <select
                  value={unitFilter}
                  onChange={(event) => setUnitFilter(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-zinc-950 outline-none transition focus:border-zinc-950"
                >
                  <option value="all">All units</option>
                  {unitOptions.map((unit) => (
                    <option key={unit} value={unit}>
                      {unit}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm font-medium text-zinc-900">
                Availability
                <select
                  value={availabilityFilter}
                  onChange={(event) =>
                    setAvailabilityFilter(event.target.value as AvailabilityFilter)
                  }
                  className="mt-2 w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-zinc-950 outline-none transition focus:border-zinc-950"
                >
                  <option value="all">All statuses</option>
                  <option value="available">Available</option>
                  <option value="unavailable">Unavailable</option>
                </select>
              </label>
            </div>

            <div className="mt-6 space-y-3">
              {isDirectoryLoading ? (
                <p className="rounded-2xl bg-zinc-100 p-4 text-sm text-zinc-700">
                  Loading staff directory...
                </p>
              ) : filteredDirectoryStaff.length === 0 ? (
                <p className="rounded-2xl bg-zinc-100 p-4 text-sm text-zinc-700">
                  No staff match the current filters.
                </p>
              ) : (
                filteredDirectoryStaff.map((staff) => (
                  <article
                    key={staff.id}
                    className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-base font-semibold text-zinc-900">
                        {staff.firstName} {staff.lastName}
                      </h3>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${
                          staff.isActive
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-zinc-200 text-zinc-700"
                        }`}
                      >
                        {staff.isActive ? "Available" : "Unavailable"}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-zinc-700">{staff.email}</p>
                    <p className="mt-1 text-sm text-zinc-600">
                      Unit: {staff.department ?? "Unassigned"} | Role: {staff.role}
                    </p>
                    <button
                      type="button"
                      onClick={() => setSelectedStaff(staff)}
                      className="mt-4 rounded-full border border-zinc-300 px-4 py-2 text-xs font-medium text-zinc-900 transition hover:border-zinc-950"
                    >
                      View profile
                    </button>
                  </article>
                ))
              )}
            </div>
          </section>
        ) : null}
        {selectedStaff ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 p-4">
            <div className="w-full max-w-3xl rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-zinc-200">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold text-zinc-950">
                    {selectedStaff.firstName} {selectedStaff.lastName}
                  </h2>
                  <p className="mt-1 text-sm text-zinc-600">
                    {selectedStaff.email}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedStaff(null)}
                  className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-900 transition hover:border-zinc-950"
                >
                  Close
                </button>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl bg-zinc-100 p-4 text-sm leading-6 text-zinc-700">
                  <p className="font-medium text-zinc-900">Profile</p>
                  <p className="mt-2">Unit: {selectedStaff.department ?? "Unassigned"}</p>
                  <p>Role: {selectedStaff.role}</p>
                  <p>
                    Availability: {selectedStaff.isActive ? "Available" : "Unavailable"}
                  </p>
                  <p>
                    Max weekly hours: {selectedStaff.maxWeeklyHours ?? "Not set"}
                  </p>
                </div>

                <div className="rounded-2xl bg-zinc-100 p-4 text-sm leading-6 text-zinc-700">
                  <p className="font-medium text-zinc-900">Skills</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedStaff.skills.length > 0 ? (
                      selectedStaff.skills.map((skill) => (
                        <span
                          key={skill}
                          className="rounded-full bg-white px-3 py-1 text-xs font-medium text-zinc-800 ring-1 ring-zinc-200"
                        >
                          {skill}
                        </span>
                      ))
                    ) : (
                      <p>No skills listed.</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-lg font-semibold text-zinc-950">
                    Shift History
                  </h3>
                  <p className="text-sm text-zinc-600">
                    Read-only
                  </p>
                </div>

                <div className="mt-4 space-y-3">
                  {selectedStaffShiftHistory.length === 0 ? (
                    <p className="rounded-2xl bg-zinc-100 p-4 text-sm text-zinc-700">
                      No shifts found for this staff member.
                    </p>
                  ) : (
                    selectedStaffShiftHistory.map((shift) => (
                      <article
                        key={shift.id}
                        className="rounded-2xl bg-zinc-50 p-4 ring-1 ring-zinc-200"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h4 className="font-medium text-zinc-950">
                            {shift.title}
                          </h4>
                          <span className="rounded-full bg-zinc-200 px-3 py-1 text-xs font-medium text-zinc-700">
                            {shift.status}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-zinc-700">
                          {new Date(shift.startTime).toLocaleString()} - {new Date(shift.endTime).toLocaleString()}
                        </p>
                        <p className="mt-1 text-sm text-zinc-600">
                          Location: {shift.location}
                          {shift.department ? ` | Unit: ${shift.department}` : ""}
                        </p>
                        {shift.notes ? (
                          <p className="mt-2 text-sm text-zinc-600">{shift.notes}</p>
                        ) : null}
                      </article>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}