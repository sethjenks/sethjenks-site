import { HomeBoard } from "@/components/home-board";
import { INTRO } from "@/lib/intro";
import { getHomeBoard } from "@/lib/home";

export default async function Home() {
  const board = await getHomeBoard();

  return (
    <HomeBoard
      board={board}
      name={INTRO.name}
      headline="Design leader who builds."
      bio={INTRO.paragraphs[0] ?? ""}
    />
  );
}
