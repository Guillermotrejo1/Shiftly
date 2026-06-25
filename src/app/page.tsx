"use client";

import { useEffect, useState } from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { seedMockFirestore } from "@/lib/seedFirestore";

export default function Home() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState(
    auth && db
      ? "Firebase Auth and Firestore are connected. Sign in to seed Firestore."
      : "Firebase setup is incomplete."
  );
  const [isSeeding, setIsSeeding] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setIsAuthLoading(false);

      if (!auth || !db) {
        setStatus("Firebase setup is incomplete.");
        return;
      }

      if (user) {
        setStatus(`Signed in as ${user.email}. You can seed Firestore now.`);
        return;
      }

      setStatus("Firebase Auth and Firestore are connected. Sign in to seed Firestore.");
    });

    return unsubscribe;
  }, []);

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
    if (!currentUser) {
      setStatus("Sign in before seeding Firestore.");
      return;
    }

    setIsSeeding(true);
    setStatus("Seeding Firestore with mock staff and shifts...");

    try {
      const result = await seedMockFirestore();
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
          Shiftly Firebase Setup
        </h1>
        <p className="mt-4 text-base leading-7 text-zinc-600">{status}</p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium text-zinc-900">
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
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
              className="mt-2 w-full rounded-2xl border border-zinc-300 px-4 py-3 text-zinc-950 outline-none transition focus:border-zinc-950"
              placeholder="At least 6 characters"
              autoComplete="current-password"
            />
          </label>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleCreateAccount}
            disabled={isSubmitting || isAuthLoading || !(auth && db)}
            className="rounded-full bg-zinc-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
          >
            {isSubmitting ? "Working..." : "Create account"}
          </button>
          <button
            type="button"
            onClick={handleSignIn}
            disabled={isSubmitting || isAuthLoading || !(auth && db)}
            className="rounded-full border border-zinc-300 px-5 py-3 text-sm font-medium text-zinc-900 transition hover:border-zinc-950 disabled:cursor-not-allowed disabled:border-zinc-200 disabled:text-zinc-400"
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
        <div className="mt-4 rounded-2xl bg-zinc-100 p-4 text-sm leading-6 text-zinc-700">
          <p>{isAuthLoading ? "Checking auth session..." : currentUser ? `Current user: ${currentUser.email}` : "No user is signed in."}</p>
        </div>
        <div className="mt-8 rounded-2xl bg-zinc-100 p-6 text-sm leading-6 text-zinc-700">
          <p>This will write:</p>
          <p>12 mock staff records into the staff collection.</p>
          <p>14 mock shifts covering one full week into the shifts collection.</p>
        </div>
        <button
          type="button"
          onClick={handleSeed}
          disabled={isSeeding || isSubmitting || !currentUser || !(auth && db)}
          className="mt-6 rounded-full bg-zinc-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
        >
          {isSeeding ? "Seeding..." : "Seed Firestore"}
        </button>
      </div>
    </main>
  );
}