import type { Metadata } from "next";
import { Dashboard } from "@/components/scorecard/dashboard";
import "./scorecard.css";

export const metadata: Metadata = {
  title: "SecurityScorecard",
};

export default function SecurityScorecardPage() {
  return <Dashboard />;
}
