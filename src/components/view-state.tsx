"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

type AppErrorBoundaryProps = {
  children: ReactNode;
  title: string;
  description: string;
};

type AppErrorBoundaryState = {
  hasError: boolean;
  error: Error | null;
};

export class AppErrorBoundary extends Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  override state: AppErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("AppErrorBoundary caught an error", error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  override render() {
    if (this.state.hasError) {
      return (
        <main className="flex min-h-screen items-center justify-center bg-zinc-50 p-8">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-8 shadow-sm ring-1 ring-zinc-200">
            <h1 className="text-3xl font-semibold text-zinc-950">
              {this.props.title}
            </h1>
            <p className="mt-4 text-base leading-7 text-zinc-600">
              {this.props.description}
            </p>
            {this.state.error ? (
              <p className="mt-4 rounded-2xl bg-rose-50 p-4 text-sm leading-6 text-rose-800 ring-1 ring-rose-200">
                {this.state.error.message}
              </p>
            ) : null}
            <button
              type="button"
              onClick={this.handleRetry}
              className="mt-6 rounded-full bg-zinc-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-zinc-800"
            >
              Try again
            </button>
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}

function SkeletonBlock({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-2xl bg-zinc-100 ${className}`}
    />
  );
}

function SkeletonLine({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-full bg-zinc-200 ${className}`}
    />
  );
}

export function CoordinatorLoadingSkeleton() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 p-8">
      <div className="w-full max-w-2xl rounded-3xl bg-white p-8 shadow-sm ring-1 ring-zinc-200">
        <SkeletonLine className="h-9 w-56" />
        <SkeletonLine className="mt-4 h-5 w-full max-w-xl" />

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <SkeletonBlock className="h-20 w-full" />
          <SkeletonBlock className="h-20 w-full" />
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <SkeletonBlock className="h-12 w-32 rounded-full" />
          <SkeletonBlock className="h-12 w-28 rounded-full" />
        </div>

        <SkeletonBlock className="mt-4 h-16 w-full" />
        <SkeletonBlock className="mt-8 h-24 w-full" />
      </div>
    </main>
  );
}

export function HomeLoadingSkeleton() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 p-8">
      <div className="w-full max-w-7xl rounded-3xl bg-white p-8 shadow-sm ring-1 ring-zinc-200">
        <SkeletonLine className="h-9 w-40" />
        <SkeletonLine className="mt-4 h-5 w-full max-w-2xl" />

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <SkeletonBlock className="h-20 w-full" />
          <SkeletonBlock className="h-20 w-full" />
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <SkeletonBlock className="h-12 w-36 rounded-full" />
          <SkeletonBlock className="h-12 w-28 rounded-full" />
          <SkeletonBlock className="h-12 w-28 rounded-full" />
        </div>

        <SkeletonBlock className="mt-4 h-16 w-full" />
        <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <SkeletonBlock className="h-128 w-full" />
          <div className="space-y-4">
            <SkeletonBlock className="h-48 w-full" />
            <SkeletonBlock className="h-64 w-full" />
            <SkeletonBlock className="h-56 w-full" />
          </div>
        </div>
      </div>
    </main>
  );
}

export function GapAlertsSkeleton() {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-2">
          <SkeletonLine className="h-6 w-48" />
          <SkeletonLine className="h-4 w-64" />
        </div>
        <div className="flex items-center gap-2">
          <SkeletonBlock className="h-6 w-24 rounded-full" />
          <SkeletonBlock className="h-6 w-16 rounded-full" />
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <article
            key={index}
            className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <SkeletonLine className="h-5 w-40" />
              <div className="flex items-center gap-1.5">
                <SkeletonBlock className="h-6 w-16 rounded-full" />
                <SkeletonBlock className="h-6 w-14 rounded-full" />
              </div>
            </div>
            <SkeletonLine className="mt-3 h-4 w-56" />
            <SkeletonLine className="mt-2 h-4 w-44" />
            <SkeletonBlock className="mt-3 h-10 w-full" />
            <SkeletonLine className="mt-3 h-3 w-40" />
          </article>
        ))}
      </div>
    </section>
  );
}

export function StaffDirectorySkeleton() {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-2">
          <SkeletonLine className="h-6 w-44" />
          <SkeletonLine className="h-4 w-56" />
        </div>
        <SkeletonBlock className="h-10 w-28 rounded-full" />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <SkeletonBlock className="h-20 w-full" />
        <SkeletonBlock className="h-20 w-full" />
      </div>

      <div className="mt-6 space-y-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <article
            key={index}
            className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <SkeletonLine className="h-5 w-40" />
              <SkeletonBlock className="h-6 w-24 rounded-full" />
            </div>
            <SkeletonLine className="mt-3 h-4 w-52" />
            <SkeletonLine className="mt-2 h-4 w-60" />
            <SkeletonBlock className="mt-4 h-9 w-24 rounded-full" />
          </article>
        ))}
      </div>
    </section>
  );
}