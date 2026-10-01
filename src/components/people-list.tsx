import type { PersonItem } from "@/lib/people";

export function PeopleList({
  items,
  heading = "Worked with",
}: {
  items: PersonItem[];
  heading?: string;
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section className="people-list" aria-labelledby="people-heading">
      <h2 id="people-heading" className="work-section-title">
        {heading}
      </h2>
      <ul>
        {items.map((item) => (
          <li key={item.id}>
            <p className="people-row">{item.name}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
