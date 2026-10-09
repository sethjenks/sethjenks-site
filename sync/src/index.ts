import {
	DurableObjectSqliteSyncWrapper,
	type SessionStateSnapshot,
	SQLiteSyncStorage,
	TLSocketRoom,
} from "@tldraw/sync-core";
import { createTLSchema, defaultShapeSchemas, type TLRecord } from "@tldraw/tlschema";
import { DurableObject } from "cloudflare:workers";

const WALL_ROOM_ID = "sethjenks-wall";

const schema = createTLSchema({
	shapes: { ...defaultShapeSchemas },
});

interface Env {
	TLDRAW_DURABLE_OBJECT: DurableObjectNamespace<TldrawDurableObject>;
	WIPE_SECRET?: string;
}

interface SocketAttachment {
	sessionId: string;
	snapshot: SessionStateSnapshot | null;
}

function getAttachment(ws: WebSocket): SocketAttachment | null {
	const attachment = ws.deserializeAttachment() as SocketAttachment | null;
	return attachment?.sessionId ? attachment : null;
}

function isWipeAuthorized(request: Request, secret: string | undefined): boolean {
	if (!secret) return false;
	return request.headers.get("authorization") === `Bearer ${secret}`;
}

export class TldrawDurableObject extends DurableObject<Env> {
	private room: TLSocketRoom<TLRecord, void> | null = null;
	private readonly sessionIdToWs = new Map<string, WebSocket>();
	private wiping = false;

	constructor(ctx: DurableObjectState, env: Env) {
		super(ctx, env);
		this.ctx.setWebSocketAutoResponse(
			new WebSocketRequestResponsePair('{"type":"ping"}', '{"type":"pong"}'),
		);
	}

	private getOrCreateRoom(): TLSocketRoom<TLRecord, void> {
		if (this.room) return this.room;

		const sql = new DurableObjectSqliteSyncWrapper(this.ctx.storage);
		const storage = new SQLiteSyncStorage<TLRecord>({ sql });
		const room = new TLSocketRoom<TLRecord, void>({
			schema,
			storage,
			clientTimeout: Infinity,
			onSessionSnapshot: (sessionId, snapshot) => {
				const ws = this.sessionIdToWs.get(sessionId);
				if (ws) ws.serializeAttachment({ sessionId, snapshot });
			},
		});

		for (const ws of this.ctx.getWebSockets()) {
			const attachment = getAttachment(ws);
			if (!attachment?.snapshot) continue;
			room.handleSocketResume({
				sessionId: attachment.sessionId,
				socket: ws,
				snapshot: attachment.snapshot,
			});
		}

		this.room = room;
		return room;
	}

	override fetch(request: Request): Response | Promise<Response> {
		const url = new URL(request.url);
		if (request.method === "POST" && url.pathname === "/api/wipe") {
			return this.wipe(request);
		}
		if (request.method === "GET" && url.pathname.startsWith("/api/connect/")) {
			return this.handleConnect(request);
		}
		return new Response("Not found", { status: 404 });
	}

	private handleConnect(request: Request): Response {
		const sessionId = new URL(request.url).searchParams.get("sessionId");
		if (!sessionId) return new Response("Missing sessionId", { status: 400 });

		const pair = new WebSocketPair();
		const clientWebSocket = pair[0];
		const serverWebSocket = pair[1];
		this.ctx.acceptWebSocket(serverWebSocket);

		const attachment: SocketAttachment = { sessionId, snapshot: null };
		serverWebSocket.serializeAttachment(attachment);
		this.getOrCreateRoom().handleSocketConnect({ sessionId, socket: serverWebSocket });

		return new Response(null, { status: 101, webSocket: clientWebSocket });
	}

	private async wipe(request: Request): Promise<Response> {
		if (!isWipeAuthorized(request, this.env.WIPE_SECRET)) {
			return new Response("Unauthorized", { status: 401 });
		}

		this.wiping = true;
		this.room = null;
		this.sessionIdToWs.clear();
		for (const ws of this.ctx.getWebSockets()) {
			try {
				ws.close(4000, "reset");
			} catch {
				// The socket may already be gone.
			}
		}
		await this.ctx.storage.deleteAll();
		this.wiping = false;
		return new Response("ok");
	}

	override async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
		if (this.wiping) return;
		const attachment = getAttachment(ws);
		if (!attachment) return;

		this.sessionIdToWs.set(attachment.sessionId, ws);
		this.getOrCreateRoom().handleSocketMessage(attachment.sessionId, message);
	}

	override async webSocketClose(ws: WebSocket): Promise<void> {
		this.endSocket(ws, "handleSocketClose");
	}

	override async webSocketError(ws: WebSocket): Promise<void> {
		this.endSocket(ws, "handleSocketError");
	}

	private endSocket(ws: WebSocket, method: "handleSocketClose" | "handleSocketError"): void {
		if (this.wiping) return;
		const attachment = getAttachment(ws);
		if (!attachment) return;

		this.sessionIdToWs.delete(attachment.sessionId);
		const room = this.getOrCreateRoom();
		if (attachment.snapshot && !room.getSessionSnapshot(attachment.sessionId)) {
			room.handleSocketResume({
				sessionId: attachment.sessionId,
				socket: ws,
				snapshot: attachment.snapshot,
			});
		}
		room[method](attachment.sessionId);
	}
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);

		if (request.method === "POST" && url.pathname === "/api/wipe") {
			if (!isWipeAuthorized(request, env.WIPE_SECRET)) {
				return new Response("Unauthorized", { status: 401 });
			}
			const id = env.TLDRAW_DURABLE_OBJECT.idFromName(WALL_ROOM_ID);
			return env.TLDRAW_DURABLE_OBJECT.get(id).fetch(request);
		}

		const roomMatch = url.pathname.match(/^\/api\/connect\/([^/]+)$/);
		if (request.method === "GET" && roomMatch?.[1]) {
			const id = env.TLDRAW_DURABLE_OBJECT.idFromName(roomMatch[1]);
			return env.TLDRAW_DURABLE_OBJECT.get(id).fetch(request);
		}

		return new Response("Not found", { status: 404 });
	},
};
