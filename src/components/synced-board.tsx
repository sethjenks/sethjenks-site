"use client";

import { useEffect } from "react";
import { useSync } from "@tldraw/sync";
import {
	Tldraw,
	type Editor,
	type TLAssetStore,
	type TLUiComponents,
} from "tldraw";
import { DefaultColorStyle, DefaultSizeStyle } from "@tldraw/tlschema";
import {
	getBoardMode,
	notifyBoard,
	publishBoard,
	reportOffline,
	subscribeBoard,
} from "@/lib/monsters/board";
import type { BoardSelection } from "@/lib/monsters/board";
import { publishEditor } from "@/lib/monsters/editor-bridge";
import { extractDrawing } from "@/lib/monsters/extract";
import "tldraw/tldraw.css";

const OFFLINE = "The shared wall did not connect. You can still draw here.";
const EMPTY: BoardSelection = { draws: 0, other: 0, total: 0 };

const assets: TLAssetStore = {
	async upload() {
		throw new Error("Uploads are off.");
	},
	resolve(asset) {
		return asset.props.src;
	},
};

const hiddenUi: TLUiComponents = {
	Toolbar: null,
	StylePanel: null,
	MainMenu: null,
	PageMenu: null,
	NavigationPanel: null,
	MenuPanel: null,
	TopPanel: null,
	SharePanel: null,
	HelpMenu: null,
	ZoomMenu: null,
	ActionsMenu: null,
	HelperButtons: null,
	DebugMenu: null,
	DebugPanel: null,
	Minimap: null,
	KeyboardShortcutsDialog: null,
	QuickActions: null,
	ContextMenu: null,
	RichTextToolbar: null,
	ImageToolbar: null,
	VideoToolbar: null,
	CursorChatBubble: null,
};

const sessionInks = new WeakMap<Editor, Set<string>>();

function addedDrawId(record: unknown): string | null {
	if (!record || typeof record !== "object") {
		return null;
	}
	const shape = record as { typeName?: string; type?: string; id?: string };
	if (shape.typeName === "shape" && shape.type === "draw" && typeof shape.id === "string") {
		return shape.id;
	}
	return null;
}

function lockPen(editor: Editor) {
	const want = getBoardMode() === "select" ? "select" : "draw";
	if (editor.getCurrentToolId() !== want) {
		editor.setCurrentTool(want);
	}
	if (editor.getStyleForNextShape(DefaultColorStyle) !== "black") {
		editor.setStyleForNextShapes(DefaultColorStyle, "black");
	}
	if (editor.getStyleForNextShape(DefaultSizeStyle) !== "m") {
		editor.setStyleForNextShapes(DefaultSizeStyle, "m");
	}
}

function selectionFor(editor: Editor, born: Set<string>): BoardSelection {
	let draws = 0;
	let other = 0;
	for (const id of editor.getSelectedShapeIds()) {
		const shape = editor.getShape(id);
		if (!shape) {
			continue;
		}
		if (shape.type === "draw") {
			draws += 1;
		} else {
			other += 1;
		}
	}
	let total = 0;
	for (const id of born) {
		if (editor.getShape(id as Parameters<Editor["getShape"]>[0])?.type === "draw") {
			total += 1;
		}
	}
	return { draws, other, total };
}

function openOnPen(editor: Editor) {
	const born = new Set<string>();
	let cache: BoardSelection = EMPTY;
	sessionInks.set(editor, born);
	editor.user.updateUserPreferences({ colorScheme: "light" });
	editor.setCurrentTool("draw");
	editor.setStyleForNextShapes(DefaultColorStyle, "black");
	editor.setStyleForNextShapes(DefaultSizeStyle, "m");
	publishEditor(editor);

	const readSelection = () => {
		const next = selectionFor(editor, born);
		if (
			cache.draws === next.draws &&
			cache.other === next.other &&
			cache.total === next.total
		) {
			return cache;
		}
		cache = next;
		return cache;
	};

	const extract = () => {
		const selection = readSelection();
		if (selection.other > 0 && selection.draws === 0) {
			return null;
		}
		const ids =
			selection.draws > 0
				? editor.getSelectedShapeIds()
				: [...born].filter(
						(id) => editor.getShape(id as Parameters<Editor["getShape"]>[0])?.type === "draw",
					);
		return extractDrawing(editor, ids);
	};

	publishBoard({
		getSelection: readSelection,
		extract,
	});

	let locking = false;
	const unlisten = editor.store.listen((entry) => {
		if (entry.source === "user") {
			for (const record of Object.values(entry.changes.added)) {
				const id = addedDrawId(record);
				if (id) {
					born.add(id);
				}
			}
		}
		if (locking) {
			return;
		}
		locking = true;
		lockPen(editor);
		locking = false;
		notifyBoard();
	});

	const unboard = subscribeBoard(() => {
		lockPen(editor);
	});

	return () => {
		unlisten();
		unboard();
		sessionInks.delete(editor);
		publishEditor(null);
		publishBoard(null);
	};
}

export function SyncedBoard({ uri }: { uri: string }) {
	const store = useSync({ uri, assets });

	useEffect(() => {
		if (store.status === "error") {
			reportOffline(OFFLINE);
		}
	}, [store.status]);

	useEffect(() => {
		if (store.status !== "loading") {
			return;
		}
		const timer = window.setTimeout(() => {
			reportOffline(OFFLINE);
		}, 8000);
		return () => window.clearTimeout(timer);
	}, [store.status]);

	switch (store.status) {
		case "loading":
		case "error":
			return <p className="message-board-status">Connecting…</p>;
		case "synced-remote":
			return (
				<Tldraw
					store={store.store}
					licenseKey={process.env.NEXT_PUBLIC_TLDRAW_LICENSE_KEY}
					hideUi
					initialState="draw"
					components={hiddenUi}
					acceptedImageMimeTypes={[]}
					acceptedVideoMimeTypes={[]}
					onMount={openOnPen}
				/>
			);
		default: {
			const unreachable: never = store;
			return unreachable;
		}
	}
}
