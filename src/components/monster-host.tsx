"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const MonsterStage = dynamic(
  () => import("@/components/monster-stage").then((mod) => mod.MonsterStage),
  { ssr: false },
);

export function MonsterHost() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const wake = () => {
      setReady(true);
    };
    window.addEventListener("monster:summon", wake);
    return () => {
      window.removeEventListener("monster:summon", wake);
    };
  }, []);

  if (!ready) {
    return null;
  }

  return <MonsterStage />;
}
