import { CONTACTS } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        {CONTACTS.map((contact) => (
          <a key={contact.href} href={contact.href} rel="noreferrer" target="_blank">
            {contact.label}
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        ))}
      </div>
    </footer>
  );
}
