"use client";

import { BENTO_BENCH } from "@/components/bento/catalog";

export function BentoBench() {
  return BENTO_BENCH.map((item) => (
    <section key={item.id} className="bento-bench" aria-labelledby={`${item.id}-title`}>
      <h2 id={`${item.id}-title`}>{item.name}</h2>
      <p id={`${item.id}-sentence`} className="bento-sentence">
        {item.sentence}
      </p>
      <item.Card />
    </section>
  ));
}
