import type { Metadata } from "next";

import { CardExpand } from "@/components/card-expand";
import "./card-expand.css";

export const metadata: Metadata = {
  title: "Card",
};

export default function CardExpandPage() {
  return <CardExpand />;
}
