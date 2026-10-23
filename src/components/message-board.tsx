"use client";

import dynamic from "next/dynamic";
import { useSyncExternalStore, type ReactNode } from "react";
import { LocalWall } from "@/components/local-wall";
import { MonsterControls } from "@/components/monster-controls";
import { getOfflineNote, subscribeBoard } from "@/lib/monsters/board";

const syncUrl = process.env.NEXT_PUBLIC_TLDRAW_SYNC_URL;

const SyncedBoard = dynamic(
	() => import("@/components/synced-board").then((mod) => mod.SyncedBoard),
	{
		ssr: false,
		loading: () => <p className="message-board-status">Connecting…</p>,
	},
);

const PREVIEW_NOTE =
	"Drawings on this preview stay in this browser. The shared wall is unchanged.";
const MISSING_NOTE = "The shared wall is offline. You can still draw here.";

type WallKind = "pending" | "local" | "sync";

function isPreviewHost(hostname: string): boolean {
	return hostname.endsWith(".vercel.app") && hostname !== "sethjenks-site.vercel.app";
}

function wallKind(): WallKind {
	if (typeof window === "undefined") {
		return "pending";
	}
	if (getOfflineNote() || isPreviewHost(window.location.hostname) || !syncUrl) {
		return "local";
	}
	return "sync";
}

function wallNote(): string | null {
	if (getOfflineNote()) {
		return getOfflineNote();
	}
	if (typeof window === "undefined") {
		return null;
	}
	if (isPreviewHost(window.location.hostname)) {
		return PREVIEW_NOTE;
	}
	if (!syncUrl) {
		return MISSING_NOTE;
	}
	return null;
}

export function MessageBoard() {
	const kind = useSyncExternalStore(subscribeBoard, wallKind, wallKind);
	const note = useSyncExternalStore(subscribeBoard, wallNote, wallNote);

	let board: ReactNode = <p className="message-board-status">Connecting…</p>;
	switch (kind) {
		case "pending":
			break;
		case "local":
			board = <LocalWall />;
			break;
		case "sync":
			board = syncUrl ? <SyncedBoard uri={syncUrl} /> : <LocalWall />;
			break;
		default: {
			const unreachable: never = kind;
			board = unreachable;
		}
	}

	return (
		<div className="message-board-wrap">
			<section className="message-board" aria-label="Wall">
				{board}
			</section>
			<MonsterControls note={note} />
		</div>
	);
}
