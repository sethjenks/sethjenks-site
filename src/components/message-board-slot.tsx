"use client";

import dynamic from "next/dynamic";
import { promptForDate } from "@/lib/drawing-prompts";

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

const PHRASE_COUNT = 24;

function CreateStrip() {
	const phrase = promptForDate();

	return (
		<div className="create-strip" aria-label={phrase}>
			<div className="create-strip-track" aria-hidden="true">
				{Array.from({ length: PHRASE_COUNT }, (_, index) => (
					<span key={index}>{phrase}</span>
				))}
			</div>
		</div>
	);
}

export function MessageBoardSlot() {
	return (
		<div className="message-board-slot">
			<CreateStrip />
			<MessageBoard />
		</div>
	);
}
