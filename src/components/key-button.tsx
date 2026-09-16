type KeyButtonProps = {
  href: string;
  children: string;
};

export function KeyButton({ href, children }: KeyButtonProps) {
  return (
    <a href={href} className="key-button">
      <span className="key-button-face">
        <span className="key-button-well" aria-hidden="true" />
        <span className="key-button-label">{children}</span>
      </span>
    </a>
  );
}
