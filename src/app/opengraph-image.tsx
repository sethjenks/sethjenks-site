import { renderHomeCard, ogSize } from "@/lib/og-card";
import { ROLE_LINE } from "@/lib/site";

export const alt = `Seth Jenks. ${ROLE_LINE}`;
export const size = ogSize;
export const contentType = "image/png";

export default function Image() {
  return renderHomeCard();
}
