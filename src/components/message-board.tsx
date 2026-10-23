"use client";

import { useState, type ReactNode } from "react";
import { useSync } from "@tldraw/sync";
import {
	Tldraw,
	type Editor,
	type TLAssetStore,
	type TLUiOverrides,
} from "tldraw";
import "tldraw/tldraw.css";

const syncUrl = process.env.NEXT_PUBLIC_TLDRAW_SYNC_URL;
const licenseKey = process.env.NEXT_PUBLIC_TLDRAW_LICENSE_KEY;

const assets: TLAssetStore = {
	async upload() {
		throw new Error("Uploads are off.");
	},
	resolve(asset) {
		return asset.props.src;
	},
};

const uiOverrides: TLUiOverrides = {
	tools(_editor, tools) {
		const next = { ...tools };
		delete next.asset;
		return next;
	},
	actions(_editor, actions) {
		const next = { ...actions };
		delete next["insert-media"];
		return next;
	},
};

function openOnText(editor: Editor) {
	editor.user.updateUserPreferences({ colorScheme: "light" });
	editor.setCurrentTool("text");
}

export function MessageBoard() {
	if (!syncUrl) {
		return <BoardStatus>The board is offline.</BoardStatus>;
	}
	return <SyncedBoard uri={syncUrl} />;
}

function SyncedBoard({ uri }: { uri: string }) {
	const [attempt, setAttempt] = useState(0);

	return (
		<SyncedAttempt
			key={attempt}
			uri={uri}
			onRetry={() => setAttempt((current) => current + 1)}
		/>
	);
}

function SyncedAttempt({ uri, onRetry }: { uri: string; onRetry: () => void }) {
	const store = useSync({ uri, assets });

	switch (store.status) {
		case "loading":
			return <BoardStatus>Connecting…</BoardStatus>;
		case "error":
			return (
				<BoardStatus
					live="assertive"
					action={
						<button type="button" onClick={onRetry}>
							Try again
						</button>
					}
				>
					The board is offline.
				</BoardStatus>
			);
		case "synced-remote":
			return (
				<section className="message-board" aria-label="Wall">
					<Tldraw
						store={store.store}
						licenseKey={licenseKey}
						overrides={uiOverrides}
						acceptedImageMimeTypes={[]}
						acceptedVideoMimeTypes={[]}
						onMount={openOnText}
					/>
				</section>
			);
		default: {
			const unreachable: never = store;
			return unreachable;
		}
	}
}

function BoardStatus({
	children,
	action,
	live = "polite",
}: {
	children: string;
	action?: ReactNode;
	live?: "polite" | "assertive";
}) {
	return (
		<section className="message-board" aria-label="Wall">
			<div className="message-board-status">
				<p role={live === "assertive" ? "alert" : "status"}>{children}</p>
				{action}
			</div>
		</section>
	);
}
