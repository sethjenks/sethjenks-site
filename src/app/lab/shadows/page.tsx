import type { Metadata } from "next";

import { ShadowLab } from "@/components/shadow-lab";
import "./shadow-lab.css";

export const metadata: Metadata = {
  title: "Shadows",
};

export default function ShadowsPage() {
  return <ShadowLab />;
}
