"use client";

import { useEffect, useRef, useState } from "react";

type AccountMenuProps = {
	currentUserEmail: string;
	onSignOut: () => Promise<void> | void;
	disabled?: boolean;
};

export default function AccountMenu({
	currentUserEmail,
	onSignOut,
	disabled = false,
}: AccountMenuProps) {
	const [isOpen, setIsOpen] = useState(false);
	const menuRef = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		if (!isOpen) {
			return;
		}

		function handleDocumentPointerDown(event: MouseEvent) {
			const menuElement = menuRef.current;
			if (menuElement && !menuElement.contains(event.target as Node)) {
				setIsOpen(false);
			}
		}

		function handleDocumentKeyDown(event: KeyboardEvent) {
			if (event.key === "Escape") {
				setIsOpen(false);
			}
		}

		document.addEventListener("mousedown", handleDocumentPointerDown);
		document.addEventListener("keydown", handleDocumentKeyDown);

		return () => {
			document.removeEventListener("mousedown", handleDocumentPointerDown);
			document.removeEventListener("keydown", handleDocumentKeyDown);
		};
	}, [isOpen]);

	return (
		<div className="absolute right-4 top-4 z-90" ref={menuRef}>
			<button
				type="button"
				aria-haspopup="menu"
				aria-expanded={isOpen}
				aria-label="Account menu"
				onClick={() => setIsOpen((previous) => !previous)}
				className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-cyan-200 bg-cyan-50 text-cyan-950 transition hover:bg-cyan-100"
			>
				<span className="sr-only">Open account menu</span>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					className="h-5 w-5"
					aria-hidden="true"
				>
					<path d="M4 7h16" />
					<path d="M4 12h16" />
					<path d="M4 17h16" />
				</svg>
			</button>

			{isOpen ? (
				<div
					role="menu"
					className="absolute right-0 top-12 z-90 w-[min(18rem,calc(100vw-2rem))] rounded-2xl border border-zinc-200 bg-white p-3 text-sm text-zinc-900 shadow-xl"
				>
					<p className="truncate rounded-xl bg-zinc-100 px-3 py-2 text-xs text-zinc-700">
						Signed in as {currentUserEmail}
					</p>
					<button
						type="button"
						role="menuitem"
						onClick={() => {
							setIsOpen(false);
							void onSignOut();
						}}
						disabled={disabled}
						className="mt-2 w-full rounded-xl bg-zinc-950 px-4 py-2.5 text-left text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
					>
						Sign out
					</button>
				</div>
			) : null}
		</div>
	);
}
