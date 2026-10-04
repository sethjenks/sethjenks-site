import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { INTRO } from "@/lib/intro";
import type { WorkItem } from "@/lib/work";

export const ogSize = { width: 1200, height: 630 };

export function renderHomeCard() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#fafafa",
          color: "#111111",
          padding: "72px",
        }}
      >
        <div style={{ display: "flex", fontSize: 72, fontWeight: 500, letterSpacing: "-0.03em" }}>
          Seth Jenks
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 32,
            lineHeight: 1.4,
            color: "#595959",
            maxWidth: "760px",
          }}
        >
          {INTRO.role}
        </div>
      </div>
    ),
    { ...ogSize },
  );
}

export async function renderWorkCard(item: WorkItem) {
  const file = await readFile(path.join(process.cwd(), "public", item.src));
  const data = `data:image/jpeg;base64,${file.toString("base64")}`;
  const scale = Math.min(480 / item.width, 500 / item.height, 1);
  const width = Math.round(item.width * scale);
  const height = Math.round(item.height * scale);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "#fafafa",
          color: "#111111",
          padding: "64px",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            height: "100%",
            width: "560px",
          }}
        >
          <div style={{ display: "flex", fontSize: 22, color: "#6b6b6b" }}>Seth Jenks</div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 64, fontWeight: 500, letterSpacing: "-0.03em", lineHeight: 1 }}>
              {item.title}
            </div>
            <div style={{ display: "flex", marginTop: 24, fontSize: 24, color: "#595959" }}>
              {item.year} · {item.role}
            </div>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "520px",
            height: "500px",
            border: "1px solid #e6e6e6",
            borderRadius: "16px",
            background: "#ffffff",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={data} width={width} height={height} alt="" />
        </div>
      </div>
    ),
    { ...ogSize },
  );
}
