"use client";

import { createContext, useContext, useState, type CSSProperties, type ReactNode } from "react";

const FILTERS = [
  { id: "product", label: "Product" },
  { id: "brand", label: "Brand" },
  { id: "play", label: "Play" },
  { id: "all", label: "All" },
] as const;

export type BoardFilter = (typeof FILTERS)[number]["id"];

type BoardFilterContextValue = {
  filter: BoardFilter;
  revision: number;
  choose: (id: BoardFilter) => void;
};

const BoardFilterContext = createContext<BoardFilterContextValue | null>(null);

export function BoardFilterProvider({ children }: { children: ReactNode }) {
  const [filter, setFilter] = useState<BoardFilter>("product");
  const [revision, setRevision] = useState(0);
  const choose = (id: BoardFilter) => {
    setFilter(id);
    setRevision((value) => value + 1);
  };

  return (
    <BoardFilterContext.Provider value={{ filter, revision, choose }}>{children}</BoardFilterContext.Provider>
  );
}

export function useBoardFilter() {
  const value = useContext(BoardFilterContext);
  if (!value) {
    throw new Error("useBoardFilter must be used within BoardFilterProvider");
  }
  return value;
}

export function BoardFilterBar({ placement }: { placement: "top" | "rail" }) {
  const { filter, choose } = useBoardFilter();
  const rail = placement === "rail";

  return (
    <div
      className={rail ? "board-rail-filters" : "board-filters"}
      role="group"
      aria-label="Filter work"
    >
      {FILTERS.map((item, index) => (
        <button
          key={item.id}
          type="button"
          className={rail ? "board-filter board-rail-filter" : "board-filter"}
          aria-pressed={filter === item.id}
          style={rail ? ({ "--i": index } as CSSProperties) : undefined}
          onClick={() => choose(item.id)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
