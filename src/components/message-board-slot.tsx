"use client";

import dynamic from "next/dynamic";

const MessageBoard = dynamic(
	() => import("@/components/message-board").then((mod) => mod.MessageBoard),
	{
		ssr: false,
		loading: () => (
			<section className="message-board" aria-label="Wall">
				<p className="message-board-status">Connecting…</p>
			</section>
		),
	},
);

export function MessageBoardSlot() {
	return <MessageBoard />;
}
