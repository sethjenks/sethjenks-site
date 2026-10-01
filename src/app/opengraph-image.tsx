import { renderHomeCard, ogSize } from "@/lib/og-card";

export const alt = "Seth Jenks. Designer. I design software and build it in code.";
export const size = ogSize;
export const contentType = "image/png";

export default function Image() {
  return renderHomeCard();
}
