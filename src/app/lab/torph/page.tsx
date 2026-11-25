import type { Metadata } from "next";

import { TorphLab } from "@/components/torph-lab";
import "./torph-lab.css";

export const metadata: Metadata = {
  title: "Torph",
};

export default function TorphLabPage() {
  return <TorphLab />;
}
