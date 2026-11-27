import { profileLinks, type ProfileLink } from "@/lib/site";

export function ProfileLinks() {
  const links = profileLinks();
  if (links.length === 0) {
    return null;
  }

  return (
    <nav className="board-links" aria-label="Contact">
      <ul>
        {links.map((link) => (
          <li key={link.href}>
            <ProfileAnchor link={link} />
          </li>
        ))}
      </ul>
    </nav>
  );
}

function ProfileAnchor({ link }: { link: ProfileLink }) {
  const external = /^https?:\/\//.test(link.href);

  return (
    <a
      className="board-link"
      href={link.href}
      {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
    >
      <span className="board-link-icon" aria-hidden="true">
        <LinkMark id={link.id} />
      </span>
      <span className="board-link-label">{link.label}</span>
      {external ? <span className="sr-only"> (opens in a new tab)</span> : null}
    </a>
  );
}

function LinkMark({ id }: { id: ProfileLink["id"] }) {
  switch (id) {
    case "email":
      return (
        <svg viewBox="0 0 16 16">
          <path
            fill="currentColor"
            d="M2 3.5h12v9H2v-9Zm1.2 1.2v.4l4.8 3.1 4.8-3.1v-.4H3.2Zm9.6 1.5-4.3 2.8a.9.9 0 0 1-1 0L3.2 6.2V11.3h9.6V6.2Z"
          />
        </svg>
      );
    case "linkedin":
      return (
        <svg viewBox="0 0 16 16">
          <path
            fill="currentColor"
            d="M3.7 2.2a1.45 1.45 0 1 1 0 2.9 1.45 1.45 0 0 1 0-2.9ZM2.4 6.1h2.6V14H2.4V6.1Zm4.1 0h2.5v1.08h.04c.35-.66 1.2-1.36 2.48-1.36 2.65 0 3.14 1.74 3.14 4.01V14h-2.6V10.1c0-1.05-.02-2.4-1.46-2.4-1.46 0-1.68 1.14-1.68 2.32V14H6.5V6.1Z"
          />
        </svg>
      );
    case "x":
      return (
        <svg viewBox="0 0 16 16">
          <path
            fill="currentColor"
            d="M9.05 7.18 13.72 2h-1.1L8.56 6.41 5.48 2H2l4.9 7.13L2 14h1.1l4.28-4.66L10.52 14H14L9.05 7.18Zm-1.52 1.76-.5-.71L3.64 2.78h1.7l3.18 4.55.5.71 4.13 5.91h-1.7L7.53 8.94Z"
          />
        </svg>
      );
    case "resume":
      return (
        <svg viewBox="0 0 16 16">
          <path
            fill="currentColor"
            d="M4 1.5h5.2L13 5.3V14a.5.5 0 0 1-.5.5h-8A.5.5 0 0 1 4 14V1.5Zm5 1.1v2.9H12L9 2.6ZM5.6 8h4.8v1H5.6V8Zm0 2.2h4.8v1H5.6v-1Z"
          />
        </svg>
      );
    default: {
      const unreachable: never = id;
      return unreachable;
    }
  }
}
