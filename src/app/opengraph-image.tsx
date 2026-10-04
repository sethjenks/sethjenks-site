import { renderHomeCard, ogSize } from "@/lib/og-card";
import { INTRO } from "@/lib/intro";

export const alt = `Seth Jenks. ${INTRO.role}`;
export const size = ogSize;
export const contentType = "image/png";

export default function Image() {
  return renderHomeCard();
}
