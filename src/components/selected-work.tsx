import Image from "next/image";
import Link from "next/link";
import { EmployerMark } from "@/components/employer-marks";
import type { SelectedMark, SelectedWork } from "@/lib/selected";

export function SelectedWork({ items }: { items: readonly SelectedWork[] }) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section id="work" className="work-section selected-work" aria-label="Work">
      <div className="selected-grid">
        {items.map((item) => (
          <SelectedCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}

function SelectedCard({ item }: { item: SelectedWork }) {
  const brand = brandName(item.mark);
  const body = (
    <>
      {item.src ? (
        <span className="selected-still">
          <Image
            src={item.src}
            alt={item.alt}
            fill
            priority={item.id === "chia-signer"}
            sizes={imageSizes(item.id)}
            className="selected-image"
          />
        </span>
      ) : null}
      <span className="selected-overlay">
        {brand ? (
          <span className="selected-brand">
            <SelectedBrand mark={item.mark} />
            <span>{brand}</span>
          </span>
        ) : null}
        {item.name.toLowerCase() === item.headline.toLowerCase() ||
        (brand && item.name.toLowerCase().includes(brand.toLowerCase())) ? null : (
          <span className="sr-only">{item.name}</span>
        )}
        <span className="selected-headline">{item.headline}</span>
        {item.placeholder ? (
          <span className="selected-caption">{item.caption}</span>
        ) : (
          <span className="sr-only">{item.caption}</span>
        )}
        {item.placeholder ? (
          <span className="selected-status">In progress</span>
        ) : item.href ? (
          <span className="selected-cta">{item.cta ?? "View"}</span>
        ) : null}
      </span>
    </>
  );

  if (!item.href) {
    return (
      <article className="selected-card" data-tile={item.id} data-placeholder={item.placeholder || undefined}>
        {body}
      </article>
    );
  }

  if (item.href.startsWith("/")) {
    return (
      <Link className="selected-card" data-tile={item.id} href={item.href}>
        {body}
      </Link>
    );
  }

  return (
    <a className="selected-card" data-tile={item.id} href={item.href} rel="noreferrer" target="_blank">
      {body}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}

function SelectedBrand({ mark }: { mark: SelectedMark }) {
  switch (mark) {
    case "chia":
    case "philo":
      return <EmployerMark id={mark} />;
    case "field":
      return null;
    default: {
      const exhaustive: never = mark;
      return exhaustive;
    }
  }
}

function brandName(mark: SelectedMark) {
  switch (mark) {
    case "chia":
      return "Chia";
    case "philo":
      return "Philo";
    case "field":
      return "";
    default: {
      const exhaustive: never = mark;
      return exhaustive;
    }
  }
}

function imageSizes(id: string) {
  switch (id) {
    case "chia-signer":
      return "(max-width: 799px) calc(100vw - 48px), (max-width: 1099px) 46vw, 38vw";
    default:
      return "(max-width: 799px) calc(100vw - 48px), 40vw";
  }
}
