"use client";

import { useRef, useState } from "react";

export type ScheduleGridCell = {
  id: string;
  label: string;
  items: string[];
};

type AccessibleScheduleGridProps = {
  title: string;
  cells: ScheduleGridCell[];
};

export default function AccessibleScheduleGrid({
  title,
  cells,
}: AccessibleScheduleGridProps) {
  const [activeCellIndex, setActiveCellIndex] = useState(0);
  const cellRefs = useRef<Array<HTMLDivElement | null>>([]);

  function focusCell(index: number) {
    const total = cells.length;
    if (total === 0) {
      return;
    }

    const normalized = (index + total) % total;
    setActiveCellIndex(normalized);
    cellRefs.current[normalized]?.focus();
  }

  function handleCellKeyDown(
    event: React.KeyboardEvent<HTMLDivElement>,
    index: number
  ) {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      focusCell(index + 1);
      return;
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      focusCell(index - 1);
      return;
    }

    if (event.key === "Home") {
      event.preventDefault();
      focusCell(0);
      return;
    }

    if (event.key === "End") {
      event.preventDefault();
      focusCell(cells.length - 1);
    }
  }

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6">
      <h2 className="text-xl font-semibold text-zinc-950">{title}</h2>
      <p className="mt-1 text-sm text-zinc-600">
        Use left/right arrows to move across day columns.
      </p>

      <div
        role="grid"
        aria-label={title}
        aria-colcount={cells.length}
        aria-rowcount={1}
      >
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-7" role="row">
          {cells.map((cell, index) => (
            <div
              key={cell.id}
              ref={(element) => {
                cellRefs.current[index] = element;
              }}
              role="gridcell"
              aria-colindex={index + 1}
              aria-rowindex={1}
              tabIndex={activeCellIndex === index ? 0 : -1}
              onFocus={() => setActiveCellIndex(index)}
              onKeyDown={(event) => handleCellKeyDown(event, index)}
              className="min-h-44 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 outline-none focus-visible:ring-2 focus-visible:ring-zinc-950"
            >
              <p className="border-b border-zinc-200 pb-2 text-sm font-semibold text-zinc-900">
                {cell.label}
              </p>
              <div className="mt-3 space-y-2">
                {cell.items.length === 0 ? (
                  <p className="rounded-lg bg-white p-2 text-xs text-zinc-500 ring-1 ring-zinc-200">
                    No scheduled items.
                  </p>
                ) : (
                  cell.items.map((item) => (
                    <p
                      key={item}
                      className="rounded-lg bg-white p-2 text-xs text-zinc-700 ring-1 ring-zinc-200"
                    >
                      {item}
                    </p>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
